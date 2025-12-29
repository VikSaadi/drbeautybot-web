// lib/rules/emergencies.ts
import rawData from '@/data/emergencies.json';
import type { EmergencyNumber } from './types';

export const emergencies = rawData as EmergencyNumber[];

// Busca el número de emergencias según el país del perfil
export function findEmergencyNumber(countryNameOrCode?: string): EmergencyNumber | null {
  if (!countryNameOrCode) return null;
  const query = countryNameOrCode.toLowerCase();

  const found = emergencies.find(
    (e) =>
      e.countryCode.toLowerCase() === query ||
      e.countryName.toLowerCase() === query
  );

  return found || null;
}
