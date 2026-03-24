'use client';

import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import BackButton from '@/components/BackButton';

/*
  CHANGELOG — 2025-12-28
  - Se conecta el formulario a /api/contact (Resend) usando fetch POST.
  - Se reemplazan alerts por mensajes inline de éxito / error y estado de envío.

  CHANGELOG — 2025-12-27 (B)
  - Fix móvil: se añade paddingTop con env(safe-area-inset-top) para que el logo no quede cortado.
  - Layout alineado al estilo /donations y /faq: logo centrado, tarjeta crema con header azul.
  - Formulario de contacto con campos básicos y mensaje de confirmación simple (alert).
  - Botón "Volver al chat" con detección de perfil guardado (profile vs quick).

  CHANGELOG — 2026-03-24
  - Migración de imágenes de ImgBB a assets locales en /public/images/.
  - Se agrega <BackButton /> para navegación estilo app nativa.
*/

// const CONTACT_BG_URL = 'https://i.ibb.co/tT0fGvpq/IMG-7155.jpg';
const CONTACT_BG_URL = '/images/IMG_7155.JPG';

// const CONTACT_LOGO_URL = 'https://i.ibb.co/5W7zQF67/robotingo-ok.png';
const CONTACT_LOGO_URL = '/images/robotingo-ok.png';

export default function ContactPage() {
  const [chatHref, setChatHref] = useState('/chat?mode=quick');

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [isCompany, setIsCompany] = useState(false);
  const [companyName, setCompanyName] = useState('');
  const [messageType, setMessageType] = useState('');
  const [message, setMessage] = useState('');
  const [acceptedEmailUse, setAcceptedEmailUse] = useState(true);
  const [isSending, setIsSending] = useState(false);

  const [feedback, setFeedback] = useState<string | null>(null);
  const [feedbackType, setFeedbackType] = useState<'success' | 'error' | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = window.localStorage.getItem('drbeautybot_profile');
      if (raw) setChatHref('/chat?mode=profile');
    } catch {
      // ignore
    }
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    setFeedback(null);
    setFeedbackType(null);

    if (!acceptedEmailUse) {
      setFeedback('Por favor acepta el uso de tu correo para poder responderte.');
      setFeedbackType('error');
      return;
    }
    if (!name || !email || !messageType || !message) {
      setFeedback(
        'Por favor completa los campos principales: nombre, correo, tipo de mensaje y mensaje.'
      );
      setFeedbackType('error');
      return;
    }

    setIsSending(true);

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email,
          company: isCompany ? companyName : undefined,
          messageType,
          message,
          consent: acceptedEmailUse,
        }),
      });

      const data = (await res.json()) as { ok?: boolean; error?: string };

      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || 'No se pudo enviar el mensaje.');
      }

      setFeedback('¡Gracias por tu mensaje! Lo revisaré con mucho cuidado 💕');
      setFeedbackType('success');

      setIsCompany(false);
      setCompanyName('');
      setMessageType('');
      setMessage('');
    } catch (error) {
      console.error('Error al enviar mensaje de contacto:', error);
      setFeedback('Hubo un problema al enviar tu mensaje. Intenta de nuevo más tarde, por favor.');
      setFeedbackType('error');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <main
      className="min-h-screen flex flex-col items-center px-4 pb-10 contact-bg-animated"
      style={{
        backgroundColor: '#F5EFFE',
        backgroundImage: `url(${CONTACT_BG_URL})`,
        backgroundRepeat: 'repeat',
        backgroundSize: '420px auto',
        paddingTop: 'calc(env(safe-area-inset-top, 0px) + 4rem)',
      }}
    >
      <style>{`
        @keyframes contactBgScroll {
          from { background-position: 0 0; }
          to   { background-position: -420px -420px; }
        }
        .contact-bg-animated {
          animation: contactBgScroll 160s linear infinite;
        }
        @media (max-width: 640px) {
          .contact-bg-animated {
            animation-duration: 190s;
          }
        }
      `}</style>

      <section className="w-full max-w-3xl flex flex-col items-center text-center z-10">

        {/* Botón regresar */}
        <div className="w-full mb-2 text-left">
          <BackButton />
        </div>

        {/* Logo */}
        <img
          src={CONTACT_LOGO_URL}
          alt="Dr. BeautyBot"
          className="mx-auto w-full max-w-[260px] drop-shadow-[0_18px_34px_rgba(0,0,0,0.35)] mb-4"
          draggable={false}
        />

        {/* Tarjeta de contacto */}
        <div className="w-full rounded-[32px] bg-[#FDF7EC]/95 shadow-[0_18px_55px_rgba(0,0,0,0.40)] border border-black/10 overflow-hidden text-left">
          {/* Header azul */}
          <header className="bg-[#9BD4F5] px-6 py-5 md:px-8 md:py-6">
            <h1 className="text-xl md:text-2xl font-bold text-slate-900">Contacto</h1>
            <p className="mt-1 text-sm md:text-[0.95rem] text-slate-800 max-w-2xl">
              ¿Tienes dudas, comentarios o ideas para mejorar Dr. BeautyBot? Cuéntame un poco y
              revisaré tu mensaje con mucho cuidado.
            </p>
          </header>

          {/* Formulario */}
          <div className="bg-[#FBEEDC] px-5 py-6 md:px-7 md:py-7">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-1">
                <label htmlFor="name" className="text-sm font-semibold text-slate-900">
                  Nombre completo
                </label>
                <input
                  id="name"
                  type="text"
                  placeholder="Ej. Laura González"
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 shadow-inner outline-none focus:border-[#9BD4F5] focus:ring-2 focus:ring-[#9BD4F5]/40"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div className="space-y-1">
                <label htmlFor="email" className="text-sm font-semibold text-slate-900">
                  Correo electrónico
                </label>
                <input
                  id="email"
                  type="email"
                  placeholder="Ej. nombre@correo.com"
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 shadow-inner outline-none focus:border-[#9BD4F5] focus:ring-2 focus:ring-[#9BD4F5]/40"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm text-slate-800">
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-pink-500"
                    checked={isCompany}
                    onChange={(e) => setIsCompany(e.target.checked)}
                  />
                  <span>Escribo desde una empresa, clínica o institución</span>
                </label>

                {isCompany && (
                  <div className="space-y-1">
                    <label htmlFor="company" className="text-xs font-semibold text-slate-700">
                      Nombre de la empresa / institución
                    </label>
                    <input
                      id="company"
                      type="text"
                      placeholder="Ej. Clínica Lumière, Hospital XYZ…"
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 shadow-inner outline-none focus:border-[#9BD4F5] focus:ring-2 focus:ring-[#9BD4F5]/40"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                    />
                  </div>
                )}
              </div>

              <div className="space-y-1">
                <label htmlFor="messageType" className="text-sm font-semibold text-slate-900">
                  Tipo de mensaje
                </label>
                <select
                  id="messageType"
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-inner outline-none focus:border-[#9BD4F5] focus:ring-2 focus:ring-[#9BD4F5]/40"
                  value={messageType}
                  onChange={(e) => setMessageType(e.target.value)}
                >
                  <option value="">Selecciona una opción</option>
                  <option value="duda">Duda o pregunta general</option>
                  <option value="error">Reporte de error o comportamiento raro en la app</option>
                  <option value="sugerencia">Sugerencia de mejora o nuevo tema</option>
                  <option value="colaboracion">Colaboración / interés profesional</option>
                  <option value="otro">Otro</option>
                </select>
              </div>

              <div className="space-y-1">
                <label htmlFor="message" className="text-sm font-semibold text-slate-900">
                  Mensaje
                </label>
                <textarea
                  id="message"
                  rows={5}
                  placeholder="Cuéntame con calma qué necesitas, qué ocurrió o en qué te gustaría que mejoremos Dr. BeautyBot."
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 shadow-inner outline-none focus:border-[#9BD4F5] focus:ring-2 focus:ring-[#9BD4F5]/40 resize-y"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <label className="flex items-start gap-2 text-xs text-slate-700">
                  <input
                    type="checkbox"
                    className="mt-[3px] h-4 w-4 accent-pink-500"
                    checked={acceptedEmailUse}
                    onChange={(e) => setAcceptedEmailUse(e.target.checked)}
                  />
                  <span>
                    Acepto que se use mi correo electrónico para responder este mensaje o pedirme
                    más detalles si es necesario. No recibiré newsletters automáticos ni publicidad.
                  </span>
                </label>
              </div>

              {feedback && (
                <p
                  className={`text-xs text-center rounded-xl px-3 py-2 border ${
                    feedbackType === 'success'
                      ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                      : 'bg-rose-100 text-rose-800 border-rose-200'
                  }`}
                >
                  {feedback}
                </p>
              )}

              <div className="flex flex-col gap-3 pt-2">
                <button
                  type="submit"
                  disabled={isSending}
                  className="w-full px-4 py-3 rounded-full bg-pink-500 hover:bg-pink-400 text-sm font-semibold text-white shadow-md transition disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isSending ? 'Enviando…' : 'Enviar mensaje'}
                </button>

                <Link
                  href={chatHref}
                  className="w-full px-4 py-3 rounded-full bg-[#FCCD78] hover:bg-[#FAD28C] text-sm font-semibold text-slate-900 shadow-md text-center transition"
                >
                  Volver al chat
                </Link>
              </div>
            </form>
          </div>
        </div>
      </section>
    </main>
  );
}