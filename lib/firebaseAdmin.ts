import 'server-only';

/*
  CHANGELOG — 2025-12-28 (B)
  - Se tipa adminDb como Firestore (firebase-admin) para que TS infiera tipos
    (ej: runTransaction -> Transaction) y evitar "implicit any" en callbacks.
  - Se agrega runTransaction "no-op" para entornos sin Service Account (Vercel),
    evitando crasheos en runtime si el código intenta loggear.
*/

/*
  CHANGELOG — 2025-12-28 (A)
  - Se hace opcional el uso de Firebase Admin para evitar que el build
    falle cuando no existe secrets/firebase-service-account.json (Vercel).
  - Si el JSON no está disponible, se usa un cliente Firestore "no-op".
*/

import fs from 'node:fs';
import path from 'node:path';
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import type { Firestore } from 'firebase-admin/firestore';

// ✅ Ruta absoluta al JSON dentro de /secrets
const serviceAccountPath = path.join(
  process.cwd(),
  'secrets',
  'firebase-service-account.json',
);

let adminDbInternal: Firestore;
let adminProjectIdInternal: string | undefined;

/**
 * Firestore no-op que cumple lo suficiente para que el backend no truene
 * cuando no hay Service Account (p.ej. en Vercel).
 * Nota: se castea a Firestore por compatibilidad de tipos.
 */
function createNoopFirestore(): Firestore {
  const asyncNoop = async (..._args: unknown[]) => {};

  const noopTx = {
    get: async (_ref: unknown) => ({ exists: false, data: () => undefined }),
    set: asyncNoop,
    update: asyncNoop,
    create: asyncNoop,
    delete: asyncNoop,
  };

  const noopDb = {
    runTransaction: async (updateFunction: (tx: any) => Promise<any>) => {
      return updateFunction(noopTx);
    },
    collection: (_name: string) => ({
      doc: (_id?: string) => ({
        set: asyncNoop,
        update: asyncNoop,
        get: async () => ({ exists: false, data: () => undefined }),
      }),
      add: asyncNoop,
    }),
    doc: (_path: string) => ({
      set: asyncNoop,
      update: asyncNoop,
      get: async () => ({ exists: false, data: () => undefined }),
    }),
  };

  return noopDb as unknown as Firestore;
}

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
      'Se usará un Firestore no-op (solo para evitar errores en Vercel).',
  );
  adminDbInternal = createNoopFirestore();
  adminProjectIdInternal = undefined;
}

export const adminDb = adminDbInternal;
export const serverTimestamp = () => FieldValue.serverTimestamp();
export const adminProjectId = adminProjectIdInternal;
