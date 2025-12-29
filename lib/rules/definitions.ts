/*
  CHANGELOG — 2025-12-13
  - Nuevo motor de definiciones: data/definitions.json + matching robusto.
  - Usa normalizeText + tokenizeNormalized + matchKeywordNormalized.
  - Selecciona la mejor coincidencia por "score" (frases más específicas ganan).

  CHANGELOG — 2025-12-15
  - Se agregó findDefinitionMatchInMessage() para obtener {def, score, matchedCandidate} (debug/telemetría/router).
  - Se agregó extractDefinitionQueryTerm() para extraer el término “probable” cuando el usuario pregunta definición
    pero no existe en definitions.json (fallback seguro hacia IA).
  - Tie-breaker: en empate de score, preferimos el candidato más largo (más específico).
*/

import rawData from '@/data/definitions.json';
import { normalizeText, tokenizeNormalized, matchKeywordNormalized } from './text';

export type DefinitionItem = {
  id: string;
  term: string;
  keywords?: string[];
  definition: string;
  safetyNote?: string;
};

type RawDefinitions =
  | DefinitionItem[]
  | {
      __meta?: any;
      items?: DefinitionItem[];
    };

const defs = rawData as RawDefinitions;
const definitions: DefinitionItem[] = (Array.isArray(defs) ? defs : defs?.items ?? []) as DefinitionItem[];

/**
 * ✅ Precompilación ligera (solo normalización de candidatos)
 */
type CompiledDef = DefinitionItem & {
  _candidates: { raw: string; norm: string; score: number; len: number }[];
};

const compiledDefinitions: CompiledDef[] = definitions.map((d) => {
  const candidatesRaw = [d.term, ...(d.keywords ?? [])]
    .map((s) => (s ?? '').trim())
    .filter(Boolean);

  const candidates = candidatesRaw
    .map((raw) => {
      const norm = normalizeText(raw);
      const tokenCount = tokenizeNormalized(norm).length;
      const score = Math.max(1, tokenCount); // frases más largas = más específicas
      return { raw, norm, score, len: norm.length };
    })
    .filter((c) => c.norm.length >= 3);

  return { ...d, _candidates: candidates };
});

export type DefinitionMatch = {
  def: DefinitionItem;
  score: number;
  matchedCandidate: string;
};

/**
 * Encuentra la mejor coincidencia de definición en el mensaje.
 * Devuelve también score + el candidato que matcheó (útil para router/debug).
 */
export function findDefinitionMatchInMessage(message: string): DefinitionMatch | null {
  const textNorm = normalizeText(message);
  const textTokens = tokenizeNormalized(textNorm);

  let best: { def: DefinitionItem; score: number; matchedCandidate: string; len: number } | null = null;

  for (const def of compiledDefinitions) {
    if (!def._candidates.length) continue;

    // Busca el candidato con score más alto que matchee
    let bestLocal: { score: number; matchedCandidate: string; len: number } | null = null;

    for (const cand of def._candidates) {
      const ok = matchKeywordNormalized(textNorm, textTokens, cand.norm);
      if (!ok) continue;

      if (!bestLocal) {
        bestLocal = { score: cand.score, matchedCandidate: cand.raw, len: cand.len };
        continue;
      }

      // Mejor score o, en empate, candidato más largo (más específico)
      if (cand.score > bestLocal.score || (cand.score === bestLocal.score && cand.len > bestLocal.len)) {
        bestLocal = { score: cand.score, matchedCandidate: cand.raw, len: cand.len };
      }
    }

    if (!bestLocal) continue;

    if (
      !best ||
      bestLocal.score > best.score ||
      (bestLocal.score === best.score && bestLocal.len > best.len)
    ) {
      best = { def, score: bestLocal.score, matchedCandidate: bestLocal.matchedCandidate, len: bestLocal.len };
    }
  }

  return best ? { def: best.def, score: best.score, matchedCandidate: best.matchedCandidate } : null;
}

/**
 * Compat: mantiene la firma original.
 * Nota: NO decide si es pregunta de definición; eso lo decide route.ts.
 */
export function findDefinitionInMessage(message: string): DefinitionItem | null {
  return findDefinitionMatchInMessage(message)?.def ?? null;
}

/**
 * ✅ Extrae un término probable para definición (cuando el usuario pregunta “qué es …” o manda término suelto),
 * incluso si NO existe en definitions.json. Útil para fallback hacia IA sin “atorarse”.
 */
export function extractDefinitionQueryTerm(message: string): string | null {
  const raw = (message ?? '').trim();
  if (!raw) return null;

  const t = normalizeText(raw);

  // Caso 1: término suelto (1–2 tokens) -> regresamos el “raw” limpio de signos comunes
  const tokens = tokenizeNormalized(t);
  if (tokens.length > 0 && tokens.length <= 2) {
    const cleaned = raw.replace(/[¿?!.:,;()"'“”]/g, '').trim();
    return cleaned.length ? cleaned : null;
  }

  // Caso 2: pregunta explícita -> tomamos lo que viene después del patrón
  const patterns: RegExp[] = [
    /\b(q|que)\s+(significa|es)\s+/,
    /\b(definicion|define|significado\s+de)\s+/,
  ];

  for (const p of patterns) {
    const m = t.match(p);
    if (!m) continue;

    const idx = m.index ?? 0;
    const after = t.slice(idx + m[0].length).trim();
    if (!after) continue;

    // limita para evitar “agarro media frase”
    const afterTokens = tokenizeNormalized(after).slice(0, 6);
    if (!afterTokens.length) continue;

    return afterTokens.join(' ');
  }

  return null;
}
