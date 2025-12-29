// app/api/chat/route.ts

/*
  CHANGELOG — 2025-12-13
  - Se agregó "intención de definición" para que CAPA DEFINICIONES responda también a mensajes tipo:
    "ptosis", "ptosis?", "hialuronidasa", "biofilm", "vision borrosa", "acido hialuronico" (corto).
  - ✅ Opción 1 (mínimo cambio, conservador): permitir 2 tokens aunque no haya "?" SOLO si el mensaje es corto.
  - Triage guard: "definición pura" ahora reconoce intención de definición (no solo "qué es").
  - QualityEvent: evita contar danger_signal cuando el mensaje era intención de definición (reducción de falsos positivos en logging).
*/

/*
  CHANGELOG — 2025-12-15
  - ✅ Fix Firestore counts (robusto):
    - Evitamos usar keys con puntos dentro de tx.set (p.ej. 'counts.totalMessages'), porque crea campos literales.
    - Solución: usar tx.set({ counts: { totalMessages: FieldValue.increment(1) } }, { merge:true }) con objeto anidado.
  - ✅ Router (mínimo y seguro):
    - "Detección" (material/definición) ≠ "Resolución".
    - Solo resolvemos sin IA: urgencias/triage crítico, definiciones puras, material alto riesgo con contexto.
    - Preguntas complejas (timing, comparativas, riesgos amplios, “plan/decisión”) -> cerebro IA.
  - ✅ Integración OpenAI (SDK oficial):
    - Se llama a OpenAI SOLO cuando el router decide "brain".
    - Contexto determinístico (material detectado, señales, perfil, etc.) se pasa como “context pack”.
    - Requiere: `npm i openai` y `OPENAI_API_KEY` en .env.local
  - ✅ Multi-material:
    - Se detectan hasta 3 materiales con findMaterialsInMessage().
    - High-risk estricto: si aparece cualquier material alto riesgo, se prioriza para routing/logging/respuesta determinística.
  - ✅ Fix buildContextPack:
    - Ahora recibe materialsFound por parámetro (sin variables fuera de scope).
  - ✅ Micro-refactor:
    - Se centraliza el cálculo de contexto del mensaje (dangerSignals, materialsFound, etc.) para evitar recalcular.
    - classifyQualityEvent puede reutilizar contexto precomputado (menos duplicación / menos bugs).
*/

/*
  CHANGELOG — 2025-12-17
  - ✅ Cerco temático (solo medicina estética):
    - Se añaden listas simples de ESTHETIC_KEYWORDS y OFFTOPIC_KEYWORDS.
    - Si el mensaje parece claramente de otro tema (contratos, programación, finanzas, etc.) y NO menciona estética,
      se responde con un mensaje fijo explicando que DrBeautyBot solo trata medicina estética (sin llamar al cerebro IA).
    - Si el mensaje es muy general/ambiguo (sin estética ni off-topic claro), se pide que especifique zona o tratamiento
      estético antes de seguir (también sin llamar al cerebro IA).
    - Mensajes con señales de alarma o materiales de alto riesgo se saltan este cerco para priorizar seguridad.
  - ✅ isSmallTalk refinado:
    - Ahora considera OFFTOPIC_KEYWORDS para que "hola + contrato / javascript / impuestos" NO se trate como small talk.
*/

/*
  CHANGELOG — 2025-12-22
  - ✅ buildIntro se simplifica para NO añadir saludos ni nombre/área en cada respuesta del backend.
    La bienvenida personalizada vive solo en el frontend (primer mensaje del chat).
  - ✅ domainHint por sesión (chat_sessions.domainHint = 'unknown' | 'esthetic' | 'offtopic'):
    - Cuando la conversación ya es claramente de medicina estética, marcamos domainHint = 'esthetic'.
  - ✅ Cerco temático contextual:
    - Si domainHint = 'esthetic', las respuestas cortas tipo "solo la punta", "en labios" o "me gustaría subir la punta nasal"
      ya no disparan el mensaje de "necesito que sea de medicina estética", salvo que el texto sea claramente de otro tema.
  - ✅ isSmallTalk ahora acepta sessionDomain:
    - En sesiones estéticas no trata como small talk los mensajes muy cortos si no son saludos/agradecimientos puros.
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

// Importante: firebase-admin requiere runtime nodejs (no edge)
export const runtime = 'nodejs';

/**
 * ✅ OpenAI client (server-side)
 * Modelo configurable por env:
 * - DRBEAUTYBOT_MODEL (default: 'gpt-5')
 */
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const BRAIN_MODEL = process.env.DRBEAUTYBOT_MODEL ?? 'gpt-5';

// Perfil que viene desde el frontend (lo que guardamos en localStorage)
interface StoredProfile {
  name?: string;
  ageRange?: string;
  country?: string;
  area?: string;
  interests?: string[];
  previousProcedures?: string[];
  isPregnant?: boolean;
}

// Body esperado
interface ChatRequestBody {
  message: string;
  mode?: string | null;
  profile?: StoredProfile | null;

  // Agrupa conversación en 1 doc (por pestaña / “tab”)
  sessionId?: string | null;
}

// Dominio temático de la sesión
type SessionDomain = 'unknown' | 'esthetic' | 'offtopic';

// Etiquetas bonitas para el área de interés (se usan solo en frontend ahora)
const areaLabels: Record<string, string> = {
  'rostro-general': 'rostro en general',
  toxina: 'toxina botulínica',
  rellenos: 'fillers / rellenos',
  labios: 'labios',
  laser: 'láser / manchas / depilación',
  'cicatrices-acne': 'cicatrices de acné',
  otros: 'otros tratamientos estéticos',
};

// ✅ Palabras clave de dominio (cerco temático)
const ESTHETIC_KEYWORDS = [
  'medicina estetica',
  'estetica',
  'estetico',
  'esteticos',
  'clinica estetica',
  'clinica de belleza',
  'relleno',
  'rellenos',
  'acido hialuronico',
  'hialuronico',
  'hialuronato',
  'botox',
  'toxina',
  'toxina botulinica',
  'labios',
  'labio',
  'codigo de barras',
  'surco nasogeniano',
  'patas de gallo',
  'frente',
  'entrecejo',
  'ojeras',
  'ojera',
  'manchas',
  'melasma',
  'acne',
  'cicatriz',
  'cicatrices',
  'poros',
  'flacidez',
  'papada',
  'perfilado',
  'rinomodelacion',
  'nariz',
  'menton',
  'pómulo',
  'pomulo',
  'biopolimeros',
  'biopolimero',
  'aceite mineral',
  'silicona',
  'hidroxiapatita',
  'caha',
  'radiesse',
  'laser',
  'ipl',
  'luz pulsada',
  'depilacion laser',
  'depilacion',
  'peeling',
  'hifu',
  'radiofrecuencia',
  'mesoterapia',
  'carboxiterapia',
  'hilos tensores',
  'hilos',
];

const OFFTOPIC_KEYWORDS = [
  // Legal / contratos
  'contrato',
  'arrendamiento',
  'renta',
  'alquiler',
  'hipoteca',
  'prestamo',
  'pagare',
  'pagaré',
  'factura',
  'notario',
  'juicio',
  'demanda',
  'divorcio',
  'custodia',
  // Finanzas / impuestos
  'impuesto',
  'impuestos',
  'sat',
  'hacienda',
  'deuda',
  'tarjeta de credito',
  'credito',
  'credito hipotecario',
  'banco',
  'inversion',
  'criptomoneda',
  'bitcoin',
  'cripto',
  // Programación / tech
  'javascript',
  'python',
  'java ',
  'typescript',
  'react',
  'nextjs',
  'nodejs',
  'firebase',
  'programacion',
  'programación',
  'codigo',
  'código',
  'frontend',
  'backend',
  'base de datos',
  'sql',
  'api ',
  'servidor',
  // Tareas / academia
  'tarea',
  'examen',
  'resumen',
  'ensayo',
  'monografia',
  'monografía',
  // Marketing genérico
  'marketing',
  'seo',
  'facebook ads',
  'google ads',
  'tiktok ads',
  'campaña publicitaria',
  'publicidad',
  'anuncio',
];

// Cierre de seguridad (lo quitamos en quick para evitar redundancia con la cinta amarilla)
const CLOSING =
  'Esta información es orientativa y no sustituye una valoración médica presencial u online. ' +
  'No debe usarse para diagnóstico, prescripción ni decisiones de tratamiento sin consultar a un profesional de la salud.';

/**
 * ✅ buildIntro:
 * - 2025-12-22: ya no añade saludos ni nombre/área; el saludo personalizado vive en el frontend.
 * - Se mantiene como función por si en el futuro se requiere un prefijo muy corto/contextual.
 */
function buildIntro(_mode: string | null | undefined, _profile?: StoredProfile | null): string {
  return '';
}

/**
 * Detecta si el mensaje sugiere:
 * - "considering": se lo ofrecen / lo quiere / está pensando hacerlo
 * - "already": ya se lo aplicaron / ya lo tiene / antecedente
 * - "unknown": no se sabe
 */
type MaterialContext = 'considering' | 'already' | 'unknown';

/**
 * ✅ Tipos helper para multi-material
 */
type MaterialsFound = ReturnType<typeof findMaterialsInMessage>;
type MaterialHit = MaterialsFound[number];

/**
 * ✅ Elige el primer material alto riesgo si existe (listaNegra o riesgo >= 4)
 */
function pickHighRiskMaterial(materialsFound: MaterialsFound): MaterialHit | null {
  return materialsFound.find((m) => Boolean(m.listaNegra) || m.nivelRiesgo >= 4) ?? null;
}

function inferMaterialContext(message: string): MaterialContext {
  const text = normalizeText(message);

  const alreadyKeywords = [
    'me puse',
    'me lo puse',
    'me inyectaron',
    'me inyecte',
    'me aplique',
    'me aplicaron',
    'ya me puse',
    'ya me lo puse',
    'ya me inyectaron',
    'ya me aplicaron',
    'tengo',
    'traigo',
    'desde hace',
    'hace',
    'me hicieron',
    'me pusieron',
    'me lo pusieron',
  ];

  const consideringKeywords = [
    'quiero',
    'me quiero',
    'pienso',
    'estoy pensando',
    'me ofrecen',
    'me ofrecieron',
    'me recomendaron',
    'me recomiendan',
    'me sugirieron',
    'me sugieren',
    'me lo voy a poner',
    'me lo pondre',
    'me lo pondria',
    'me lo pongo',
    'cotice',
    'cotizar',
  ];

  const alreadyHit = alreadyKeywords.some((k) => text.includes(k));
  const consideringHit = consideringKeywords.some((k) => text.includes(k));

  if (alreadyHit) return 'already';
  if (consideringHit) return 'considering';
  return 'unknown';
}

/**
 * ✅ Señales de alarma (matching robusto usando matchKeywordNormalized)
 */
function detectDangerSignals(message: string): string[] {
  const textNorm = normalizeText(message);
  const textTokens = tokenizeNormalized(textNorm);

  type Rule = { label: string; priority: number; keywords: string[] };

  const rules: Rule[] = [
    {
      label: 'alteraciones visuales',
      priority: 100,
      keywords: [
        'vision borrosa',
        'vista borrosa',
        'veo borroso',
        'veo borrosa',
        'no veo',
        'perdi vision',
        'perdida de vision',
        'ceguera',
        'se me nubla la vision',
        'se me nubla',
        'borroso',
        'borrosa',
      ],
    },
    {
      label: 'dificultad para respirar o dolor/opresión en el pecho',
      priority: 95,
      keywords: [
        'dificultad para respirar',
        'falta de aire',
        'me ahogo',
        'opresion en el pecho',
        'dolor en el pecho',
        'pecho apretado',
      ],
    },
    {
      label: 'cambios de color en la piel (palidez/morado/negro)',
      priority: 90,
      keywords: ['palido', 'palida', 'morado', 'violaceo', 'negro', 'cambio de color'],
    },
    {
      label: 'piel fría o entumecimiento',
      priority: 85,
      keywords: ['piel fria', 'entumecimiento', 'hormigueo', 'adormecimiento'],
    },
    {
      label: 'dolor intenso',
      priority: 80,
      keywords: ['dolor intenso', 'dolor fuerte', 'dolor insoportable'],
    },
    {
      label: 'ampollas o necrosis',
      priority: 78,
      keywords: ['ampolla', 'ampollas', 'necrosis'],
    },
    {
      label: 'fiebre o datos de infección (secreción/pus)',
      priority: 75,
      keywords: ['fiebre', 'pus', 'secrecion'],
    },
    {
      label: 'inflamación que progresa rápido',
      priority: 70,
      keywords: ['inflamacion rapida', 'empeora rapido', 'hinchazon rapida', 'aumento rapido'],
    },
    {
      label: 'mareo o desmayo',
      priority: 60,
      keywords: ['mareo', 'desmayo'],
    },
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

/**
 * ✅ Contexto post-procedimiento
 */
function inferProcedureContext(message: string): {
  likelyPostProcedure: boolean;
  hasInjectionVerb: boolean;
  hasEnergyDeviceHint: boolean;
} {
  const t = normalizeText(message);

  const injectionVerbs = [
    'me inyectaron',
    'me inyecte',
    'me aplicaron',
    'me aplique',
    'me pusieron',
    'me puse',
    'me lo pusieron',
    'me lo aplicaron',
    'me realizaron',
    'me hice',
  ];

  const energyHints = ['laser', 'ipl', 'luz pulsada', 'radiofrecuencia', 'hifu'];

  const hasInjectionVerb = injectionVerbs.some((k) => t.includes(k));
  const hasEnergyDeviceHint = energyHints.some((k) => t.includes(k));

  const likelyPostProcedure = hasInjectionVerb || hasEnergyDeviceHint;
  return { likelyPostProcedure, hasInjectionVerb, hasEnergyDeviceHint };
}

/**
 * ✅ Small talk mejorado
 * - Saludos + nada médico → small talk
 * - Si mezcla saludo + keyword de estética/síntomas u off-topic claro → NO es small talk
 * - 2025-12-22: si la sesión ya es estética, mensajes muy cortos sin keywords NO se tratan como small talk
 *   (para permitir follow-ups tipo "solo la punta", "en labios").
 */
function isSmallTalk(message: string, opts?: { sessionDomain?: SessionDomain }): boolean {
  const t = normalizeText(message);
  const sessionDomain: SessionDomain = opts?.sessionDomain ?? 'unknown';

  const greetingRegex = /^(hola|holi|buenas|buenos dias|buenas tardes|buenas noches)\b/;
  const hasGreeting = greetingRegex.test(t);

  const otherChatterPatterns: RegExp[] = [
    /\b(como estas|que tal|todo bien|todo bn|todo ok)\b/,
    /\b(gracias|muchas gracias)\b/,
  ];

  // Palabras que indican que ya no es “small talk tonto”
  const importantKeywords = [
    'botox',
    'toxina',
    'acido',
    'hialuron',
    'biopol',
    'silicona',
    'relleno',
    'hidroxiapatita',
    'caha',
    'radiesse',
    'laser',
    'ipl',
    'luz pulsada',
    'peeling',
    'hifu',
    'radiofrecuencia',
    'dolor',
    'vision',
    'visión',
    'fiebre',
  ];

  const hasImportantKeyword = importantKeywords.some((kw) => t.includes(kw));
  const hasOffTopicKeyword = OFFTOPIC_KEYWORDS.some((kw) => t.includes(kw));

  // Si es saludo + keyword médica o saludo + off-topic claro → NO small talk
  if (hasGreeting && (hasImportantKeyword || hasOffTopicKeyword)) {
    return false;
  }

  const looksLikeChitChat = hasGreeting || otherChatterPatterns.some((r) => r.test(t));

  if (looksLikeChitChat) return true;

  // Mensajes MUY cortos sin keywords se consideran small talk,
  // excepto si la sesión ya fue clasificada como estética.
  const veryShort = t.length <= 20;
  if (veryShort) {
    if (sessionDomain === 'esthetic') return false;
    return !hasImportantKeyword && !hasOffTopicKeyword;
  }

  return false;
}

/**
 * ✅ Preguntas de definición explícitas
 */
function isDefinitionQuestion(message: string): boolean {
  const t = normalizeText(message);
  return /\b(q|que)\s+(significa|es)\b/.test(t) || /\b(definicion|define|significado\s+de)\b/.test(t);
}

/**
 * ✅ Reporte de síntoma real (vs mención teórica)
 */
function isSymptomReport(message: string): boolean {
  const t = normalizeText(message);

  const symptomVerbs = [
    'tengo',
    'me pasa',
    'me paso',
    'me duele',
    'me arde',
    'me siento',
    'siento',
    'presento',
    'empece',
    'ahora',
    'desde',
    'me dejo',
    'veo',
    'no veo',
    'se me nubla',
    'se me nubl',
  ];

  return symptomVerbs.some((k) => t.includes(k));
}

/**
 * ✅ Heurística súper conservadora: "término suelto" que probablemente busca definición.
 */
function looksLikeBareTermDefinitionQuery(message: string): boolean {
  const raw = (message ?? '').trim();
  if (!raw) return false;

  // Hard cap de longitud
  if (raw.length > 26) return false;

  const norm = normalizeText(raw);
  const tokens = tokenizeNormalized(norm);

  if (tokens.length === 0) return false;
  if (tokens.length > 2) return false;

  // ✅ permitir 2 tokens SOLO si es corto
  if (tokens.length === 2 && raw.length > 22) return false;

  // ✅ En vez de isSmallTalk(raw), solo bloquea small talk “real” (saludos/gracias)
  const smallTalkHard: RegExp[] = [
    /^(hola|holi|buenas|buenos dias|buenas tardes|buenas noches)\b/,
    /\b(como estas|que tal|todo bien|todo bn|todo ok)\b/,
    /\b(gracias|muchas gracias)\b/,
  ];
  if (smallTalkHard.some((r) => r.test(norm))) return false;

  // ✅ Si reporta síntoma real, no es “definición pura”
  if (isSymptomReport(raw)) return false;

  // ✅ Si parece post-procedimiento, no es definición pura
  const ctx = inferProcedureContext(raw);
  if (ctx.likelyPostProcedure) return false;

  return true;
}

/**
 * ✅ Intención de definición = explícita ("qué es") OR término suelto corto.
 */
function isDefinitionIntent(message: string): boolean {
  return isDefinitionQuestion(message) || looksLikeBareTermDefinitionQuery(message);
}

/**
 * ✅ Router: detectar complejidad / “plan o decisión”
 */
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

/**
 * ✅ Evento de calidad
 */
type QualityEvent =
  | { kind: 'complication'; id: string; severity: number; urgent: boolean }
  | {
      kind: 'material';
      id: string;
      risk: number;
      blacklisted: boolean;
      urgent: boolean;
      context: MaterialContext;
      dangerSignals: string[];
    }
  | { kind: 'danger_signal'; urgent: true; dangerSignals: string[]; pseudoSeverity: 4 }
  | { kind: 'none'; reason: 'small_talk' | 'general' };

/**
 * ✅ Micro-refactor: permite reutilizar contexto precomputado (si lo pasas desde POST)
 */
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

  // Preferimos loguear el alto riesgo si existe; si no, el primer match.
  const material = highRiskMaterial ?? materialsFound[0] ?? null;

  if (material) {
    const isHighRisk = Boolean(material.listaNegra) || material.nivelRiesgo >= 4;
    const context = args.materialContext ?? inferMaterialContext(message);

    // ✅ Reusa dangerSignals ya calculadas si las tenemos
    const dangerSignals = isHighRisk ? args.dangerSignals ?? detectDangerSignals(message) : [];
    const urgent = isHighRisk && dangerSignals.length > 0;

    return {
      kind: 'material',
      id: material.id,
      risk: material.nivelRiesgo,
      blacklisted: Boolean(material.listaNegra),
      urgent,
      context,
      dangerSignals,
    };
  }

  // ✅ Importante: NO contamos danger_signal si era intención de definición
  const defIntent = args.definitionIntent ?? isDefinitionIntent(message);
  if (!defIntent) {
    const dangerSignals = args.dangerSignals ?? detectDangerSignals(message);
    if (dangerSignals.length > 0) return { kind: 'danger_signal', urgent: true, dangerSignals, pseudoSeverity: 4 };
  }

  return { kind: 'none', reason: 'general' };
}

/**
 * ✅ “1 doc por sesión” en chat_sessions
 * Telemetría simple:
 * - lastRoute / lastRouteReason
 * - counts.brainCalls / counts.definitionResponses / counts.deterministicResponses
 * - domainHint: 'unknown' | 'esthetic' | 'offtopic'
 */
async function upsertSessionLog(params: {
  sessionId: string;
  mode: string | null;
  profileSnapshot: StoredProfile | null;
  userText: string;
  botText: string;
  qualityEvent: QualityEvent;
  route: RouteDecision;
}) {
  const { sessionId, mode, profileSnapshot, userText, botText, qualityEvent, route } = params;

  const ref = adminDb.collection('chat_sessions').doc(sessionId);

  const COOLDOWN_MS = 15_000;

  const nowMs = Date.now();
  const userPreview = userText.slice(0, 220);
  const botPreview = botText.slice(0, 220);

  const lowerUser = normalizeText(userText);
  const userHasEstheticKeyword = ESTHETIC_KEYWORDS.some((kw) => lowerUser.includes(kw));

  // Candidato a nuevo dominio
  let newDomainHint: SessionDomain | null = null;
  if (userHasEstheticKeyword) {
    if (route.route === 'brain' || route.route === 'deterministic') {
      newDomainHint = 'esthetic';
    }
    if (route.route === 'general' && route.reason === 'fallback') {
      newDomainHint = 'esthetic';
    }
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

    const prevDomain: SessionDomain =
      data?.domainHint === 'esthetic' || data?.domainHint === 'offtopic' ? data.domainHint : 'unknown';
    const domainHintToStore: SessionDomain = newDomainHint ?? prevDomain;

    // ✅ Upsert base + counts sin keys con puntos
    if (!snap.exists) {
      tx.set(
        ref,
        {
          createdAt: serverTimestamp(),
          projectId: adminProjectId ?? null,
          mode: mode ?? null,
          profileSnapshot: profileSnapshot ?? null,
          lastActiveAt: serverTimestamp(),

          domainHint: domainHintToStore,

          counts: {
            totalMessages: 1,
            loggedEvents: 0,
            triageEvents: 0,
            materialEvents: 0,
            urgentEvents: 0,

            brainCalls: route.route === 'brain' ? 1 : 0,
            deterministicResponses: route.route === 'deterministic' ? 1 : 0,
            definitionResponses: route.route === 'deterministic' && route.reason === 'definition' ? 1 : 0,
          },

          highestSeveritySeen: 0,
          seenComplicationIds: [],
          seenMaterialIds: [],
          urgentSignalsSeen: [],
          seenDangerKeys: [],

          lastLoggedAtMs: null,
          lastLoggedEventKey: null,
          lastImportantAt: null,

          lastUserPreview: null,
          lastBotPreview: null,
          lastImportantSummary: null,

          lastRoute: route.route,
          lastRouteReason: route.reason,
        },
        { merge: true }
      );
    } else {
      const countsUpdate: Record<string, unknown> = {
        totalMessages: FieldValue.increment(1),
      };

      if (route.route === 'brain') countsUpdate.brainCalls = FieldValue.increment(1);
      if (route.route === 'deterministic') {
        countsUpdate.deterministicResponses = FieldValue.increment(1);
        if (route.reason === 'definition') countsUpdate.definitionResponses = FieldValue.increment(1);
      }

      tx.set(
        ref,
        {
          projectId: adminProjectId ?? null,
          mode: mode ?? null,
          profileSnapshot: profileSnapshot ?? null,
          lastActiveAt: serverTimestamp(),
          lastRoute: route.route,
          lastRouteReason: route.reason,
          domainHint: domainHintToStore,
          counts: countsUpdate,
        },
        { merge: true }
      );
    }

    if (qualityEvent.kind === 'none') return;

    // ✅ eventKey
    let eventKey = '';
    if (qualityEvent.kind === 'complication') {
      eventKey = `complication:${qualityEvent.id}:sev${qualityEvent.severity}:urgent${qualityEvent.urgent ? 1 : 0}`;
    } else if (qualityEvent.kind === 'material') {
      eventKey = `material:${qualityEvent.id}:risk${qualityEvent.risk}:blk${qualityEvent.blacklisted ? 1 : 0}:urgent${
        qualityEvent.urgent ? 1 : 0
      }:ctx${qualityEvent.context}`;
    } else if (qualityEvent.kind === 'danger_signal') {
      eventKey = `danger:${qualityEvent.dangerSignals.join('|')}`;
    }

    // ✅ cooldown
    if (lastLoggedAtMs != null && lastLoggedEventKey === eventKey) {
      if (nowMs - lastLoggedAtMs < COOLDOWN_MS) {
        tx.set(ref, { lastLoggedAtMs: nowMs }, { merge: true });
        return;
      }
    }

    // ✅ dedupe
    let shouldCountAsNew = true;

    if (qualityEvent.kind === 'complication') {
      if (prevSeenComp.includes(qualityEvent.id)) shouldCountAsNew = false;
    }

    if (qualityEvent.kind === 'material') {
      const isHighRisk = qualityEvent.blacklisted || qualityEvent.risk >= 4;

      if (isHighRisk) {
        if (prevSeenMat.includes(qualityEvent.id)) shouldCountAsNew = false;
      } else {
        const allowedContext = qualityEvent.context === 'considering' || qualityEvent.context === 'already';
        if (!allowedContext) shouldCountAsNew = false;
        if (prevSeenMat.includes(qualityEvent.id)) shouldCountAsNew = false;
      }
    }

    if (qualityEvent.kind === 'danger_signal') {
      if (prevSeenDanger.includes(eventKey)) shouldCountAsNew = false;
    }

    if (!shouldCountAsNew) {
      tx.set(ref, { lastLoggedAtMs: nowMs, lastLoggedEventKey: eventKey }, { merge: true });
      return;
    }

    // ✅ updates (sin keys con puntos)
    const countsInc: Record<string, unknown> = {
      loggedEvents: FieldValue.increment(1),
    };

    const updates: Record<string, unknown> = {
      lastLoggedAtMs: nowMs,
      lastLoggedEventKey: eventKey,
      lastImportantAt: serverTimestamp(),
      lastUserPreview: userPreview,
      lastBotPreview: botPreview,
      counts: countsInc,
    };

    if (qualityEvent.kind === 'complication') {
      countsInc.triageEvents = FieldValue.increment(1);
      if (qualityEvent.urgent) countsInc.urgentEvents = FieldValue.increment(1);

      updates.seenComplicationIds = FieldValue.arrayUnion(qualityEvent.id);
      updates.highestSeveritySeen = Math.max(prevHighest, qualityEvent.severity);
      updates.lastImportantSummary = `Triage: ${qualityEvent.id} (sev ${qualityEvent.severity})${
        qualityEvent.urgent ? ' [URGENTE]' : ''
      }`;
    }

    if (qualityEvent.kind === 'material') {
      countsInc.materialEvents = FieldValue.increment(1);
      if (qualityEvent.urgent) countsInc.urgentEvents = FieldValue.increment(1);

      updates.seenMaterialIds = FieldValue.arrayUnion(qualityEvent.id);

      if (qualityEvent.urgent && qualityEvent.dangerSignals?.length) {
        updates.urgentSignalsSeen = FieldValue.arrayUnion(...qualityEvent.dangerSignals);
      }

      updates.lastImportantSummary =
        `Material: ${qualityEvent.id} (risk ${qualityEvent.risk})` +
        (qualityEvent.blacklisted ? ' [LISTA NEGRA]' : '') +
        (qualityEvent.urgent ? ` [ALERTA: ${qualityEvent.dangerSignals.join(', ')}]` : '') +
        ` (ctx: ${qualityEvent.context})`;
    }

    if (qualityEvent.kind === 'danger_signal') {
      countsInc.triageEvents = FieldValue.increment(1);
      countsInc.urgentEvents = FieldValue.increment(1);

      updates.seenDangerKeys = FieldValue.arrayUnion(eventKey);

      if (qualityEvent.dangerSignals?.length) {
        updates.urgentSignalsSeen = FieldValue.arrayUnion(...qualityEvent.dangerSignals);
      }

      updates.highestSeveritySeen = Math.max(prevHighest, qualityEvent.pseudoSeverity);
      updates.lastImportantSummary = `Señales de alarma: ${qualityEvent.dangerSignals.join(', ')} [URGENTE]`;
    }

    tx.set(ref, updates, { merge: true });
  });
}

/**
 * ✅ Emergencias por país si está disponible
 */
function buildEmergencyLine(countryName?: string) {
  const emergency = countryName ? findEmergencyNumber(countryName) : null;
  return emergency
    ? `En ${emergency.countryName}, el número principal de emergencias es: ${emergency.emergencyNumber}.`
    : 'Si estás en México, el número general de emergencias es el 911; en otros países, usa el número de emergencias local.';
}

/**
 * ✅ System prompt del “cerebro IA”
 */
function buildBrainSystemPrompt(args: { mode: string | null }): string {
  const { mode } = args;

  const quickNote =
    mode === 'quick'
      ? 'Estás en modo consulta rápida: mantén la respuesta relativamente breve (aprox. 150–230 palabras), con párrafos cortos y aire entre ideas. No repitas avisos legales largos (el sistema los añade aparte).'
      : '';

  return (
    'Eres DrBeautyBot, un asistente informativo de medicina estética en español. ' +
    'Prioridad absoluta: seguridad del usuario. NO diagnostiques. NO prescribas. ' +
    'NO des instrucciones peligrosas u operativas de procedimientos (puntos, dosis, técnica de inyección, cómo aplicarlo). ' +
    'Si el usuario describe señales de alarma (alteraciones visuales, dificultad para respirar/dolor u opresión en el pecho, necrosis, piel fría con cambio de color, dolor intenso desproporcionado, fiebre con pus, desmayo), indica valoración médica urgente/urgencias y que contacte a su médico tratante. ' +
    // Tono y estilo
    'Tono: humano, amigable, calmado y no alarmista; explica de forma sencilla, con frases cortas y ejemplos/analogías muy fáciles de entender. Escribe como si conversarás con la persona, no como un informe académico. ' +
    // Formato de respuesta pero sin numeritos ni títulos rígidos
    'Estructura tu respuesta de manera natural, sin numerar secciones ni usar encabezados como "1)", "2)" o "Resumen:". ' +
    'Usa párrafos cortos y deja una línea en blanco entre bloques importantes. Cuando tenga sentido, usa listas con guiones "-" para enumerar riesgos o puntos clave. ' +
    // Qué contenido incluir (pero descrito como guía interna)
    'Al responder a dudas sobre un tratamiento o síntoma: ' +
    '- Empieza con una idea-resumen en una o dos frases, escrita de forma natural. ' +
    '- Después, ofrece una explicación simple (puedes usar un ejemplo cotidiano si ayuda). ' +
    '- Luego, comenta los riesgos/limitaciones principales y lo importante a vigilar, preferentemente como una lista breve con guiones. ' +
    '- Si aplica, menciona de forma clara las posibles señales de alarma médicas y qué debería hacer la persona (por ejemplo, acudir a urgencias o contactar a su médico). ' +
    '- Termina, si faltan datos clave, con 1–3 preguntas concretas, formuladas de forma cercana (por ejemplo: "Para ubicar mejor tu caso, ¿me cuentas…?"). ' +
    // Recordatorio de brevedad y de no sobreavisar
    'Evita respuestas excesivamente largas, no repitas la misma idea muchas veces y no recargues de advertencias si ya has explicado los riesgos y las señales de alarma una vez. ' +
    quickNote
  );
}

/**
 * ✅ Context pack para IA (RAG-lite determinístico)
 */
function buildContextPack(args: {
  profile: StoredProfile | null;
  materialsFound: MaterialsFound;
  materialContext: MaterialContext;
  dangerSignals: string[];
  procedureCtx: ReturnType<typeof inferProcedureContext>;
  definitionIntent: boolean;
  route: RouteDecision;
}): string {
  const { profile, materialsFound, materialContext, dangerSignals, procedureCtx, definitionIntent, route } = args;

  const profileLine = profile
    ? `Perfil: name=${profile.name ?? 'N/A'}, ageRange=${profile.ageRange ?? 'N/A'}, country=${profile.country ?? 'N/A'}, area=${
        profile.area ?? 'N/A'
      }, isPregnant=${profile.isPregnant ?? 'N/A'}`
    : 'Perfil: null (modo quick o sin perfil)';

  const highRisk = pickHighRiskMaterial(materialsFound);

  const materialLine =
    materialsFound.length > 0
      ? `Materiales detectados: ` +
        materialsFound
          .map(
            (m) =>
              `id=${m.id}, nombre=${m.nombre}, categoria=${m.categoria}, riesgo=${m.nivelRiesgo}, listaNegra=${m.listaNegra ? 'true' : 'false'}`
          )
          .join(' | ') +
        `, highRisk=${highRisk ? highRisk.id : 'none'}, contexto=${materialContext}`
      : 'Materiales detectados: null';

  const dangerLine =
    dangerSignals.length > 0
      ? `Señales de alarma detectadas (no necesariamente urgencia): ${dangerSignals.join(', ')}`
      : 'Señales de alarma detectadas: none';

  const procLine = `Contexto post-procedimiento: likely=${procedureCtx.likelyPostProcedure ? 'true' : 'false'}`;
  const defLine = `Intención de definición: ${definitionIntent ? 'true' : 'false'}`;
  const routeLine = `Router: route=${route.route}, reason=${route.reason}`;

  return [routeLine, profileLine, materialLine, dangerLine, procLine, defLine].join('\n');
}

/**
 * ✅ Llamada al cerebro IA
 */
async function callBrain(args: {
  userMessage: string;
  mode: string | null;
  intro: string;
  contextPack: string;
  closingSuffix: string;
}): Promise<string> {
  const { userMessage, mode, intro, contextPack, closingSuffix } = args;

  if (!process.env.OPENAI_API_KEY) {
    return (
      intro +
      'En este momento no tengo habilitada la conexión al “cerebro IA” (falta OPENAI_API_KEY). ' +
      'Puedo seguir respondiendo con la lógica determinística, pero para preguntas complejas necesito esa integración. ' +
      (mode === 'quick' ? '' : `\n\n${CLOSING}`)
    );
  }

  const system = buildBrainSystemPrompt({ mode });

  const input = [
    {
      role: 'system' as const,
      content:
        system +
        '\n\n' +
        'CONTEXTO DETERMINÍSTICO (para tu referencia; úsalo si ayuda, pero responde a la pregunta concreta):\n' +
        contextPack +
        '\n\n' +
        'INSTRUCCIONES DE RESPUESTA:\n' +
        '- Respuesta informativa (no diagnóstico).\n' +
        '- No des técnica de inyección, puntos, dosis, ni instrucciones operativas.\n' +
        '- Si hay riesgos, explícalos y menciona señales de alarma.\n' +
        '- Si faltan datos, pide 1–3 preguntas.\n',
    },
    { role: 'user' as const, content: userMessage },
  ];

  try {
    const resp = await openai.responses.create({
      model: BRAIN_MODEL,
      input,
    });

    const brainText = (resp as any)?.output_text?.trim?.() ?? '';
    if (!brainText) {
      return (
        intro +
        'Puedo ayudarte con esa duda, pero necesito un poco más de contexto. ' +
        '¿Puedes decirme en qué zona sería el tratamiento, cuál es tu objetivo y si ya te aplicaron algo antes?' +
        closingSuffix
      );
    }

    return `${intro}${brainText}${closingSuffix}`;
  } catch (e) {
    console.error('OpenAI error:', e);
    return (
      intro +
      'Tuve un problema al consultar el “cerebro IA”. Intentemos de nuevo. ' +
      'Si quieres, pega tu pregunta con: zona, objetivo y si ya hubo algún procedimiento previo.' +
      closingSuffix
    );
  }
}

/**
 * ✅ Micro-refactor: centraliza el cálculo de contexto para evitar recalcular en varias capas
 */
function buildMessageFacts(message: string) {
  const dangerSignals = detectDangerSignals(message);
  const procedureCtx = inferProcedureContext(message);
  const definitionIntent = isDefinitionIntent(message);
  const symptomReport = isSymptomReport(message);

  const materialsFound = findMaterialsInMessage(message, 3);
  const material = materialsFound[0] ?? null;
  const highRiskMaterial = pickHighRiskMaterial(materialsFound);
  const materialContext: MaterialContext = materialsFound.length > 0 ? inferMaterialContext(message) : 'unknown';

  // Para routing: si hay alguno de alto riesgo, ese manda.
  const materialForRouting = highRiskMaterial ?? material;

  const hasVision = dangerSignals.includes('alteraciones visuales');
  const hasBreathingChest = dangerSignals.includes('dificultad para respirar o dolor/opresión en el pecho');

  return {
    dangerSignals,
    procedureCtx,
    definitionIntent,
    symptomReport,
    materialsFound,
    material,
    highRiskMaterial,
    materialContext,
    materialForRouting,
    hasVision,
    hasBreathingChest,
  };
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as ChatRequestBody;
    const rawMessage = body.message?.trim();

    if (!rawMessage) {
      return Response.json({ error: 'Mensaje vacío' }, { status: 400 });
    }

    const lower = normalizeText(rawMessage);
    const mode = body.mode ?? null;
    const profile = body.profile ?? null;
    const sessionId = body.sessionId ?? null;

    const effectiveProfile = mode === 'quick' ? null : profile;
    const closingSuffix = mode === 'quick' ? '' : `\n\n${CLOSING}`;
    const intro = buildIntro(mode, effectiveProfile);

    // ✅ DomainHint de la sesión (si existe)
    let sessionDomain: SessionDomain = 'unknown';
    if (sessionId) {
      try {
        const snap = await adminDb.collection('chat_sessions').doc(sessionId).get();
        const data = (snap.exists ? snap.data() : undefined) as any;
        const d = data?.domainHint;
        if (d === 'esthetic' || d === 'offtopic') {
          sessionDomain = d;
        }
      } catch (e) {
        console.error('Error leyendo domainHint de chat_sessions:', e);
      }
    }

    // ✅ Contexto centralizado (micro-refactor)
    const facts = buildMessageFacts(rawMessage);

    /**
     * ✅ Cerco temático: solo medicina estética (después de facts para respetar urgencias)
     * - No se aplica si hay señales de alarma relevantes o material de alto riesgo (prioridad seguridad).
     * - No se aplica a small talk puro.
     * - 2025-12-22: si la sesión ya es estética, solo bloqueamos mensajes claramente off-topic.
     */
    const looksEmergencyLike = facts.dangerSignals.length > 0 || Boolean(facts.highRiskMaterial);
    const isMsgSmallTalk = isSmallTalk(rawMessage, { sessionDomain });

    if (!looksEmergencyLike && !isMsgSmallTalk) {
      const hasEstheticKeyword = ESTHETIC_KEYWORDS.some((kw) => lower.includes(kw));
      const hasOffTopicKeyword = OFFTOPIC_KEYWORDS.some((kw) => lower.includes(kw));

      if (sessionDomain === 'esthetic') {
        // Sesión ya estética: solo bloqueamos si el nuevo mensaje es off-topic claro y sin estética.
        if (!hasEstheticKeyword && hasOffTopicKeyword) {
          const reply =
            intro +
            'Parece que este mensaje es de otro tema (legal, programación, finanzas u otro ámbito diferente a la medicina estética). ' +
            'DrBeautyBot está centrado exclusivamente en tratamientos estéticos, así que en esta parte no puedo asesorarte bien.\n\n' +
            'Si quieres, seguimos con tus dudas sobre rellenos, toxina botulínica, láser, manchas, acné, cicatrices, ojeras, flacidez u otros procedimientos estéticos.' +
            closingSuffix;

          return Response.json({ reply });
        }
        // Si no es off-topic claro, dejamos pasar el mensaje al router/IA como follow-up.
      } else {
        // Primera vez / dominio desconocido → comportamiento original
        // Mensaje claramente off-topic y sin estética → bloqueo amable sin IA
        if (!hasEstheticKeyword && hasOffTopicKeyword) {
          const reply =
            intro +
            'Soy DrBeautyBot y estoy diseñada exclusivamente para resolver dudas de medicina estética ' +
            '(por ejemplo: rellenos, toxina botulínica, láser, manchas, acné, cicatrices, ojeras, flacidez, etc.). ' +
            'Tu mensaje parece ser de otro tema (legal, programación, finanzas u otro ámbito), ' +
            'así que en este caso no puedo darte una respuesta detallada.\n\n' +
            'Si quieres, cuéntame qué zona o qué tipo de tratamiento estético tienes en mente y lo vemos.' +
            closingSuffix;

          return Response.json({ reply });
        }

        // Mensaje muy general/ambiguo sin estética ni off-topic claro → pedir que lo aterrice en estética
        if (!hasEstheticKeyword && !hasOffTopicKeyword) {
          const reply =
            intro +
            'Para poder ayudarte necesito que tu pregunta esté claramente relacionada con medicina estética. ' +
            'Por ejemplo, puedes decirme si te interesa hablar de rellenos, toxina botulínica, láser para manchas o depilación, ' +
            'cicatrices de acné, ojeras, flacidez, etc., y en qué zona del cuerpo te preocupa más.' +
            closingSuffix;

          return Response.json({ reply });
        }
      }
    }

    // ✅ Helper de logging central (reusa facts)
    const maybeLogSession = async (reply: string, route: RouteDecision) => {
      if (!sessionId) return;

      const qualityEvent = classifyQualityEvent({
        message: rawMessage,
        mode,
        definitionIntent: facts.definitionIntent,
        dangerSignals: facts.dangerSignals,
        materialsFound: facts.materialsFound,
        materialContext: facts.materialContext,
      });

      await upsertSessionLog({
        sessionId,
        mode,
        profileSnapshot: effectiveProfile,
        userText: rawMessage,
        botText: reply,
        qualityEvent,
        route,
      });
    };

    /**
     * ✅ CAPA 0.5 – TRIAGE GUARD (por señales)
     */
    let dangerSignalsForDefinition: string[] | null = null;

    if (facts.dangerSignals.length > 0) {
      const critical = facts.hasVision || facts.hasBreathingChest;
      const highButContextual = !critical && facts.procedureCtx.likelyPostProcedure && facts.symptomReport;

      const isReallyDefinitionOnly =
        facts.definitionIntent && !facts.symptomReport && !facts.procedureCtx.likelyPostProcedure;

      if ((critical || highButContextual) && !isReallyDefinitionOnly) {
        const emergencyLine = buildEmergencyLine(effectiveProfile?.country);

        const detectedLine =
          facts.dangerSignals.length === 1
            ? `Detecté una señal de alarma: **${facts.dangerSignals[0]}**.`
            : `Detecté señales de alarma (prioridad alta → baja): **${facts.dangerSignals.join(', ')}**.`;

        const reply =
          intro +
          detectedLine +
          '\n\n' +
          'Si esto te está ocurriendo ahora (especialmente después de una inyección o procedimiento facial), es importante **buscar valoración médica urgente de inmediato**. ' +
          'DrBeautyBot no puede valorar ni manejar urgencias en tiempo real. ' +
          'Acude a **urgencias** o contacta al médico que realizó el procedimiento **ya**.' +
          '\n\n' +
          emergencyLine +
          '\n\n' +
          CLOSING;

        const route: RouteDecision = { route: 'deterministic', reason: 'emergency' };
        await maybeLogSession(reply, route);
        return Response.json({ reply });
      }

      if (isReallyDefinitionOnly) {
        dangerSignalsForDefinition = facts.dangerSignals;
      }
    }

    /**
     * ✅ CAPA DEFINICIONES
     */
    let hasDefinitionHit = false;
    if (facts.definitionIntent) {
      const def = findDefinitionInMessage(rawMessage);
      if (def) {
        hasDefinitionHit = true;

        const safetyParts: string[] = [];
        if (dangerSignalsForDefinition?.length) {
          safetyParts.push(
            dangerSignalsForDefinition.length === 1
              ? `⚠️ Nota de seguridad: mencionaste **${dangerSignalsForDefinition[0]}**. Si esto le está ocurriendo a alguien (sobre todo tras un procedimiento/inyección), conviene valoración médica inmediata.`
              : `⚠️ Nota de seguridad: mencionaste señales como **${dangerSignalsForDefinition.join(
                  ', '
                )}**. Si le está ocurriendo a alguien (especialmente tras un procedimiento/inyección), conviene valoración médica inmediata.`
          );
        }
        if (def.safetyNote) safetyParts.push(`⚠️ ${def.safetyNote}`);

        const reply =
          intro +
          `**Definición — ${def.term}:**\n` +
          `${def.definition}\n\n` +
          (safetyParts.length ? safetyParts.join('\n\n') + '\n\n' : '') +
          closingSuffix;

        const route: RouteDecision = { route: 'deterministic', reason: 'definition' };
        await maybeLogSession(reply, route);
        return Response.json({ reply });
      }
    }

    /**
     * ✅ CAPA TRIAGE (complicaciones)
     */
    const complication = findHighestSeverityComplication(rawMessage);
    if (complication) {
      if (complication.nivel >= 4 || complication.marcarComoUrgencia) {
        const emergencyLine = buildEmergencyLine(effectiveProfile?.country);

        const reply =
          complication.orientacionPaciente +
          '\n\n' +
          'DrBeautyBot no puede valorar ni manejar urgencias ni complicaciones en tiempo real. ' +
          'Debes acudir de inmediato al servicio de urgencias más cercano o contactar al médico que realizó el procedimiento. ' +
          emergencyLine +
          '\n\n' +
          CLOSING;

        const route: RouteDecision = { route: 'deterministic', reason: 'triage_complication' };
        await maybeLogSession(reply, route);
        return Response.json({ reply });
      }

      if (complication.nivel <= 2) {
        const reply =
          intro +
          complication.orientacionPaciente +
          '\n\n' +
          'Aunque algunas reacciones leves pueden ser esperables, siempre es recomendable comentar cualquier cambio con tu médico tratante, sobre todo si algo te preocupa o cambia de forma brusca.' +
          closingSuffix;

        const route: RouteDecision = { route: 'deterministic', reason: 'triage_complication' };
        await maybeLogSession(reply, route);
        return Response.json({ reply });
      }

      if (complication.nivel === 3) {
        const reply =
          intro +
          complication.orientacionPaciente +
          '\n\n' +
          'Por el tipo de síntomas que describes, lo más prudente es que un médico con experiencia en medicina estética te valore directamente. ' +
          'Si eres paciente de tu clínica de confianza, te recomiendo contactarles para una revisión prioritaria.' +
          closingSuffix;

        const route: RouteDecision = { route: 'deterministic', reason: 'triage_complication' };
        await maybeLogSession(reply, route);
        return Response.json({ reply });
      }
    }

    /**
     * ✅ CAPA MATERIALES (solo resolvemos determinístico si aparece cualquier alto riesgo con contexto)
     * High-risk estricto: si hay alguno en el mensaje, es el que manda.
     */
    if (facts.highRiskMaterial) {
      // Reusamos dangerSignals ya calculadas
      if (facts.dangerSignals.length > 0) {
        const emergencyLine = buildEmergencyLine(effectiveProfile?.country);

        const detectedLine =
          facts.dangerSignals.length === 1
            ? `Detecté una señal de alarma: **${facts.dangerSignals[0]}**.`
            : `Detecté señales de alarma (prioridad alta → baja): **${facts.dangerSignals.join(', ')}**.`;

        const reply =
          intro +
          detectedLine +
          '\n\n' +
          'Si te aplicaron un material de alto riesgo/no autorizado (por ejemplo “biopolímeros/silicona/modelantes/aceites”) y además hay señales de alarma, lo más prudente es **acudir a urgencias de inmediato** o contactar al médico tratante **ya**.' +
          '\n\n' +
          emergencyLine +
          '\n\n' +
          CLOSING;

        const route: RouteDecision = { route: 'deterministic', reason: 'high_risk_material' };
        await maybeLogSession(reply, route);
        return Response.json({ reply });
      }

      if (facts.materialContext === 'considering' || facts.materialContext === 'already') {
        if (facts.materialContext === 'considering') {
          const reply =
            intro +
            facts.highRiskMaterial.descripcionPaciente +
            '\n\n' +
            'Si te lo están ofreciendo o estás considerando aplicártelo: **no es recomendable**. ' +
            'En general, los rellenos permanentes/no autorizados (p. ej., “modelantes”, “silicona”, “aceites”, “biopolímeros”) se asocian con complicaciones difíciles de manejar y a veces irreversibles.' +
            '\n\n' +
            'Si buscas un relleno, lo más seguro es hablar con un médico especialista y preguntar por materiales **autorizados, trazables y reabsorbibles** cuando corresponda.' +
            '\n\n' +
            'Si quieres, dime: **zona**, **objetivo** y **si te lo ofrecieron en clínica médica** o no, y te ayudo a formular preguntas de seguridad para tu consulta.' +
            closingSuffix;

          const route: RouteDecision = { route: 'deterministic', reason: 'high_risk_material' };
          await maybeLogSession(reply, route);
          return Response.json({ reply });
        }

        const reply =
          intro +
          facts.highRiskMaterial.descripcionPaciente +
          '\n\n' +
          'Si ya te aplicaron algo de este tipo o sospechas que fue un “relleno permanente/modelante”: lo más prudente es **no manipular la zona** y buscar valoración con un médico con experiencia en complicaciones de rellenos.' +
          '\n\n' +
          'Si presentas dolor intenso, cambios de color, piel fría, inflamación que progresa rápido, fiebre, secreción, dificultad para respirar o alteraciones visuales, busca atención inmediata.' +
          '\n\n' +
          'Si me dices: **cuándo fue**, **en qué zona**, y **qué síntomas (si hay)**, puedo orientarte con información general sobre qué suele valorar un especialista.' +
          closingSuffix;

        const route: RouteDecision = { route: 'deterministic', reason: 'high_risk_material' };
        await maybeLogSession(reply, route);
        return Response.json({ reply });
      }

      // Si hay high-risk pero contexto unknown, lo dejamos como contexto para IA (no determinístico).
    }

    /**
     * ✅ ROUTER -> cerebro IA (o fallback)
     * Nota: el router recibe materialForRouting (highRisk si existe, si no el primero).
     */
    const route = decideRoute({
      rawMessage,
      hasDefinitionHit,
      definitionIntent: facts.definitionIntent,
      material: facts.materialForRouting,
      materialContext: facts.materialContext,
      sessionDomain,
    });

    if (route.route === 'brain') {
      const contextPack = buildContextPack({
        profile: effectiveProfile,
        materialsFound: facts.materialsFound,
        materialContext: facts.materialContext,
        dangerSignals: facts.dangerSignals,
        procedureCtx: facts.procedureCtx,
        definitionIntent: facts.definitionIntent,
        route,
      });

      const reply = await callBrain({
        userMessage: rawMessage,
        mode,
        intro,
        contextPack,
        closingSuffix,
      });

      await maybeLogSession(reply, route);
      return Response.json({ reply });
    }

    /**
     * ✅ fallback general (si llegara a ocurrir)
     */
    let mainText = '';
    if (lower.includes('gracias') || lower.includes('muchas gracias')) {
      mainText =
        'Gracias a ti por confiar en DrBeautyBot 💜. Siempre que tengas dudas sobre tratamientos estéticos, puedo ayudarte a entender mejor los conceptos y los posibles riesgos, pero recuerda que la decisión final y la valoración detallada siempre deben hacerse con tu médico.';
    } else {
      mainText =
        'En medicina estética es muy importante equilibrar expectativas, seguridad y evidencia científica. ' +
        'Puedo ayudarte a entender conceptos generales y a identificar señales de alerta que requieren valoración médica. ' +
        'Si puedes contarme un poco más de qué tratamiento o zona quieres hablar, podré orientarte de forma más específica (siempre a nivel informativo).';
    }

    const reply = `${intro}${mainText}${closingSuffix}`;

    await maybeLogSession(reply, route.route === 'general' ? route : { route: 'general', reason: 'fallback' });
    return Response.json({ reply });
  } catch (error) {
    console.error('Error en /api/chat:', error);
    return Response.json(
      {
        reply:
          'Ha ocurrido un problema al procesar tu mensaje. Intenta de nuevo en unos minutos o revisa tu conexión. Si tienes síntomas que te preocupan, prioriza contactar directamente a tu médico o a un servicio de urgencias.',
      },
      { status: 500 }
    );
  }
}
