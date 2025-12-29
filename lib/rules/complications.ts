/*
  CHANGELOG — 2025-12-13
  - Se integró matching robusto para sintomasClave usando normalizeText + matchKeywordNormalized.
  - Se añadió compilación ligera de keywords para evitar basura y mantener consistencia.
*/

import rawData from '@/data/complications.json';
import type { ComplicationRule } from './types';

import { normalizeText, tokenizeNormalized, matchKeywordNormalized } from './text';

// Exportamos la lista de reglas tipadas
export const complications = rawData as ComplicationRule[];

/**
 * ✅ Compilación ligera de keywords para performance:
 * normalizamos una vez por keyword para evitar repetir trabajo.
 */
type CompiledKeyword = {
  raw: string; // keyword original (por debug)
  norm: string; // keyword normalizada
};

type CompiledRule = ComplicationRule & {
  _compiledKeywords: CompiledKeyword[];
};

const compiledComplications: CompiledRule[] = complications.map((r) => ({
  ...r,
  _compiledKeywords: (r.sintomasClave ?? [])
    .map((k) => ({ raw: k, norm: normalizeText(k) }))
    .filter((x) => x.norm.length >= 3),
}));

/**
 * ✅ Encuentra la complicación de mayor severidad.
 * Matching robusto:
 * - normaliza texto
 * - keyword includes / regex género-plural / fuzzy por tokens (typos leves)
 */
export function findHighestSeverityComplication(message: string): ComplicationRule | null {
  const textNorm = normalizeText(message);
  const textTokens = tokenizeNormalized(textNorm);

  let best: ComplicationRule | null = null;

  for (const rule of compiledComplications) {
    if (!rule._compiledKeywords.length) continue;

    const match = rule._compiledKeywords.some((kw) => {
      return matchKeywordNormalized(textNorm, textTokens, kw.norm);
    });

    if (!match) continue;

    if (!best || rule.nivel > best.nivel) {
      best = rule;
    }
  }

  return best;
}
