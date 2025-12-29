// lib/rules/text.ts
/**
 * LOG DE CAMBIOS
 * - 2025-12-13: Se añade estándar de “log de cambios” en el header (sin cambios funcionales).
 *
 * Helpers compartidos para:
 * - Normalización (acentos, puntuación, espacios)
 * - Tokenización
 * - Matching robusto (género/plural básico + fuzzy por typos)
 *
 * Objetivo:
 * Evitar falsos negativos por:
 * - "borroso" vs "borrosa"
 * - "visión" vs "vision"
 * - signos, comas, mayúsculas
 * - typos leves ("vison", "borroza")
 */

export function normalizeText(input: string): string {
  return (input ?? '')
    .toLowerCase()
    .normalize('NFD') // separa letras + acentos
    .replace(/[\u0300-\u036f]/g, '') // elimina acentos
    .replace(/[^a-z0-9\s]/g, ' ') // quita signos/puntuación
    .replace(/\s+/g, ' ') // colapsa espacios
    .trim();
}

export function tokenizeNormalized(normalized: string): string[] {
  if (!normalized) return [];
  return normalized.split(' ').filter(Boolean);
}

export function tokenize(input: string): string[] {
  return tokenizeNormalized(normalizeText(input));
}

/**
 * Levenshtein con corte temprano (para tokens cortos).
 * Lo usamos SOLO para tolerar typos leves.
 */
function levenshteinWithCap(a: string, b: string, cap: number): number {
  if (a === b) return 0;

  const la = a.length;
  const lb = b.length;

  // Si la diferencia ya excede el cap, no vale la pena
  if (Math.abs(la - lb) > cap) return cap + 1;

  // DP en O(min(la, lb)) memoria
  const prev = new Array(lb + 1).fill(0);
  const curr = new Array(lb + 1).fill(0);

  for (let j = 0; j <= lb; j++) prev[j] = j;

  for (let i = 1; i <= la; i++) {
    curr[0] = i;
    let minRow = curr[0];

    const ai = a.charCodeAt(i - 1);

    for (let j = 1; j <= lb; j++) {
      const cost = ai === b.charCodeAt(j - 1) ? 0 : 1;
      curr[j] = Math.min(
        prev[j] + 1, // delete
        curr[j - 1] + 1, // insert
        prev[j - 1] + cost // substitute
      );
      if (curr[j] < minRow) minRow = curr[j];
    }

    // corte temprano si toda la fila ya es > cap
    if (minRow > cap) return cap + 1;

    for (let j = 0; j <= lb; j++) prev[j] = curr[j];
  }

  return prev[lb];
}

/**
 * Equivalencia tolerante a typo leve.
 * - tokens cortos: deben coincidir exacto (reduce falsos positivos)
 * - tokens medianos: dist <= 1
 * - tokens largos: dist <= 2
 */
export function fuzzyTokenEquals(a: string, b: string): boolean {
  if (a === b) return true;

  const len = Math.max(a.length, b.length);
  if (len < 6) return false;

  const cap = len >= 9 ? 2 : 1;
  return levenshteinWithCap(a, b, cap) <= cap;
}

/**
 * Matching de frase por tokens (sin orden estricto):
 * "vision borrosa" debe encontrar tokens equivalentes en textTokens.
 *
 * Nota:
 * No exige adyacencia. Es un fallback para typos / variaciones.
 */
export function fuzzyPhraseMatch(textTokens: string[], phraseTokens: string[]): boolean {
  if (phraseTokens.length === 0) return false;
  if (textTokens.length === 0) return false;

  for (const pt of phraseTokens) {
    const found = textTokens.some((tt) => fuzzyTokenEquals(tt, pt));
    if (!found) return false;
  }

  return true;
}

/**
 * Expansión MUY básica para género/plural:
 * - borroso -> borros(o|a|os|as)
 * - palido  -> palid(o|a|os|as)
 *
 * Si el token no termina en a/o/as/os, se deja igual.
 */
export function expandGenderPluralTokenToRegex(token: string): string {
  if (!token) return token;

  const t = token;

  // os/as
  if (t.endsWith('os') || t.endsWith('as')) {
    const base = t.slice(0, -2);
    if (base.length >= 3) return `${escapeRegex(base)}(o|a|os|as)`;
  }

  // o/a
  if (t.endsWith('o') || t.endsWith('a')) {
    const base = t.slice(0, -1);
    if (base.length >= 3) return `${escapeRegex(base)}(o|a|os|as)`;
  }

  return escapeRegex(t);
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Convierte "vision borrosa" -> /\bvision\s+borros(o|a|os|as)\b/i
 * OJO: esto opera sobre texto YA normalizado.
 */
export function keywordToRegexFromNormalized(keywordNorm: string): RegExp | null {
  const kw = keywordNorm.trim();
  if (!kw) return null;

  const tokens = tokenizeNormalized(kw);
  if (tokens.length === 0) return null;

  const parts = tokens.map(expandGenderPluralTokenToRegex);
  const joined = parts.join('\\s+');

  return new RegExp(`\\b${joined}\\b`, 'i');
}

/**
 * Matching robusto:
 * 1) includes directo (rápido)
 * 2) regex con género/plural (sobre texto normalizado)
 * 3) fuzzy por tokens (typos leves)
 */
export function matchKeywordNormalized(textNorm: string, textTokens: string[], keyword: string): boolean {
  const kwNorm = normalizeText(keyword);
  if (!kwNorm) return false;

  // 1) match directo
  if (textNorm.includes(kwNorm)) return true;

  // 2) regex género/plural
  const re = keywordToRegexFromNormalized(kwNorm);
  if (re && re.test(textNorm)) return true;

  // 3) fuzzy tokens
  const kwTokens = tokenizeNormalized(kwNorm);
  if (kwTokens.length > 0 && fuzzyPhraseMatch(textTokens, kwTokens)) return true;

  return false;
}
