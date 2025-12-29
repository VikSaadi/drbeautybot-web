// lib/resend.ts
import { Resend } from 'resend';

// Env vars (ajusta los nombres si usaste otros en .env.local)
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const CONTACT_FROM = process.env.CONTACT_FROM_EMAIL;
const CONTACT_INBOX = process.env.CONTACT_INBOX_EMAIL;

// Mensajes de aviso si falta algo (no rompen el build)
if (!RESEND_API_KEY) {
  console.warn('⚠️ RESEND_API_KEY no está definido. Los envíos de correo fallarán.');
}
if (!CONTACT_FROM) {
  console.warn('⚠️ CONTACT_FROM_EMAIL no está definido. Usando remitente por defecto.');
}
if (!CONTACT_INBOX) {
  console.warn('⚠️ CONTACT_INBOX_EMAIL no está definido. Usando inbox por defecto.');
}

// Instancia única de Resend
export const resend = new Resend(RESEND_API_KEY || '');

// Named exports que usa /api/contact
export const CONTACT_FROM_EMAIL = CONTACT_FROM || 'onboarding@resend.dev';
export const CONTACT_INBOX_EMAIL = CONTACT_INBOX || 'tu-correo@ejemplo.com';
