// lib/rules/types.ts
/**
 * LOG DE CAMBIOS
 * - 2025-12-13: Se agrega DefinitionInfo + DefinitionCategory para “CAPA definiciones”.
 */

// Nivel de severidad global de 0 a 5 (según tu guía)
export type SeverityLevel = 0 | 1 | 2 | 3 | 4 | 5;

// Procedimientos contemplados en tu guía
export type ProcedureType =
  | 'rellenos'
  | 'toxina'
  | 'hilos'
  | 'laser'
  | 'bioestimuladores'
  | 'criolipolisis'
  | 'mesoterapia'
  | 'peelings'
  | 'microneedling'
  | 'otros';

// Regla de complicación para Capa 0 (triage automático)
export interface ComplicationRule {
  id: string;                    // "oclusion_vascular_aguda"
  procedimiento: ProcedureType;  // "rellenos"
  nombre: string;                // "Oclusión vascular aguda"
  nivel: SeverityLevel;          // 0 a 5
  sintomasClave: string[];       // frases/keywords que detectaremos en el mensaje
  orientacionPaciente: string;   // texto ya adaptado a paciente (sin fármacos ni dosis)
  notasInternas?: string;        // comentarios para ti (no se muestran)
  marcarComoUrgencia?: boolean;  // si queremos que SIEMPRE dispare mensaje de urgencia
}

// Información de materiales (lista blanca / lista negra)
export type MaterialCategoria =
  | 'ah'             // ácido hialurónico
  | 'caha'           // hidroxiapatita de calcio
  | 'plla'           // ácido poliláctico
  | 'pcl_cmc'        // policaprolactona + CMC
  | 'toxina'
  | 'biopolimeros'
  | 'silicona_liquida'
  | 'pmma'
  | 'aceites'
  | 'otro';

export interface MaterialInfo {
  id: string;                // "ah_reabsorbible"
  nombre: string;            // "Ácido hialurónico"
  categoria: MaterialCategoria;
  esSeguroEnManosExpertas: boolean;
  nivelRiesgo: SeverityLevel;    // según tu escala global 0-5
  descripcionPaciente: string;   // explicación simple para el chatbot
  ejemploMarcas?: string[];      // "Juvéderm", "Restylane", etc. (mostrar o no)
  sinonimos?: string[];          // alias/keywords (silicona permanente, biopolimeros, etc.)
  listaNegra?: boolean;          // true si es material prohibido/peligroso
}

// Números de emergencias por país
export interface EmergencyNumber {
  countryCode: string;       // "MX", "CO", "ES", etc.
  countryName: string;       // "México"
  emergencyNumber: string;   // "911"
  notes?: string;            // ej. "Número único de emergencias"
}

/**
 * ✅ Definiciones (CAPA definiciones)
 * Para responder “¿qué es X?” con una definición clara + advertencia.
 */
export type DefinitionCategory =
  | 'sintoma'
  | 'complicacion'
  | 'material'
  | 'procedimiento'
  | 'dispositivo'
  | 'concepto';

export interface DefinitionInfo {
  id: string;               // "def_vision_borrosa"
  termino: string;          // "visión borrosa"
  categoria: DefinitionCategory;
  definicion: string;       // texto en lenguaje paciente
  alias?: string[];         // sinónimos/keywords (incluye variantes comunes)
  advertencia?: string;     // warning breve (ej. “si ocurre tras inyección, urgencias”)
  prioridad?: number;       // opcional: desempate (mayor = más importante)
}
