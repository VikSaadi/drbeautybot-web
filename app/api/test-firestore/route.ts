// app/api/test-firestore/route.ts
// Endpoint de prueba deshabilitado en producción.
// Antes se usaba para probar Firebase Admin leyendo un JSON local en /secrets,
// pero ese archivo no se despliega en Vercel, así que rompía el build.

import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json(
    {
      ok: false,
      message:
        'Endpoint de prueba deshabilitado en producción. La app DrBeautyBot usa Firestore desde el cliente, y las pruebas de Admin SDK se deben hacer solo en entorno local.',
    },
    { status: 200 },
  );
}
