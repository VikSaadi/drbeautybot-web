/* 
  CHANGELOG — 2025-12-13
  - Soporte para materials.json en formato { __meta, items } (JSON válido sin comentarios).
  - Se agregaron CATEGORY_HINTS para caha/plla/pcl_cmc y se afinó silicona/aceites para evitar falsos positivos.
  - Se mantiene prioridad: alto riesgo primero (listaNegra o nivelRiesgo >= 4).

  CHANGELOG — 2025-12-15
  - Se agregó findMaterialsInMessage(message, maxResults) para detectar múltiples materiales en un solo mensaje (top N).
  - findMaterialInMessage() mantiene compatibilidad y ahora delega a findMaterialsInMessage(..., 1).
*/

import rawData from '@/data/materials.json';
import type { MaterialInfo } from './types';

import { normalizeText, tokenizeNormalized, matchKeywordNormalized } from './text';

// ✅ Soporta: array legacy o { items }
const materialsArray = (Array.isArray(rawData) ? rawData : (rawData as any)?.items) as MaterialInfo[];

// Lista de materiales tipada
export const materials = (materialsArray ?? []) as MaterialInfo[];

/**
 * ✅ Keywords extra por categoría (opcional, ayuda muchísimo en lenguaje real)
 * Nota: mantenlo “conservador” para no disparar falsos positivos.
 */
const CATEGORY_HINTS: Record<string, string[]> = {
  ah: ['acido hialuronico', 'hialuronico', 'hialuron', 'filler de acido hialuronico'],
  toxina: ['toxina botulinica', 'toxina', 'botox', 'btx'],
  caha: ['caha', 'hidroxiapatita de calcio', 'hidroxiapatita', 'radiesse', 'relleno de calcio'],
  plla: ['plla', 'acido polilactico', 'poli l lactico', 'sculptra', 'bioestimulador plla', 'bioestimulador de colageno'],
  pcl_cmc: ['pcl', 'policaprolactona', 'ellanse', 'pcl cmc', 'microesferas de pcl'],

  biopolimeros: ['biopolimero', 'biopolimeros', 'modelante', 'modelantes', 'relleno permanente no autorizado'],

  // ⚠️ Afinados para reducir falsos positivos por “silicona” (implantes, tópicos, etc.)
  silicona_liquida: ['silicona liquida', 'silicona inyectable', 'silicone oil injection', 'silicona industrial'],

  pmma: ['pmma', 'polimetilmetacrilato', 'bellafill', 'artefill', 'relleno permanente pmma'],

  // ⚠️ Evitamos "aceite" suelto por skincare; usamos términos de inyección/modelantes
  aceites: ['aceite mineral', 'aceite de bebe', 'parafina', 'vaselina', 'oil injection', 'paraffin injection'],

  otro: ['relleno desconocido', 'material desconocido', 'sustancia desconocida', 'sin trazabilidad']
};

/**
 * ✅ Construye un set de candidatos por material:
 * - nombre
 * - ejemploMarcas
 * - sinonimos (si existen en el JSON)
 * - hints por categoría (si aplica)
 */
function buildMaterialCandidates(material: MaterialInfo): string[] {
  const out: string[] = [];

  if (material.nombre) out.push(material.nombre);

  if (material.ejemploMarcas?.length) out.push(...material.ejemploMarcas);

  if (material.sinonimos?.length) out.push(...material.sinonimos);

  const cat = material.categoria;
  if (cat && CATEGORY_HINTS[cat]?.length) out.push(...CATEGORY_HINTS[cat]);

  return out
    .map((s) => s.trim())
    .filter(Boolean)
    // evita candidatos demasiado cortos que dan falsos positivos
    .filter((s) => normalizeText(s).length >= 3);
}

/**
 * ✅ Orden estable por “prioridad clínica”:
 * - primero alto riesgo (listaNegra o nivelRiesgo >= 4)
 * - luego por nivelRiesgo descendente
 */
function orderMaterialsByRisk(list: MaterialInfo[]): MaterialInfo[] {
  return [...list].sort((a, b) => {
    const aHigh = Boolean(a.listaNegra) || a.nivelRiesgo >= 4;
    const bHigh = Boolean(b.listaNegra) || b.nivelRiesgo >= 4;

    if (aHigh !== bHigh) return Number(bHigh) - Number(aHigh);
    return (b.nivelRiesgo ?? 0) - (a.nivelRiesgo ?? 0);
  });
}

/**
 * ✅ Matching robusto (multi-hit):
 * - normaliza texto
 * - intenta encontrar materiales por nombre/marca/sinonimo/hints
 * - devuelve hasta maxResults materiales (prioriza alto riesgo)
 */
export function findMaterialsInMessage(message: string, maxResults = 3): MaterialInfo[] {
  const textNorm = normalizeText(message);
  const textTokens = tokenizeNormalized(textNorm);

  const ordered = orderMaterialsByRisk(materials);

  const hits: MaterialInfo[] = [];

  for (const material of ordered) {
    const candidates = buildMaterialCandidates(material);
    const found = candidates.some((cand) => matchKeywordNormalized(textNorm, textTokens, cand));
    if (found) {
      hits.push(material);
      if (hits.length >= maxResults) break;
    }
  }

  // Dedup por id (por seguridad)
  const seen = new Set<string>();
  return hits.filter((m) => {
    if (seen.has(m.id)) return false;
    seen.add(m.id);
    return true;
  });
}

/**
 * ✅ API legacy (compatibilidad):
 * - sigue devolviendo 1 material o null
 * - delega a findMaterialsInMessage(..., 1)
 */
export function findMaterialInMessage(message: string): MaterialInfo | null {
  return findMaterialsInMessage(message, 1)[0] ?? null;
}
