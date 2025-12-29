// app/api/_test-firestore/route.ts
import { adminDb, adminProjectId, serverTimestamp } from '@/lib/firebaseAdmin';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const ref = await adminDb.collection('chat_events').add({
      test: true,
      createdAt: serverTimestamp(),
      note: 'test endpoint _test-firestore',
    });

    return Response.json({
      ok: true,
      docId: ref.id,
      projectId: adminProjectId ?? 'unknown',
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('❌ _test-firestore error:', err);

    return Response.json(
      { ok: false, error: message },
      { status: 500 }
    );
  }
}
