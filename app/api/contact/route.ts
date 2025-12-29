// app/api/contact/route.ts
import { NextResponse } from 'next/server';
import { resend, CONTACT_INBOX_EMAIL, CONTACT_FROM_EMAIL } from '@/lib/resend';

interface ContactPayload {
  name: string;
  email: string;
  company?: string;
  messageType?: string;
  message: string;
  consent: boolean;
}

// Sólo aceptamos POST; si alguien llama GET devolvemos 405 en JSON
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Partial<ContactPayload>;
    const { name, email, company, messageType, message, consent } = body;

    // Validaciones básicas
    if (!name || !email || !message) {
      return NextResponse.json(
        { ok: false, error: 'Faltan campos obligatorios.' },
        { status: 400 },
      );
    }

    if (!consent) {
      return NextResponse.json(
        { ok: false, error: 'Debes aceptar el uso de tu correo para responderte.' },
        { status: 400 },
      );
    }

    const typeLabel = messageType || 'Sin especificar';

    const html = `
      <h2>Nuevo mensaje desde el formulario de contacto de Dr. BeautyBot</h2>
      <p><strong>Nombre:</strong> ${name}</p>
      <p><strong>Correo:</strong> ${email}</p>
      ${
        company
          ? `<p><strong>Empresa / clínica / institución:</strong> ${company}</p>`
          : ''
      }
      <p><strong>Tipo de mensaje:</strong> ${typeLabel}</p>
      <hr />
      <p><strong>Mensaje:</strong></p>
      <p>${(message || '').replace(/\n/g, '<br />')}</p>
    `;

    // Enviar correo con Resend
    const { data, error } = await resend.emails.send({
      from: `Dr. BeautyBot Contacto <${CONTACT_FROM_EMAIL}>`,
      to: [CONTACT_INBOX_EMAIL],
      reply_to: email,
      subject: `Nuevo mensaje (${typeLabel}) - Dr. BeautyBot`,
      html,
    });

    if (error) {
      console.error('Error Resend:', error);
      return NextResponse.json(
        { ok: false, error: 'No se pudo enviar el correo.' },
        { status: 500 },
      );
    }

    // todo bien
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Error en /api/contact:', error);
    return NextResponse.json(
      { ok: false, error: 'Ocurrió un error al procesar la solicitud.' },
      { status: 500 },
    );
  }
}
