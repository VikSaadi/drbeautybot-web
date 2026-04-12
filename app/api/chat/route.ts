// app/api/chat/route.ts

/*
  CHANGELOG — 2026-04-05 v2.2
  - closingSuffix = '' siempre. El disclaimer se muestra en la UI del chat
    (header + primer mensaje del bot), no en cada respuesta del API.
    Elimina la leyenda repetida al final de cada respuesta.
*/

/*
  CHANGELOG — 2025-12-13
  - Se agregó "intención de definición" para que CAPA DEFINICIONES responda también a mensajes tipo:
    "ptosis", "ptosis?", "hialuronidasa", "biofilm", "vision borrosa", "acido hialuronico" (corto).
  - ✅ Opción 1 (mínimo cambio, conservador): permitir 2 tokens aunque no haya "?" SOLO si el mensaje es corto.
  - Triage guard: "definición pura" ahora reconoce intención de definición (no solo "qué es").
  - QualityEvent: evita contar danger_signal cuando el mensaje era intención de definición.
*/

/*
  CHANGELOG — 2025-12-15
  - ✅ Fix Firestore counts (robusto).
  - ✅ Router (mínimo y seguro).
  - ✅ Integración OpenAI (SDK oficial).
  - ✅ Multi-material.
  - ✅ Fix buildContextPack.
  - ✅ Micro-refactor.
*/

/*
  CHANGELOG — 2025-12-17
  - ✅ Cerco temático (solo medicina estética).
  - ✅ isSmallTalk refinado.
*/

/*
  CHANGELOG — 2025-12-22
  - ✅ buildIntro simplificado.
  - ✅ domainHint por sesión.
  - ✅ Cerco temático contextual.
  - ✅ isSmallTalk acepta sessionDomain.
*/

/*
  CHANGELOG — 2026-03-30 v2.1
  - ✅ StoredProfile ampliado: botoxZones, fillerMaterials, fillerZones,
    healthConditions, healthOther, procedureDates.
  - ✅ buildContextPack enriquecido.
*/

import { NextRequest } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import OpenAI from 'openai';

import { findHighestSeverityComplication } from '@/lib/rules/complications';
import { findEmergencyNumber } from '@/lib/rules/emergencies';
import { findMaterialsInMessage } from '@/lib/rules/materials';

import { adminDb, serverTimestamp, adminProjectId } from '@/lib/firebaseAdmin';

import { normalizeText, tokenizeNormalized, matchKeywordNormalized } from '@/lib/rules/text';
import { findDefinitionInMessage } from '@/lib/rules/definitions';

export const runtime = 'nodejs';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const BRAIN_MODEL = process.env.DRBEAUTYBOT_MODEL ?? 'gpt-5';

// ── TIPOS ─────────────────────────────────────────────────────

interface StoredProfile {
  name?: string;
  ageRange?: string;
  country?: string;
  area?: string;
  interests?: string[];
  previousProcedures?: string[];
  botoxZones?: string[];
  fillerMaterials?: string[];
  fillerZones?: string[];
  healthConditions?: string[];
  healthOther?: string;
  isPregnant?: boolean;
  procedureDates?: Record<string, { month: string; year: string }>;
}

interface HistoryMessage {
  role: 'user' | 'assistant';
  text: string;
}

interface ChatRequestBody {
  message: string;
  history?: HistoryMessage[];
  uid?: string | null;
  mode?: string | null;
  profile?: StoredProfile | null;
  sessionId?: string | null;
}

type SessionDomain = 'unknown' | 'esthetic' | 'offtopic';

const areaLabels: Record<string, string> = {
  'rostro-general': 'rostro en general',
  toxina: 'toxina botulínica',
  rellenos: 'fillers / rellenos',
  labios: 'labios',
  laser: 'láser / manchas / depilación',
  'cicatrices-acne': 'cicatrices de acné',
  otros: 'otros tratamientos estéticos',
};

// ── KEYWORDS DOMINIO ──────────────────────────────────────────

const ESTHETIC_KEYWORDS = [
  'medicina estetica','estetica','estetico','esteticos','clinica estetica',
  'clinica de belleza','relleno','rellenos','acido hialuronico','hialuronico',
  'hialuronato','botox','toxina','toxina botulinica','labios','labio',
  'codigo de barras','surco nasogeniano','patas de gallo','frente','entrecejo',
  'ojeras','ojera','manchas','melasma','acne','cicatriz','cicatrices','poros',
  'flacidez','papada','perfilado','rinomodelacion','nariz','menton',
  'pómulo','pomulo','biopolimeros','biopolimero','aceite mineral','silicona',
  'hidroxiapatita','caha','radiesse','laser','ipl','luz pulsada',
  'depilacion laser','depilacion','peeling','hifu','radiofrecuencia',
  'mesoterapia','carboxiterapia','hilos tensores','hilos',
];

const OFFTOPIC_KEYWORDS = [
  'contrato','arrendamiento','renta','alquiler','hipoteca','prestamo',
  'pagare','pagaré','factura','notario','juicio','demanda','divorcio','custodia',
  'impuesto','impuestos','sat','hacienda','deuda','tarjeta de credito',
  'credito','credito hipotecario','banco','inversion','criptomoneda','bitcoin','cripto',
  'javascript','python','java ','typescript','react','nextjs','nodejs','firebase',
  'programacion','programación','codigo','código','frontend','backend',
  'base de datos','sql','api ','servidor',
  'tarea','examen','resumen','ensayo','monografia','monografía',
  'marketing','seo','facebook ads','google ads','tiktok ads',
  'campaña publicitaria','publicidad','anuncio',
];

// ── v2.2: El disclaimer ya no se incluye en las respuestas del API.
// Se muestra en la UI: header del chat (con botón X) y primer mensaje del bot.
const CLOSING = '';

// ── HELPERS ───────────────────────────────────────────────────

function buildIntro(_mode: string | null | undefined, _profile?: StoredProfile | null): string {
  return '';
}

type MaterialContext = 'considering' | 'already' | 'unknown';
type MaterialsFound = ReturnType<typeof findMaterialsInMessage>;
type MaterialHit = MaterialsFound[number];

function pickHighRiskMaterial(materialsFound: MaterialsFound): MaterialHit | null {
  return materialsFound.find((m) => Boolean(m.listaNegra) || m.nivelRiesgo >= 4) ?? null;
}

function inferMaterialContext(message: string): MaterialContext {
  const text = normalizeText(message);
  const alreadyKeywords = [
    'me puse','me lo puse','me inyectaron','me inyecte','me aplique','me aplicaron',
    'ya me puse','ya me lo puse','ya me inyectaron','ya me aplicaron',
    'tengo','traigo','desde hace','hace','me hicieron','me pusieron','me lo pusieron',
  ];
  const consideringKeywords = [
    'quiero','me quiero','pienso','estoy pensando','me ofrecen','me ofrecieron',
    'me recomendaron','me recomiendan','me sugirieron','me sugieren',
    'me lo voy a poner','me lo pondre','me lo pondria','me lo pongo','cotice','cotizar',
  ];
  if (alreadyKeywords.some((k) => text.includes(k))) return 'already';
  if (consideringKeywords.some((k) => text.includes(k))) return 'considering';
  return 'unknown';
}

function detectDangerSignals(message: string): string[] {
  const textNorm = normalizeText(message);
  const textTokens = tokenizeNormalized(textNorm);

  type Rule = { label: string; priority: number; keywords: string[] };
  const rules: Rule[] = [
    { label: 'alteraciones visuales', priority: 100,
      keywords: ['vision borrosa','vista borrosa','veo borroso','veo borrosa','no veo',
        'perdi vision','perdida de vision','ceguera','se me nubla la vision','se me nubla','borroso','borrosa'] },
    { label: 'dificultad para respirar o dolor/opresión en el pecho', priority: 95,
      keywords: ['dificultad para respirar','falta de aire','me ahogo','opresion en el pecho',
        'dolor en el pecho','pecho apretado'] },
    { label: 'cambios de color en la piel (palidez/morado/negro)', priority: 90,
      keywords: ['palido','palida','morado','violaceo','negro','cambio de color'] },
    { label: 'piel fría o entumecimiento', priority: 85,
      keywords: ['piel fria','entumecimiento','hormigueo','adormecimiento'] },
    { label: 'dolor intenso', priority: 80,
      keywords: ['dolor intenso','dolor fuerte','dolor insoportable'] },
    { label: 'ampollas o necrosis', priority: 78,
      keywords: ['ampolla','ampollas','necrosis'] },
    { label: 'fiebre o datos de infección (secreción/pus)', priority: 75,
      keywords: ['fiebre','pus','secrecion'] },
    { label: 'inflamación que progresa rápido', priority: 70,
      keywords: ['inflamacion rapida','empeora rapido','hinchazon rapida','aumento rapido'] },
    { label: 'mareo o desmayo', priority: 60,
      keywords: ['mareo','desmayo'] },
  ];

  const hits: Array<{ label: string; priority: number }> = [];
  for (const rule of rules) {
    const matched = rule.keywords.some((kw) => matchKeywordNormalized(textNorm, textTokens, kw));
    if (matched) hits.push({ label: rule.label, priority: rule.priority });
  }

  const unique = new Map<string, number>();
  for (const h of hits) {
    const prev = unique.get(h.label);
    if (prev == null || h.priority > prev) unique.set(h.label, h.priority);
  }

  return Array.from(unique.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([label]) => label);
}

function inferProcedureContext(message: string): {
  likelyPostProcedure: boolean;
  hasInjectionVerb: boolean;
  hasEnergyDeviceHint: boolean;
} {
  const t = normalizeText(message);
  const injectionVerbs = [
    'me inyectaron','me inyecte','me aplicaron','me aplique','me pusieron',
    'me puse','me lo pusieron','me lo aplicaron','me realizaron','me hice',
  ];
  const energyHints = ['laser','ipl','luz pulsada','radiofrecuencia','hifu'];
  const hasInjectionVerb = injectionVerbs.some((k) => t.includes(k));
  const hasEnergyDeviceHint = energyHints.some((k) => t.includes(k));
  return { likelyPostProcedure: hasInjectionVerb || hasEnergyDeviceHint, hasInjectionVerb, hasEnergyDeviceHint };
}

function isSmallTalk(message: string, opts?: { sessionDomain?: SessionDomain }): boolean {
  const t = normalizeText(message);
  const sessionDomain: SessionDomain = opts?.sessionDomain ?? 'unknown';
  const greetingRegex = /^(hola|holi|buenas|buenos dias|buenas tardes|buenas noches)\b/;
  const hasGreeting = greetingRegex.test(t);
  const otherChatterPatterns: RegExp[] = [
    /\b(como estas|que tal|todo bien|todo bn|todo ok)\b/,
    /\b(gracias|muchas gracias)\b/,
  ];
  const importantKeywords = [
    'botox','toxina','acido','hialuron','biopol','silicona','relleno',
    'hidroxiapatita','caha','radiesse','laser','ipl','luz pulsada','peeling',
    'hifu','radiofrecuencia','dolor','vision','visión','fiebre',
  ];
  const hasImportantKeyword = importantKeywords.some((kw) => t.includes(kw));
  const hasOffTopicKeyword = OFFTOPIC_KEYWORDS.some((kw) => t.includes(kw));
  if (hasGreeting && (hasImportantKeyword || hasOffTopicKeyword)) return false;
  const looksLikeChitChat = hasGreeting || otherChatterPatterns.some((r) => r.test(t));
  if (looksLikeChitChat) return true;
  const veryShort = t.length <= 20;
  if (veryShort) {
    if (sessionDomain === 'esthetic') return false;
    return !hasImportantKeyword && !hasOffTopicKeyword;
  }
  return false;
}

function isDefinitionQuestion(message: string): boolean {
  const t = normalizeText(message);
  return /\b(q|que)\s+(significa|es)\b/.test(t) || /\b(definicion|define|significado\s+de)\b/.test(t);
}

function isSymptomReport(message: string): boolean {
  const t = normalizeText(message);
  const symptomVerbs = [
    'tengo','me pasa','me paso','me duele','me arde','me siento','siento',
    'presento','empece','ahora','desde','me dejo','veo','no veo','se me nubla','se me nubl',
  ];
  return symptomVerbs.some((k) => t.includes(k));
}

function looksLikeBareTermDefinitionQuery(message: string): boolean {
  const raw = (message ?? '').trim();
  if (!raw || raw.length > 26) return false;
  const norm = normalizeText(raw);
  const tokens = tokenizeNormalized(norm);
  if (tokens.length === 0 || tokens.length > 2) return false;
  if (tokens.length === 2 && raw.length > 22) return false;
  const smallTalkHard: RegExp[] = [
    /^(hola|holi|buenas|buenos dias|buenas tardes|buenas noches)\b/,
    /\b(como estas|que tal|todo bien|todo bn|todo ok)\b/,
    /\b(gracias|muchas gracias)\b/,
  ];
  if (smallTalkHard.some((r) => r.test(norm))) return false;
  if (isSymptomReport(raw)) return false;
  if (inferProcedureContext(raw).likelyPostProcedure) return false;
  return true;
}

function isDefinitionIntent(message: string): boolean {
  return isDefinitionQuestion(message) || looksLikeBareTermDefinitionQuery(message);
}

type BrainReason = 'plan_decision' | 'educational_broad' | 'definition_unknown' | 'general_question';

function looksLikePlanOrDecisionQuestion(message: string): boolean {
  const t = normalizeText(message);
  const patterns: RegExp[] = [
    /\b(cuando|en que momento|cuanto tiempo|intervalo|esperar|despues de|antes de)\b/,
    /\b(puedo|debo|conviene|recomiendas|recomendable|mejor|peor)\b/,
    /\b(cambiar de|pasar de|vs|versus|comparar|diferencia)\b/,
    /\b(dosis|sesiones|protocolo|indicacion|contraindicacion)\b/,
  ];
  const longish = t.length >= 70;
  const multi = t.includes('?') && (t.match(/\?/g)?.length ?? 0) >= 2;
  return patterns.some((r) => r.test(t)) || longish || multi;
}

function looksLikeEducationalBroad(message: string): boolean {
  const t = normalizeText(message);
  return /\b(riesgos|complicaciones|que tan seguro|peligroso|efectos secundarios|probabilidad)\b/.test(t);
}

type RouteDecision =
  | { route: 'deterministic'; reason: 'emergency' | 'definition' | 'high_risk_material' | 'triage_complication' }
  | { route: 'brain'; reason: BrainReason }
  | { route: 'general'; reason: 'small_talk' | 'fallback' };

function decideRoute(args: {
  rawMessage: string;
  hasDefinitionHit: boolean;
  definitionIntent: boolean;
  material: MaterialHit | null;
  materialContext: MaterialContext;
  sessionDomain: SessionDomain;
}): RouteDecision {
  const { rawMessage, hasDefinitionHit, definitionIntent, material, materialContext, sessionDomain } = args;
  if (isSmallTalk(rawMessage, { sessionDomain })) return { route: 'general', reason: 'small_talk' };
  if (definitionIntent && hasDefinitionHit) return { route: 'deterministic', reason: 'definition' };
  if (definitionIntent && !hasDefinitionHit) return { route: 'brain', reason: 'definition_unknown' };
  if (material) {
    const isHighRiskMaterial = Boolean(material.listaNegra) || material.nivelRiesgo >= 4;
    if (isHighRiskMaterial && (materialContext === 'considering' || materialContext === 'already')) {
      return { route: 'deterministic', reason: 'high_risk_material' };
    }
  }
  if (looksLikePlanOrDecisionQuestion(rawMessage)) return { route: 'brain', reason: 'plan_decision' };
  if (looksLikeEducationalBroad(rawMessage)) return { route: 'brain', reason: 'educational_broad' };
  return { route: 'brain', reason: 'general_question' };
}

type QualityEvent =
  | { kind: 'complication'; id: string; severity: number; urgent: boolean }
  | { kind: 'material'; id: string; risk: number; blacklisted: boolean; urgent: boolean; context: MaterialContext; dangerSignals: string[] }
  | { kind: 'danger_signal'; urgent: true; dangerSignals: string[]; pseudoSeverity: 4 }
  | { kind: 'none'; reason: 'small_talk' | 'general' };

function classifyQualityEvent(args: {
  message: string;
  mode: string | null;
  definitionIntent?: boolean;
  dangerSignals?: string[];
  materialsFound?: MaterialsFound;
  materialContext?: MaterialContext;
}): QualityEvent {
  const { message } = args;
  if (isSmallTalk(message)) return { kind: 'none', reason: 'small_talk' };
  const complication = findHighestSeverityComplication(message);
  if (complication) {
    const urgent = complication.nivel >= 4 || Boolean(complication.marcarComoUrgencia);
    return { kind: 'complication', id: complication.id, severity: complication.nivel, urgent };
  }
  const materialsFound = args.materialsFound ?? findMaterialsInMessage(message, 3);
  const highRiskMaterial = pickHighRiskMaterial(materialsFound);
  const material = highRiskMaterial ?? materialsFound[0] ?? null;
  if (material) {
    const isHighRisk = Boolean(material.listaNegra) || material.nivelRiesgo >= 4;
    const context = args.materialContext ?? inferMaterialContext(message);
    const dangerSignals = isHighRisk ? args.dangerSignals ?? detectDangerSignals(message) : [];
    const urgent = isHighRisk && dangerSignals.length > 0;
    return { kind: 'material', id: material.id, risk: material.nivelRiesgo, blacklisted: Boolean(material.listaNegra), urgent, context, dangerSignals };
  }
  const defIntent = args.definitionIntent ?? isDefinitionIntent(message);
  if (!defIntent) {
    const dangerSignals = args.dangerSignals ?? detectDangerSignals(message);
    if (dangerSignals.length > 0) return { kind: 'danger_signal', urgent: true, dangerSignals, pseudoSeverity: 4 };
  }
  return { kind: 'none', reason: 'general' };
}

async function upsertSessionLog(params: {
  sessionId: string;
  uid?: string | null;
  mode: string | null;
  profileSnapshot: StoredProfile | null;
  userText: string;
  botText: string;
  qualityEvent: QualityEvent;
  route: RouteDecision;
}) {
  const { sessionId, uid, mode, profileSnapshot, userText, botText, qualityEvent, route } = params;
  const ref = adminDb.collection('chat_sessions').doc(sessionId);
  const COOLDOWN_MS = 15_000;
  const nowMs = Date.now();
  const userPreview = userText.slice(0, 220);
  const botPreview = botText.slice(0, 220);
  const lowerUser = normalizeText(userText);
  const userHasEstheticKeyword = ESTHETIC_KEYWORDS.some((kw) => lowerUser.includes(kw));
  let newDomainHint: SessionDomain | null = null;
  if (userHasEstheticKeyword) {
    if (route.route === 'brain' || route.route === 'deterministic') newDomainHint = 'esthetic';
    if (route.route === 'general' && route.reason === 'fallback') newDomainHint = 'esthetic';
  }

  await adminDb.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const data = (snap.exists ? snap.data() : undefined) as any;
    const prevSeenComp: string[] = Array.isArray(data?.seenComplicationIds) ? data.seenComplicationIds : [];
    const prevSeenMat: string[] = Array.isArray(data?.seenMaterialIds) ? data.seenMaterialIds : [];
    const prevSeenDanger: string[] = Array.isArray(data?.seenDangerKeys) ? data.seenDangerKeys : [];
    const prevHighest: number = typeof data?.highestSeveritySeen === 'number' ? data.highestSeveritySeen : 0;
    const lastLoggedAtMs: number | null = typeof data?.lastLoggedAtMs === 'number' ? data.lastLoggedAtMs : null;
    const lastLoggedEventKey: string | null = typeof data?.lastLoggedEventKey === 'string' ? data.lastLoggedEventKey : null;
    const prevDomain: SessionDomain = data?.domainHint === 'esthetic' || data?.domainHint === 'offtopic' ? data.domainHint : 'unknown';
    const domainHintToStore: SessionDomain = newDomainHint ?? prevDomain;

    if (!snap.exists) {
      tx.set(ref, {
        createdAt: serverTimestamp(),
        uid: uid ?? null,
        projectId: adminProjectId ?? null,
        mode: mode ?? null,
        profileSnapshot: profileSnapshot ?? null,
        lastActiveAt: serverTimestamp(),
        domainHint: domainHintToStore,
        counts: {
          totalMessages: 1, loggedEvents: 0, triageEvents: 0, materialEvents: 0, urgentEvents: 0,
          brainCalls: route.route === 'brain' ? 1 : 0,
          deterministicResponses: route.route === 'deterministic' ? 1 : 0,
          definitionResponses: route.route === 'deterministic' && route.reason === 'definition' ? 1 : 0,
        },
        highestSeveritySeen: 0,
        seenComplicationIds: [], seenMaterialIds: [], urgentSignalsSeen: [], seenDangerKeys: [],
        lastLoggedAtMs: null, lastLoggedEventKey: null, lastImportantAt: null,
        lastUserPreview: null, lastBotPreview: null, lastImportantSummary: null,
        lastRoute: route.route, lastRouteReason: route.reason,
      }, { merge: true });
    } else {
      const countsUpdate: Record<string, unknown> = { totalMessages: FieldValue.increment(1) };
      if (route.route === 'brain') countsUpdate.brainCalls = FieldValue.increment(1);
      if (route.route === 'deterministic') {
        countsUpdate.deterministicResponses = FieldValue.increment(1);
        if (route.reason === 'definition') countsUpdate.definitionResponses = FieldValue.increment(1);
      }
      tx.set(ref, {
        projectId: adminProjectId ?? null,
        mode: mode ?? null,
        profileSnapshot: profileSnapshot ?? null,
        lastActiveAt: serverTimestamp(),
        lastRoute: route.route, lastRouteReason: route.reason,
        domainHint: domainHintToStore,
        counts: countsUpdate,
      }, { merge: true });
    }

    if (qualityEvent.kind === 'none') return;

    let eventKey = '';
    if (qualityEvent.kind === 'complication') eventKey = 'complication:' + qualityEvent.id + ':sev' + qualityEvent.severity + ':urgent' + (qualityEvent.urgent ? 1 : 0);
    else if (qualityEvent.kind === 'material') eventKey = 'material:' + qualityEvent.id + ':risk' + qualityEvent.risk + ':blk' + (qualityEvent.blacklisted ? 1 : 0) + ':urgent' + (qualityEvent.urgent ? 1 : 0) + ':ctx' + qualityEvent.context;
    else if (qualityEvent.kind === 'danger_signal') eventKey = 'danger:' + qualityEvent.dangerSignals.join('|');

    if (lastLoggedAtMs != null && lastLoggedEventKey === eventKey && nowMs - lastLoggedAtMs < COOLDOWN_MS) {
      tx.set(ref, { lastLoggedAtMs: nowMs }, { merge: true });
      return;
    }

    let shouldCountAsNew = true;
    if (qualityEvent.kind === 'complication' && prevSeenComp.includes(qualityEvent.id)) shouldCountAsNew = false;
    if (qualityEvent.kind === 'material') {
      const isHighRisk = qualityEvent.blacklisted || qualityEvent.risk >= 4;
      if (isHighRisk) { if (prevSeenMat.includes(qualityEvent.id)) shouldCountAsNew = false; }
      else {
        const allowedContext = qualityEvent.context === 'considering' || qualityEvent.context === 'already';
        if (!allowedContext || prevSeenMat.includes(qualityEvent.id)) shouldCountAsNew = false;
      }
    }
    if (qualityEvent.kind === 'danger_signal' && prevSeenDanger.includes(eventKey)) shouldCountAsNew = false;

    if (!shouldCountAsNew) {
      tx.set(ref, { lastLoggedAtMs: nowMs, lastLoggedEventKey: eventKey }, { merge: true });
      return;
    }

    const countsInc: Record<string, unknown> = { loggedEvents: FieldValue.increment(1) };
    const updates: Record<string, unknown> = {
      lastLoggedAtMs: nowMs, lastLoggedEventKey: eventKey,
      lastImportantAt: serverTimestamp(), lastUserPreview: userPreview, lastBotPreview: botPreview,
      counts: countsInc,
    };

    if (qualityEvent.kind === 'complication') {
      countsInc.triageEvents = FieldValue.increment(1);
      if (qualityEvent.urgent) countsInc.urgentEvents = FieldValue.increment(1);
      updates.seenComplicationIds = FieldValue.arrayUnion(qualityEvent.id);
      updates.highestSeveritySeen = Math.max(prevHighest, qualityEvent.severity);
      updates.lastImportantSummary = 'Triage: ' + qualityEvent.id + ' (sev ' + qualityEvent.severity + ')' + (qualityEvent.urgent ? ' [URGENTE]' : '');
    }
    if (qualityEvent.kind === 'material') {
      countsInc.materialEvents = FieldValue.increment(1);
      if (qualityEvent.urgent) countsInc.urgentEvents = FieldValue.increment(1);
      updates.seenMaterialIds = FieldValue.arrayUnion(qualityEvent.id);
      if (qualityEvent.urgent && qualityEvent.dangerSignals?.length) updates.urgentSignalsSeen = FieldValue.arrayUnion(...qualityEvent.dangerSignals);
      updates.lastImportantSummary = 'Material: ' + qualityEvent.id + ' (risk ' + qualityEvent.risk + ')' + (qualityEvent.blacklisted ? ' [LISTA NEGRA]' : '') + (qualityEvent.urgent ? ' [ALERTA: ' + qualityEvent.dangerSignals.join(', ') + ']' : '') + ' (ctx: ' + qualityEvent.context + ')';
    }
    if (qualityEvent.kind === 'danger_signal') {
      countsInc.triageEvents = FieldValue.increment(1);
      countsInc.urgentEvents = FieldValue.increment(1);
      updates.seenDangerKeys = FieldValue.arrayUnion(eventKey);
      if (qualityEvent.dangerSignals?.length) updates.urgentSignalsSeen = FieldValue.arrayUnion(...qualityEvent.dangerSignals);
      updates.highestSeveritySeen = Math.max(prevHighest, qualityEvent.pseudoSeverity);
      updates.lastImportantSummary = 'Señales de alarma: ' + qualityEvent.dangerSignals.join(', ') + ' [URGENTE]';
    }
    tx.set(ref, updates, { merge: true });
  });
}

function buildEmergencyLine(countryName?: string) {
  const emergency = countryName ? findEmergencyNumber(countryName) : null;
  return emergency
    ? 'En ' + emergency.countryName + ', el número principal de emergencias es: ' + emergency.emergencyNumber + '.'
    : 'Si estás en México, el número general de emergencias es el 911; en otros países, usa el número de emergencias local.';
}

function buildBrainSystemPrompt(args: {
  mode: string | null;
  hasProfile: boolean;
}): string {
  const { mode, hasProfile } = args;

  const modeNote = mode === 'quick'
    ? '\n\nMODO CONSULTA RÁPIDA: La usuaria no ha compartido su perfil. Mantén la respuesta breve (150–230 palabras). Puedes invitarla sutilmente a completar su perfil al final si crees que añadiría valor, pero sin insistir.'
    : '';

  const profileNote = hasProfile
    ? '\n\nMODO PERSONALIZADO: Tienes acceso al perfil clínico completo de la usuaria (procedimientos previos, materiales usados, condiciones de salud, fechas). Úsalo activamente para personalizar cada respuesta — no lo ignores.'
    : '';

  return 'Eres DrBeautyBot, asistente informativo especializado en medicina estética. Tu audiencia principal son mujeres hispanohablantes que buscan orientación clara, honesta y segura antes o después de procedimientos estéticos.\n\n' +
    '## IDENTIDAD Y LÍMITES\n' +
    '- Informas y orientas, nunca diagnosticas ni prescribes.\n' +
    '- No das instrucciones operativas: sin puntos de inyección, sin dosis específicas, sin técnicas de aplicación.\n' +
    '- Si detectas señales de alarma (visión borrosa, dificultad respiratoria, necrosis, piel fría/cambio de color, dolor intenso, fiebre con pus, desmayo), derivar a urgencias médicas de inmediato.\n' +
    '- Las capas de seguridad del sistema ya han filtrado emergencias. Si el mensaje llegó aquí, no es una urgencia activa — responde con normalidad.\n\n' +
    '## CÓMO USAR EL PERFIL CLÍNICO\n' +
    'Cuando tengas datos del perfil de la usuaria, úsalos activamente:\n\n' +
    '**Procedimientos previos y materiales:**\n' +
    '- Si ya tiene Ellansé (PCL), no puede mezclar fácilmente con AH u otros materiales — menciónalo si es relevante.\n' +
    '- Si ya tiene toxina reciente, considera el timing antes de hablar de una nueva aplicación.\n' +
    '- Adapta las recomendaciones a los materiales que ya conoce y ha usado.\n\n' +
    '**Condiciones de salud:**\n' +
    '- Hipertensión, diabetes, anticoagulantes → mayor precaución con procedimientos invasivos, hematomas, cicatrización.\n' +
    '- Enfermedades neuromusculares → contraindicación relativa a toxina botulínica.\n' +
    '- Embarazo/lactancia → contraindicación para la mayoría de procedimientos estéticos.\n' +
    '- SOP → puede afectar distribución de grasa facial y respuesta a tratamientos.\n' +
    '- Menciona estas consideraciones cuando sean clínicamente relevantes, sin alarmar innecesariamente.\n\n' +
    '**Fechas de procedimientos:**\n' +
    '- Si conoces cuándo fue el último procedimiento, úsalo para orientar sobre timing de reaplicación.\n\n' +
    '## CÓMO USAR EL HISTORIAL DE CONVERSACIÓN\n' +
    '- Mantén continuidad: si en mensajes anteriores habló de una zona específica, no le preguntes de nuevo.\n' +
    '- Si cambió de tema, adáptate al nuevo tema sin olvidar el contexto previo relevante.\n' +
    '- Evita repetir información que ya diste en el mismo hilo.\n' +
    '- Si hay contradicciones entre lo que dijo antes y ahora, resuélvelas con una pregunta amable.\n\n' +
    '## TONO Y ESTILO\n' +
    '- Humano, cercano, calmado. Como una amiga que sabe mucho de medicina estética, no como un formulario médico.\n' +
    '- Frases cortas. Párrafos de 2–3 líneas máximo. Línea en blanco entre bloques.\n' +
    '- Usa guiones "-" para listas. Nunca uses "1)", "2)" ni encabezados tipo "Resumen:" o "Conclusión:".\n' +
    '- No incluyas avisos legales ni disclaimers en tus respuestas — la UI ya los muestra.\n\n' +
    '## ESTRUCTURA DE RESPUESTA\n' +
    '1. Idea principal en 1–2 frases naturales.\n' +
    '2. Explicación con contexto (usa analogías cotidianas si ayuda).\n' +
    '3. Riesgos/limitaciones relevantes en lista con guiones (si aplica).\n' +
    '4. Señales de alarma concretas (solo si aplica al caso).\n' +
    '5. Máximo 1–3 preguntas si faltan datos clave — formuladas de forma cercana.\n\n' +
    'No alargues la respuesta si ya tienes suficiente información para responder bien.' +
    modeNote + profileNote;
}

function buildContextPack(args: {
  profile: StoredProfile | null;
  materialsFound: MaterialsFound;
  materialContext: MaterialContext;
  dangerSignals: string[];
  procedureCtx: ReturnType<typeof inferProcedureContext>;
  definitionIntent: boolean;
  route: RouteDecision;
}): string {
  const { profile, materialsFound, materialContext, dangerSignals, procedureCtx, route } = args;

  if (!profile) return 'Consulta sin perfil (modo quick o usuaria nueva).';

  const parts: string[] = [];

  const personalParts: string[] = [];
  if (profile.name) personalParts.push('se llama ' + profile.name);
  if (profile.ageRange) personalParts.push('tiene ' + profile.ageRange + ' años');
  if (profile.country) personalParts.push('es de ' + profile.country);
  if (profile.area) personalParts.push('su área de interés principal es ' + profile.area);
  if (personalParts.length) parts.push('La usuaria ' + personalParts.join(', ') + '.');

  const condiciones: string[] = [];
  if (profile.isPregnant) condiciones.push('⚠️ EMBARAZADA O EN LACTANCIA — contraindicación para la mayoría de procedimientos');
  if (profile.healthConditions?.length) condiciones.push(...profile.healthConditions);
  if (profile.healthOther) condiciones.push(profile.healthOther);
  if (condiciones.length) parts.push('Condiciones de salud relevantes: ' + condiciones.join('; ') + '.');

  if (profile.previousProcedures?.length) {
    const procParts: string[] = [];

    if (profile.previousProcedures.includes('toxina')) {
      let toxinaDesc = 'toxina botulínica';
      if (profile.botoxZones?.length) toxinaDesc += ' en ' + profile.botoxZones.join(', ');
      const fecha = profile.procedureDates?.['toxina'];
      if (fecha?.month && fecha?.year) toxinaDesc += ' (última aplicación: ' + fecha.month + ' ' + fecha.year + ')';
      procParts.push(toxinaDesc);
    }

    if (profile.previousProcedures.includes('rellenos')) {
      if (profile.fillerMaterials?.length) {
        profile.fillerMaterials.forEach((mat) => {
          let matDesc = mat;
          const fechaKey = 'relleno_' + mat.toLowerCase().replace(/\s+/g, '_');
          const fecha = profile.procedureDates?.[fechaKey];
          if (fecha?.month && fecha?.year) matDesc += ' (última: ' + fecha.month + ' ' + fecha.year + ')';
          if (profile.fillerZones?.length) matDesc += ' en ' + profile.fillerZones.join(', ');
          procParts.push(matDesc);
        });
      } else {
        procParts.push('rellenos (material no especificado)');
      }
    }

    if (profile.previousProcedures.includes('laser')) {
      let laserDesc = 'depilación/tratamiento láser';
      const fecha = profile.procedureDates?.['laser'];
      if (fecha?.month && fecha?.year) laserDesc += ' (última: ' + fecha.month + ' ' + fecha.year + ')';
      procParts.push(laserDesc);
    }

    const otros = profile.previousProcedures.filter((p) => !['toxina', 'rellenos', 'laser'].includes(p));
    if (otros.length) procParts.push(...otros);
    if (procParts.length) parts.push('Procedimientos que ha tenido: ' + procParts.join('; ') + '.');
  }

  if (profile.interests?.length) parts.push('Temas que le interesan: ' + profile.interests.join(', ') + '.');

  const msgContext: string[] = [];
  if (materialsFound.length > 0) {
    const highRisk = pickHighRiskMaterial(materialsFound);
    const matNames = materialsFound.map((m: any) => m.nombre ?? m.id).join(', ');
    msgContext.push('Menciona: ' + matNames + ' (contexto: ' + materialContext + (highRisk ? ', ⚠️ ALTO RIESGO' : '') + ')');
  }
  if (dangerSignals.length > 0) msgContext.push('⚠️ Señales detectadas: ' + dangerSignals.join(', '));
  if (procedureCtx.likelyPostProcedure) msgContext.push('Consulta post-procedimiento.');
  if (msgContext.length) parts.push('Contexto del mensaje: ' + msgContext.join(' | '));

  parts.push('[Router: ' + route.route + '/' + route.reason + ']');
  return parts.join('\n');
}

// ── INTENCIÓN GRANULAR ────────────────────────────────────────
type GranularIntent =
  | 'timing'
  | 'comparison'
  | 'post_procedure'
  | 'contraindication'
  | 'cost'
  | 'product_specific'
  | 'general';

function detectGranularIntent(message: string): GranularIntent {
  const t = normalizeText(message);
  if (/\b(cuando|cuanto tiempo|intervalo|cada cuanto|reaplicar|mantenimiento|proximo|proxima)\b/.test(t)) return 'timing';
  if (/\b(vs|versus|diferencia|comparar|mejor|peor|cual es mejor|entre .* y)\b/.test(t)) return 'comparison';
  if (/\b(despues|post|me hice|me pusieron|me inyectaron|recuperacion|inflamacion|moretón|morete|hematoma|normal que)\b/.test(t)) return 'post_procedure';
  if (/\b(puedo|puedes|contraindicado|contraindicacion|tengo .* y|con mi|si tengo|embarazada|lactancia|diabetes|hipertension|anticoagulante)\b/.test(t)) return 'contraindication';
  if (/\b(cuanto cuesta|precio|costo|cuanto vale|cuanto cobran|barato|caro)\b/.test(t)) return 'cost';
  if (/\b(botox|dysport|juvederm|restylane|sculptra|radiesse|ellanse|revofil|belotero|teosyal|nabota|letybo|linurase|xeomin)\b/.test(t)) return 'product_specific';
  return 'general';
}

function buildIntentContext(
  intent: GranularIntent,
  facts: ReturnType<typeof buildMessageFacts>,
  profile: StoredProfile | null,
): string {
  const chunks: string[] = [];

  switch (intent) {
    case 'timing':
      chunks.push(
        'DATOS DE REFERENCIA — DURACIONES PROMEDIO:',
        '- Toxina botulínica: 4–6 meses (baby botox puede ser menos)',
        '- AH labios: 6–9 meses | AH pómulos/surcos: 9–12 meses | Skinbooster: 6 meses',
        '- Radiesse (CaHA): 12–18 meses',
        '- Sculptra (PLLA): 18–24 meses (requiere 2–3 sesiones)',
        '- Ellansé-S: 6–12m | Ellansé-M: 12–18m | Ellansé-L: 18–24m | Ellansé-E: 24–36m',
        '- Hilos tensores PDO: 12–18 meses',
        '- Depilación láser: permanente (80–90% tras 6–8 sesiones, cada 4–8 semanas según zona)',
        'NOTA: La duración real varía por metabolismo, zona, técnica y calidad del producto.',
      );
      if (profile?.procedureDates && Object.keys(profile.procedureDates).length > 0) {
        const hoy = new Date();
        const MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
        const fechasRelevantes = Object.entries(profile.procedureDates)
          .map(([proc, fecha]) => {
            if (!fecha.month || !fecha.year) return null;
            const monthIdx = MONTHS.indexOf(fecha.month);
            if (monthIdx === -1) return null;
            const procDate = new Date(Number(fecha.year), monthIdx, 1);
            const mesesTranscurridos = Math.round((hoy.getTime() - procDate.getTime()) / (1000 * 60 * 60 * 24 * 30));
            return proc + ': hace ~' + mesesTranscurridos + ' meses (' + fecha.month + ' ' + fecha.year + ')';
          })
          .filter(Boolean);
        if (fechasRelevantes.length > 0) {
          chunks.push('HISTORIAL TEMPORAL DE LA USUARIA:', ...fechasRelevantes.map(f => '- ' + f));
        }
      }
      break;
    case 'comparison':
      chunks.push(
        'DATOS DE REFERENCIA — COMPARATIVAS CLAVE:',
        'AH vs Ellansé: AH es reversible (hialuronidasa), dura 9–12m. Ellansé no es reversible, dura 18–36m y bioestimula colágeno. No se mezclan bien en la misma zona.',
        'AH vs Sculptra: AH da resultado inmediato. Sculptra es progresivo (4–8 semanas), requiere varias sesiones, dura 18–24m. Públicos objetivo distintos.',
        'Toxina vs Relleno: Toxina relaja músculo (dinámico). Relleno añade volumen (estático). Muchos tratamientos los combinan.',
        'Láser vs IPL: Láser = luz monocromática concentrada, más efectivo y preciso. IPL = luz pulsada de amplio espectro, menos efectiva para depilación, útil para manchas superficiales en fototipos claros.',
        'Radiesse vs Sculptra: Ambos bioestimuladores. Radiesse (CaHA) da resultado más inmediato. Sculptra (PLLA) más gradual.',
      );
      break;
    case 'post_procedure':
      chunks.push(
        'DATOS DE REFERENCIA — POSTOPERATORIO NORMAL VS ALARMA:',
        'TOXINA — Normal: pequeños hematomas 24–48h, leve asimetría inicial que mejora. Alarma: ptosis parpado, visión borrosa, dificultad para tragar.',
        'AH — Normal: inflamación 24–72h (más en labios), moretones, asimetría inicial. Alarma: dolor intenso, palidez/morado en zona, piel fría → oclusión vascular, urgencia.',
        'LÁSER — Normal: rojez, calor, descamación leve 3–7 días. Alarma: ampolla, costra oscura, hiperpigmentación persistente.',
        'HILOS — Normal: asimetría 1–2 semanas, hematomas, sensación de tirantez. Alarma: nódulo duro persistente >4 semanas, extrusión del hilo.',
        'REGLA GENERAL: Si hay cambio de color (morado/negro), piel fría, dolor desproporcionado o alteración visual → urgencias inmediatas.',
      );
      break;
    case 'contraindication':
      chunks.push(
        'DATOS DE REFERENCIA — CONTRAINDICACIONES PRINCIPALES:',
        'EMBARAZO/LACTANCIA: Contraindicado toxina, rellenos, láser, peelings medios/profundos, hilos.',
        'ANTICOAGULANTES (warfarina, aspirina crónica, clopidogrel): Mayor riesgo hematoma. Suspensión debe coordinarla el médico tratante.',
        'ENFERMEDADES NEUROMUSCULARES (miastenia gravis, ELA, esclerosis múltiple): Contraindicación relativa a toxina botulínica.',
        'DIABETES no controlada: Cicatrización alterada, mayor riesgo infección.',
        'HIPERTENSIÓN no controlada: Mayor riesgo hematoma y sangrado.',
        'AUTOINMUNES activas (lupus, artritis reumatoide): Precaución con rellenos, valorar con reumatólogo.',
        'ISOTRETINOÍNA: Contraindicado peelings, láser ablativo y procedimientos invasivos. Esperar 6–12 meses tras finalizar.',
        'HERPES LABIAL recurrente: Profilaxis antiviral antes de tratamientos en área perioral.',
      );
      break;
    case 'cost':
      chunks.push(
        'ORIENTACIÓN DE PRECIOS (rangos de referencia, varían por ciudad y médico):',
        'MÉXICO: Toxina $800–2500 MXN/zona | AH $3500–8000 MXN/ml | Sculptra $12000–20000 MXN/sesión | Ellansé $14000–25000 MXN | Láser depilación $800–3000 MXN/zona/sesión',
        'COLOMBIA: Toxina $150k–400k COP/zona | AH $800k–2M COP/ml | Sculptra $2M–4M COP/sesión',
        'ESPAÑA: Toxina $150–400 EUR/zona | AH $300–800 EUR/ml | Sculptra $500–1200 EUR/sesión',
        'RED FLAGS DE PRECIO: Precios muy por debajo del mínimo → posible producto adulterado o aplicador sin experiencia.',
      );
      break;
    case 'product_specific':
      chunks.push('La usuaria pregunta sobre un producto específico. Responde con información verificable: mecanismo, duración, indicaciones, contraindicaciones y diferencias con alternativas.');
      break;
  }

  return chunks.length > 0 ? chunks.join('\n') : '';
}

async function loadSessionMemory(uid: string | null, sessionId: string): Promise<string> {
  if (!uid) return '';
  try {
    const snap = await adminDb
      .collection('chat_sessions')
      .where('uid', '==', uid)
      .orderBy('lastActiveAt', 'desc')
      .limit(4)
      .get();

    const pastSessions = snap.docs
      .filter((doc) => doc.id !== sessionId)
      .slice(0, 3);

    if (pastSessions.length === 0) return '';

    const summaries = pastSessions
      .map((doc) => {
        const d = doc.data();
        if (!d.lastImportantSummary && !d.lastUserPreview) return null;
        const date = d.lastActiveAt?.toDate?.()?.toLocaleDateString('es-MX') ?? 'fecha desconocida';
        return '- ' + date + ': ' + (d.lastImportantSummary ?? d.lastUserPreview ?? '');
      })
      .filter(Boolean);

    if (summaries.length === 0) return '';
    return 'CONVERSACIONES ANTERIORES RELEVANTES:\n' + summaries.join('\n');
  } catch (e) {
    console.error('Error loading session memory:', e);
    return '';
  }
}

async function callBrain(args: {
  userMessage: string;
  history?: HistoryMessage[];
  mode: string | null;
  profile: StoredProfile | null;
  intro: string;
  contextPack: string;
  closingSuffix: string;
  intent: GranularIntent;
  sessionMemory: string;
}): Promise<ReadableStream<Uint8Array>> {
  const { userMessage, history = [], mode, profile, contextPack, intent, sessionMemory } = args;

  const encoder = new TextEncoder();

  const fallback = (text: string): ReadableStream<Uint8Array> =>
    new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode('data: ' + JSON.stringify({ text }) + '\n\n'));
        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        controller.close();
      },
    });

  if (!process.env.OPENAI_API_KEY) {
    return fallback('En este momento no tengo habilitada la conexión al cerebro IA.');
  }

  const system = buildBrainSystemPrompt({ mode, hasProfile: !!profile });
  const intentContext = buildIntentContext(intent, {} as any, profile);

  const systemContent = [
    system,
    '\n\n---\nCONTEXTO CLÍNICO DE LA USUARIA:\n' + contextPack,
    intentContext ? '\n\n---\nDATOS CLÍNICOS RELEVANTES PARA ESTA CONSULTA:\n' + intentContext : '',
    sessionMemory ? '\n\n---\n' + sessionMemory : '',
  ].filter(Boolean).join('');

  const input: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
    { role: 'system', content: systemContent },
    ...history.map((m) => ({ role: m.role as 'user' | 'assistant', content: m.text })),
    { role: 'user', content: userMessage },
  ];

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        const stream = await openai.responses.create({
          model: BRAIN_MODEL,
          input,
          stream: true,
        });

        for await (const event of stream as any) {
          const delta = event?.delta ?? event?.choices?.[0]?.delta?.content ?? '';
          if (delta) {
            controller.enqueue(encoder.encode('data: ' + JSON.stringify({ text: delta }) + '\n\n'));
          }
        }

        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        controller.close();
      } catch (e) {
        console.error('OpenAI streaming error:', e);
        controller.enqueue(encoder.encode('data: ' + JSON.stringify({ text: 'Tuve un problema al generar la respuesta. Intenta de nuevo.' }) + '\n\n'));
        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        controller.close();
      }
    },
  });
}

async function resolveStream(stream: ReadableStream<Uint8Array>): Promise<string> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let result = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const chunk = decoder.decode(value);
    const lines = chunk.split('\n').filter((l) => l.startsWith('data: ') && !l.includes('[DONE]'));
    for (const line of lines) {
      try { result += JSON.parse(line.slice(6)).text ?? ''; } catch { /* ignore */ }
    }
  }
  return result;
}

function buildMessageFacts(message: string) {
  const dangerSignals = detectDangerSignals(message);
  const procedureCtx = inferProcedureContext(message);
  const definitionIntent = isDefinitionIntent(message);
  const symptomReport = isSymptomReport(message);
  const materialsFound = findMaterialsInMessage(message, 3);
  const material = materialsFound[0] ?? null;
  const highRiskMaterial = pickHighRiskMaterial(materialsFound);
  const materialContext: MaterialContext = materialsFound.length > 0 ? inferMaterialContext(message) : 'unknown';
  const materialForRouting = highRiskMaterial ?? material;
  const hasVision = dangerSignals.includes('alteraciones visuales');
  const hasBreathingChest = dangerSignals.includes('dificultad para respirar o dolor/opresión en el pecho');
  return { dangerSignals, procedureCtx, definitionIntent, symptomReport, materialsFound, material, highRiskMaterial, materialContext, materialForRouting, hasVision, hasBreathingChest };
}

// ── POST HANDLER ──────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as ChatRequestBody;
    const rawMessage = body.message?.trim();
    if (!rawMessage) return Response.json({ error: 'Mensaje vacío' }, { status: 400 });

    const lower = normalizeText(rawMessage);
    const mode = body.mode ?? null;
    const profile = body.profile ?? null;
    const sessionId = body.sessionId ?? null;
    const uid = body.uid ?? null;
    const history: HistoryMessage[] = Array.isArray(body.history) ? body.history.slice(-8) : [];
    const effectiveProfile = mode === 'quick' ? null : profile;

    // v2.2: closingSuffix siempre vacío — el disclaimer vive en la UI, no en el API
    const closingSuffix = '';
    const intro = buildIntro(mode, effectiveProfile);

    let sessionDomain: SessionDomain = 'unknown';
    if (sessionId) {
      try {
        const snap = await adminDb.collection('chat_sessions').doc(sessionId).get();
        const d = (snap.exists ? snap.data() : undefined) as any;
        if (d?.domainHint === 'esthetic' || d?.domainHint === 'offtopic') sessionDomain = d.domainHint;
      } catch (e) {
        console.error('Error leyendo domainHint:', e);
      }
    }

    const facts = buildMessageFacts(rawMessage);
    const looksEmergencyLike = facts.dangerSignals.length > 0 || Boolean(facts.highRiskMaterial);
    const isMsgSmallTalk = isSmallTalk(rawMessage, { sessionDomain });

    if (!looksEmergencyLike && !isMsgSmallTalk) {
      const hasEstheticKeyword = ESTHETIC_KEYWORDS.some((kw) => lower.includes(kw));
      const hasOffTopicKeyword = OFFTOPIC_KEYWORDS.some((kw) => lower.includes(kw));

      if (sessionDomain === 'esthetic') {
        if (!hasEstheticKeyword && hasOffTopicKeyword) {
          return Response.json({ reply: intro + 'Parece que este mensaje es de otro tema. DrBeautyBot está centrado exclusivamente en medicina estética. Si quieres, seguimos con tus dudas sobre rellenos, toxina botulínica, láser u otros procedimientos estéticos.' });
        }
      } else {
        if (!hasEstheticKeyword && hasOffTopicKeyword) {
          return Response.json({ reply: intro + 'Soy DrBeautyBot y estoy diseñada exclusivamente para resolver dudas de medicina estética (rellenos, toxina botulínica, láser, manchas, acné, cicatrices, ojeras, flacidez, etc.). Tu mensaje parece ser de otro tema, así que en este caso no puedo ayudarte.\n\nSi quieres, cuéntame qué zona o tratamiento estético tienes en mente.' });
        }
        if (!hasEstheticKeyword && !hasOffTopicKeyword) {
          return Response.json({ reply: intro + 'Para poder ayudarte necesito que tu pregunta esté claramente relacionada con medicina estética. Por ejemplo, puedes decirme si te interesa hablar de rellenos, toxina botulínica, láser para manchas o depilación, cicatrices de acné, ojeras, flacidez, etc., y en qué zona del cuerpo te preocupa más.' });
        }
      }
    }

    const maybeLogSession = async (reply: string, route: RouteDecision) => {
      if (!sessionId) return;
      const qualityEvent = classifyQualityEvent({ message: rawMessage, mode, definitionIntent: facts.definitionIntent, dangerSignals: facts.dangerSignals, materialsFound: facts.materialsFound, materialContext: facts.materialContext });
      await upsertSessionLog({ sessionId, uid, mode, profileSnapshot: effectiveProfile, userText: rawMessage, botText: reply, qualityEvent, route });
    };

    // ── CAPA 0.5: TRIAGE GUARD ────────────────────────────────
    let dangerSignalsForDefinition: string[] | null = null;
    if (facts.dangerSignals.length > 0) {
      const critical = facts.hasVision || facts.hasBreathingChest;
      const highButContextual = !critical && facts.procedureCtx.likelyPostProcedure && facts.symptomReport;
      const isReallyDefinitionOnly = facts.definitionIntent && !facts.symptomReport && !facts.procedureCtx.likelyPostProcedure;

      if ((critical || highButContextual) && !isReallyDefinitionOnly) {
        const emergencyLine = buildEmergencyLine(effectiveProfile?.country);
        const detectedLine = facts.dangerSignals.length === 1
          ? 'Detecté una señal de alarma: **' + facts.dangerSignals[0] + '**.'
          : 'Detecté señales de alarma (prioridad alta → baja): **' + facts.dangerSignals.join(', ') + '**.';
        const reply = intro + detectedLine + '\n\nSi esto te está ocurriendo ahora (especialmente después de una inyección o procedimiento facial), es importante **buscar valoración médica urgente de inmediato**. DrBeautyBot no puede valorar ni manejar urgencias en tiempo real. Acude a **urgencias** o contacta al médico que realizó el procedimiento **ya**.\n\n' + emergencyLine;
        const route: RouteDecision = { route: 'deterministic', reason: 'emergency' };
        await maybeLogSession(reply, route);
        return Response.json({ reply });
      }
      if (isReallyDefinitionOnly) dangerSignalsForDefinition = facts.dangerSignals;
    }

    // ── CAPA DEFINICIONES ─────────────────────────────────────
    let hasDefinitionHit = false;
    if (facts.definitionIntent) {
      const def = findDefinitionInMessage(rawMessage);
      if (def) {
        hasDefinitionHit = true;
        const safetyParts: string[] = [];
        if (dangerSignalsForDefinition?.length) safetyParts.push('⚠️ Nota de seguridad: mencionaste señales como **' + dangerSignalsForDefinition.join(', ') + '**. Si le está ocurriendo a alguien (especialmente tras un procedimiento/inyección), conviene valoración médica inmediata.');
        if (def.safetyNote) safetyParts.push('⚠️ ' + def.safetyNote);
//      const reply = intro + '**Definición — ' + def.term + ':**\n' + def.definition + '\n\n' + (safetyParts.length ? safetyParts.join('\n\n') : '');
        const reply = intro + def.definition + (safetyParts.length ? '\n\n' + safetyParts.join('\n\n') : '');
        const route: RouteDecision = { route: 'deterministic', reason: 'definition' };
        await maybeLogSession(reply, route);
        return Response.json({ reply });
      }
    }

    // ── CAPA TRIAGE ───────────────────────────────────────────
    const complication = findHighestSeverityComplication(rawMessage);
    if (complication) {
      if (complication.nivel >= 4 || complication.marcarComoUrgencia) {
        const emergencyLine = buildEmergencyLine(effectiveProfile?.country);
        const reply = complication.orientacionPaciente + '\n\nDrBeautyBot no puede valorar ni manejar urgencias en tiempo real. Debes acudir de inmediato al servicio de urgencias más cercano o contactar al médico que realizó el procedimiento. ' + emergencyLine;
        const route: RouteDecision = { route: 'deterministic', reason: 'triage_complication' };
        await maybeLogSession(reply, route);
        return Response.json({ reply });
      }
      if (complication.nivel <= 2) {
        const reply = intro + complication.orientacionPaciente + '\n\nAunque algunas reacciones leves pueden ser esperables, siempre es recomendable comentar cualquier cambio con tu médico tratante, sobre todo si algo te preocupa o cambia de forma brusca.';
        const route: RouteDecision = { route: 'deterministic', reason: 'triage_complication' };
        await maybeLogSession(reply, route);
        return Response.json({ reply });
      }
      if (complication.nivel === 3) {
        const reply = intro + complication.orientacionPaciente + '\n\nPor el tipo de síntomas que describes, lo más prudente es que un médico con experiencia en medicina estética te valore directamente.';
        const route: RouteDecision = { route: 'deterministic', reason: 'triage_complication' };
        await maybeLogSession(reply, route);
        return Response.json({ reply });
      }
    }

    // ── CAPA MATERIALES ───────────────────────────────────────
    if (facts.highRiskMaterial) {
      if (facts.dangerSignals.length > 0) {
        const emergencyLine = buildEmergencyLine(effectiveProfile?.country);
        const detectedLine = facts.dangerSignals.length === 1
          ? 'Detecté una señal de alarma: **' + facts.dangerSignals[0] + '**.'
          : 'Detecté señales de alarma: **' + facts.dangerSignals.join(', ') + '**.';
        const reply = intro + detectedLine + '\n\nSi te aplicaron un material de alto riesgo/no autorizado y además hay señales de alarma, lo más prudente es **acudir a urgencias de inmediato** o contactar al médico tratante **ya**.\n\n' + emergencyLine;
        const route: RouteDecision = { route: 'deterministic', reason: 'high_risk_material' };
        await maybeLogSession(reply, route);
        return Response.json({ reply });
      }
      if (facts.materialContext === 'considering') {
        const reply = intro + facts.highRiskMaterial.descripcionPaciente + '\n\nSi te lo están ofreciendo o estás considerando aplicártelo: **no es recomendable**. Los rellenos permanentes/no autorizados (p. ej., "modelantes", "silicona", "aceites", "biopolímeros") se asocian con complicaciones difíciles de manejar y a veces irreversibles.\n\nSi buscas un relleno, lo más seguro es hablar con un médico especialista y preguntar por materiales **autorizados, trazables y reabsorbibles** cuando corresponda.';
        const route: RouteDecision = { route: 'deterministic', reason: 'high_risk_material' };
        await maybeLogSession(reply, route);
        return Response.json({ reply });
      }
      if (facts.materialContext === 'already') {
        const reply = intro + facts.highRiskMaterial.descripcionPaciente + '\n\nSi ya te aplicaron algo de este tipo o sospechas que fue un "relleno permanente/modelante": lo más prudente es **no manipular la zona** y buscar valoración con un médico con experiencia en complicaciones de rellenos.\n\nSi presentas dolor intenso, cambios de color, piel fría, inflamación que progresa rápido, fiebre, secreción, dificultad para respirar o alteraciones visuales, busca atención inmediata.';
        const route: RouteDecision = { route: 'deterministic', reason: 'high_risk_material' };
        await maybeLogSession(reply, route);
        return Response.json({ reply });
      }
    }

    // ── ROUTER → CEREBRO IA ───────────────────────────────────
    const route = decideRoute({
      rawMessage, hasDefinitionHit,
      definitionIntent: facts.definitionIntent,
      material: facts.materialForRouting,
      materialContext: facts.materialContext,
      sessionDomain,
    });

    if (route.route === 'brain') {
      const intent = detectGranularIntent(rawMessage);
      const contextPack = buildContextPack({
        profile: effectiveProfile,
        materialsFound: facts.materialsFound,
        materialContext: facts.materialContext,
        dangerSignals: facts.dangerSignals,
        procedureCtx: facts.procedureCtx,
        definitionIntent: facts.definitionIntent,
        route,
      });

      const sessionMemory = await loadSessionMemory(uid, sessionId ?? '');

      const stream = await callBrain({
        userMessage: rawMessage, history, mode,
        profile: effectiveProfile, intro,
        contextPack, closingSuffix,
        intent, sessionMemory,
      });

      const [streamForClient, streamForLog] = stream.tee();

      resolveStream(streamForLog)
        .then((fullReply) => maybeLogSession(fullReply, route))
        .catch((e) => console.error('Log session error:', e));

      return new Response(streamForClient, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
          'X-Accel-Buffering': 'no',
        },
      });
    }

    // ── FALLBACK ──────────────────────────────────────────────
    const mainText = lower.includes('gracias') || lower.includes('muchas gracias')
      ? 'Gracias a ti por confiar en DrBeautyBot 💜. Siempre que tengas dudas sobre tratamientos estéticos, puedo ayudarte a entender mejor los conceptos y los posibles riesgos, pero recuerda que la decisión final y la valoración detallada siempre deben hacerse con tu médico.'
      : 'En medicina estética es muy importante equilibrar expectativas, seguridad y evidencia científica. Puedo ayudarte a entender conceptos generales y a identificar señales de alerta. Si puedes contarme un poco más de qué tratamiento o zona quieres hablar, podré orientarte de forma más específica.';

    const reply = intro + mainText;
    await maybeLogSession(reply, route.route === 'general' ? route : { route: 'general', reason: 'fallback' });
    return Response.json({ reply });

  } catch (error) {
    console.error('Error en /api/chat:', error);
    return Response.json({
      reply: 'Ha ocurrido un problema al procesar tu mensaje. Intenta de nuevo en unos minutos o revisa tu conexión. Si tienes síntomas que te preocupan, prioriza contactar directamente a tu médico o a un servicio de urgencias.',
    }, { status: 500 });
  }
}