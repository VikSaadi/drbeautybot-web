import 'server-only';

/*
  CHANGELOG — 2025-12-28
  - Se hace opcional el uso de Firebase Admin para evitar que el build
    falle cuando no existe secrets/firebase-service-account.json
    (por ejemplo, en Vercel).
  - Si el JSON no está disponible, se exporta un cliente Firestore "no-op"
    que ignora operaciones de logging en lugar de lanzar error.
  - Se elimina 'use server' para evitar que Next 16 trate exports como Server Actions.
*/

import fs from 'node:fs';
import path from 'node:path';
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';

// Cliente Firestore "no-op" para entornos sin Service Account.
// Implementa únicamente lo típico: collection/doc/set/update/get + add.
function createNoopDb() {
  const asyncNoop = async (..._args: unknown[]) => {};
  return {
    collection: (_name: string) => ({
      doc: (_id?: string) => ({
        set: asyncNoop,
        update: asyncNoop,
        get: async () => ({ exists: false }),
      }),
      add: asyncNoop,
    }),
  };
}

// ✅ Ruta absoluta al JSON dentro de /secrets
const serviceAccountPath = path.join(
  process.cwd(),
  'secrets',
  'firebase-service-account.json',
);

let adminDbInternal: any;
let adminProjectIdInternal: string | undefined;

if (fs.existsSync(serviceAccountPath)) {
  const raw = fs.readFileSync(serviceAccountPath, 'utf8');
  const serviceAccount = JSON.parse(raw);

  const app =
    getApps().length > 0
      ? getApps()[0]
      : initializeApp({
          credential: cert(serviceAccount as any),
        });

  adminDbInternal = getFirestore(app);
  adminProjectIdInternal = (serviceAccount as any).project_id as
    | string
    | undefined;
} else {
  console.warn(
    `[firebase-admin] Service Account JSON no encontrado en ${serviceAccountPath}. ` +
      'Se usará un cliente Firestore no-op (solo para evitar errores en Vercel); ' +
      'no se escribirán datos reales de logging.',
  );
  adminDbInternal = createNoopDb();
  adminProjectIdInternal = undefined;
}

export const adminDb = adminDbInternal;
export const serverTimestamp = () => FieldValue.serverTimestamp();
export const adminProjectId = adminProjectIdInternal;
