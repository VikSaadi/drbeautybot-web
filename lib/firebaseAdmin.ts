import 'server-only';

import fs from 'node:fs';
import path from 'node:path';
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';

// ✅ Ruta absoluta al JSON dentro de /secrets
const serviceAccountPath = path.join(
  process.cwd(),
  'secrets',
  'firebase-service-account.json'
);

if (!fs.existsSync(serviceAccountPath)) {
  throw new Error(
    `No se encontró el Service Account JSON en: ${serviceAccountPath}`
  );
}

const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

const app =
  getApps().length > 0
    ? getApps()[0]
    : initializeApp({
        credential: cert(serviceAccount),
      });

export const adminDb = getFirestore(app);
export const serverTimestamp = () => FieldValue.serverTimestamp();

// (opcional) útil para debug
export const adminProjectId = serviceAccount.project_id as string | undefined;
