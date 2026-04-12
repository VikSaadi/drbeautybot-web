'use client';

/**
 * CHANGELOG app/contact/page.tsx
 * - 2026-03-26 v2.0:
 *   - Rediseño completo con paleta lavanda/rosa (v2.0).
 *   - Hero: robot con buzón y carta (robotingo-ok.png), mix-blend-mode multiply.
 *   - Inputs, selects y textarea con bordes lavanda y border-radius 14px.
 *   - Checkbox empresa con estilo v2.0 (gradiente al seleccionarse).
 *   - Consent con tarjeta lavanda suave.
 *   - Feedback de éxito/error con colores v2.0.
 *   - Toda la lógica original preservada: fetch /api/contact, validaciones,
 *     estados isSending/feedback, chatHref dinámico según localStorage.
 *   - Eliminado tapiz animado y fondo crema → drb-home-bg.
 */

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

// ── ASSET ─────────────────────────────────────────────────────
const MAILBOT = '/images/robotingo-ok.png';

// ── ESTILOS BASE ─────────────────────────────────────────────
const inputStyle: React.CSSProperties = {
  width: '100%', padding: '11px 14px', borderRadius: '14px',
  border: '1px solid rgba(180,140,220,0.3)',
  background: 'rgba(255,255,255,0.88)',
  fontSize: '13px', color: 'var(--drb-text-primary)', outline: 'none',
  fontFamily: 'inherit',
};

const labelStyle: React.CSSProperties = {
  fontSize: '12px', fontWeight: 600, color: '#6b46a8',
  display: 'block', marginBottom: '6px',
};

// ── COMPONENTE ────────────────────────────────────────────────
export default function ContactPage() {
  const router = useRouter();

  const [chatHref,         setChatHref]         = useState('/chat?mode=quick');
  const [name,             setName]             = useState('');
  const [email,            setEmail]            = useState('');
  const [isCompany,        setIsCompany]        = useState(false);
  const [companyName,      setCompanyName]      = useState('');
  const [messageType,      setMessageType]      = useState('');
  const [message,          setMessage]          = useState('');
  const [acceptedEmailUse, setAcceptedEmailUse] = useState(true);
  const [isSending,        setIsSending]        = useState(false);
  const [feedback,         setFeedback]         = useState<string | null>(null);
  const [feedbackType,     setFeedbackType]     = useState<'success' | 'error' | null>(null);

  // Detecta perfil guardado
  useEffect(() => {
    try {
      if (localStorage.getItem('drbeautybot_profile')) setChatHref('/chat?mode=profile');
    } catch { /* ignore */ }
  }, []);

  // ── Submit — lógica original preservada ──────────────────────
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
      setFeedback('Por favor completa los campos principales: nombre, correo, tipo de mensaje y mensaje.');
      setFeedbackType('error');
      return;
    }

    setIsSending(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name, email,
          company: isCompany ? companyName : undefined,
          messageType, message, consent: acceptedEmailUse,
        }),
      });

      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data?.ok) throw new Error(data?.error || 'No se pudo enviar el mensaje.');

      setFeedback('¡Gracias por tu mensaje! Lo revisaré con mucho cuidado 💕');
      setFeedbackType('success');
      setIsCompany(false); setCompanyName('');
      setMessageType(''); setMessage('');
    } catch (error) {
      console.error('Error al enviar mensaje de contacto:', error);
      setFeedback('Hubo un problema al enviar tu mensaje. Intenta de nuevo más tarde, por favor.');
      setFeedbackType('error');
    } finally {
      setIsSending(false);
    }
  };

  // ── RENDER ────────────────────────────────────────────────────
  return (
    <div
      className="drb-home-bg"
      style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column' }}
    >
      <div
        className="drb-scroll-hide"
        style={{ flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}
      >
        <div style={{
          width: '100%', maxWidth: '480px', margin: '0 auto',
          padding: '20px 18px 60px',
          display: 'flex', flexDirection: 'column',
        }}>

          {/* ── HEADER ────────────────────────────────────────── */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
            <button
              onClick={() => router.push('/')}
              style={{ fontSize: '22px', color: '#8b6fa8', background: 'none', border: 'none', cursor: 'pointer', lineHeight: 1 }}
            >‹</button>
            <span style={{ fontSize: '16px', fontWeight: 700, color: 'var(--drb-text-primary)' }}>Contacto</span>
          </div>

          {/* ── HERO ──────────────────────────────────────────── */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', marginBottom: '24px' }}>
            <img
              src={MAILBOT}
              alt="Dr. BeautyBot con buzón"
              className="drb-img-blend"
              style={{ width: '130px', marginBottom: '12px' }}
            />
            <h1 style={{ fontSize: '19px', fontWeight: 700, color: 'var(--drb-text-primary)', marginBottom: '6px' }}>
              Contacto 💌
            </h1>
            <p style={{ fontSize: '13px', color: 'var(--drb-text-muted)', lineHeight: 1.5, maxWidth: '320px' }}>
              ¿Tienes dudas, comentarios o ideas para mejorar Dr. BeautyBot? Cuéntame y revisaré
              tu mensaje con mucho cuidado.
            </p>
          </div>

          {/* ── FORMULARIO ────────────────────────────────────── */}
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

            {/* Nombre */}
            <div>
              <label style={labelStyle}>Nombre completo</label>
              <input
                type="text" placeholder="Ej. Laura González"
                value={name} onChange={(e) => setName(e.target.value)}
                style={{ ...inputStyle, borderColor: name ? 'rgba(183,148,244,0.5)' : undefined }}
              />
            </div>

            {/* Correo */}
            <div>
              <label style={labelStyle}>Correo electrónico</label>
              <input
                type="email" placeholder="Ej. nombre@correo.com"
                value={email} onChange={(e) => setEmail(e.target.value)}
                style={{ ...inputStyle, borderColor: email ? 'rgba(183,148,244,0.5)' : undefined }}
              />
            </div>

            {/* Checkbox empresa */}
            <button
              type="button"
              onClick={() => setIsCompany(!isCompany)}
              style={{
                display: 'flex', alignItems: 'center', gap: '10px',
                padding: '10px 14px', borderRadius: '14px', textAlign: 'left',
                background: isCompany
                  ? 'linear-gradient(135deg, rgba(183,148,244,0.18), rgba(237,100,166,0.1))'
                  : 'var(--drb-surface-card)',
                border: isCompany
                  ? '1px solid rgba(183,148,244,0.4)'
                  : '1px solid rgba(180,140,220,0.22)',
                cursor: 'pointer',
              }}
            >
              <div style={{
                width: '18px', height: '18px', borderRadius: '6px', flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: isCompany ? 'linear-gradient(135deg, #b794f4, #ed64a6)' : 'white',
                border: isCompany ? 'none' : '1.5px solid rgba(180,140,220,0.4)',
                fontSize: '11px', color: 'white',
              }}>{isCompany && '✓'}</div>
              <span style={{ fontSize: '13px', color: '#2d1a4a' }}>
                Escribo desde una empresa, clínica o institución
              </span>
            </button>

            {/* Campo empresa condicional */}
            {isCompany && (
              <div>
                <label style={labelStyle}>Nombre de la empresa / institución</label>
                <input
                  type="text" placeholder="Ej. Clínica Lumière, Hospital XYZ…"
                  value={companyName} onChange={(e) => setCompanyName(e.target.value)}
                  style={{ ...inputStyle, borderColor: companyName ? 'rgba(183,148,244,0.5)' : undefined }}
                />
              </div>
            )}

            {/* Tipo de mensaje */}
            <div>
              <label style={labelStyle}>Tipo de mensaje</label>
              <div style={{ position: 'relative' }}>
                <select
                  value={messageType} onChange={(e) => setMessageType(e.target.value)}
                  style={{
                    ...inputStyle, appearance: 'none',
                    borderColor: messageType ? 'rgba(183,148,244,0.5)' : undefined,
                  }}
                >
                  <option value="">Selecciona una opción</option>
                  <option value="duda">Duda o pregunta general</option>
                  <option value="error">Reporte de error o comportamiento raro en la app</option>
                  <option value="sugerencia">Sugerencia de mejora o nuevo tema</option>
                  <option value="colaboracion">Colaboración / interés profesional</option>
                  <option value="otro">Otro</option>
                </select>
                <span style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', color: '#b794f4', pointerEvents: 'none' }}>▾</span>
              </div>
            </div>

            {/* Mensaje */}
            <div>
              <label style={labelStyle}>Mensaje</label>
              <textarea
                rows={5}
                placeholder="Cuéntame con calma qué necesitas, qué ocurrió o en qué te gustaría que mejoremos Dr. BeautyBot."
                value={message} onChange={(e) => setMessage(e.target.value)}
                style={{
                  ...inputStyle,
                  resize: 'vertical', lineHeight: 1.55,
                  borderColor: message ? 'rgba(183,148,244,0.5)' : undefined,
                }}
              />
            </div>

            {/* Consent */}
            <button
              type="button"
              onClick={() => setAcceptedEmailUse(!acceptedEmailUse)}
              style={{
                display: 'flex', alignItems: 'flex-start', gap: '10px',
                padding: '12px 14px', borderRadius: '14px', textAlign: 'left',
                background: acceptedEmailUse
                  ? 'linear-gradient(135deg, rgba(183,148,244,0.12), rgba(237,100,166,0.07))'
                  : 'rgba(255,255,255,0.75)',
                border: acceptedEmailUse
                  ? '1px solid rgba(183,148,244,0.3)'
                  : '1px solid rgba(180,140,220,0.22)',
                cursor: 'pointer',
              }}
            >
              <div style={{
                width: '18px', height: '18px', borderRadius: '6px', flexShrink: 0, marginTop: '1px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: acceptedEmailUse ? 'linear-gradient(135deg, #b794f4, #ed64a6)' : 'white',
                border: acceptedEmailUse ? 'none' : '1.5px solid rgba(180,140,220,0.4)',
                fontSize: '11px', color: 'white',
              }}>{acceptedEmailUse && '✓'}</div>
              <p style={{ fontSize: '12px', color: '#6b46a8', lineHeight: 1.5, margin: 0 }}>
                Acepto que se use mi correo electrónico para responder este mensaje o pedirme más
                detalles si es necesario. No recibiré newsletters automáticos ni publicidad.
              </p>
            </button>

            {/* Feedback inline */}
            {feedback && (
              <div style={{
                padding: '12px 14px', borderRadius: '14px', textAlign: 'center',
                fontSize: '12px', lineHeight: 1.5,
                background: feedbackType === 'success'
                  ? 'rgba(72,187,120,0.12)' : 'rgba(237,100,166,0.12)',
                border: feedbackType === 'success'
                  ? '1px solid rgba(72,187,120,0.3)' : '1px solid rgba(237,100,166,0.3)',
                color: feedbackType === 'success' ? '#276749' : '#9b2c5a',
              }}>
                {feedback}
              </div>
            )}

            {/* Botones */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', paddingTop: '4px' }}>
              <button
                type="submit"
                disabled={isSending}
                style={{
                  width: '100%', padding: '14px', borderRadius: '999px',
                  background: 'linear-gradient(135deg, #b794f4, #ed64a6)',
                  color: 'white', fontSize: '14px', fontWeight: 600,
                  border: 'none', cursor: isSending ? 'not-allowed' : 'pointer',
                  boxShadow: '0 4px 18px rgba(183,148,244,0.45)',
                  opacity: isSending ? 0.65 : 1,
                }}
              >
                {isSending ? 'Enviando…' : '📨 Enviar mensaje'}
              </button>
              <button
                type="button"
                onClick={() => router.push(chatHref)}
                style={{
                  width: '100%', padding: '12px', borderRadius: '999px',
                  background: 'var(--drb-surface-card)', color: 'var(--drb-text-muted)',
                  fontSize: '13px', fontWeight: 500,
                  border: '1px solid var(--drb-border-soft)', cursor: 'pointer',
                }}
              >
                💬 Volver al chat
              </button>
            </div>

          </form>

          {/* ── REDES SOCIALES ────────────────────────────────── */}
          <div style={{
            marginTop: '28px', paddingTop: '24px',
            borderTop: '1px solid var(--drb-border-soft)',
            display: 'flex', flexDirection: 'column', gap: '10px',
          }}>
            <p style={{ fontSize: '12px', color: 'var(--drb-text-muted)', textAlign: 'center', margin: 0 }}>
              También puedes encontrarnos en
            </p>
            <div style={{ display: 'flex', gap: '10px' }}>

              {/* Instagram */}
              <a
                href="https://instagram.com/drbeautybot"
                target="_blank" rel="noopener noreferrer"
                className="btn-scale"
                style={{
                  display: 'flex', alignItems: 'center', gap: '8px',
                  padding: '10px 16px', borderRadius: '999px',
                  background: 'var(--drb-surface-card)',
                  border: '1px solid var(--drb-border-soft)',
                  textDecoration: 'none', flexShrink: 0,
                }}
              >
                <img
                  src="/images/icons8-instagram-60.png"
                  alt="Instagram"
                  style={{ width: '22px', height: '22px', borderRadius: '6px' }}
                />
                <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--drb-text-primary)', whiteSpace: 'nowrap' }}>
                  @drbeautybot
                </span>
              </a>

              {/* Compartir app */}
              <button
                type="button"
                onClick={() => {
                  const text = '💜 Descubrí Dr. BeautyBot, tu asistente de medicina estética disponible 24/7.\n\n🤖 Descárgala gratis:\ndrbeautybot.app\n\n📸 @drbeautybot';
                  if (navigator.share) {
                    navigator.share({ title: 'Dr. BeautyBot', text }).catch(() => {});
                  } else {
                    navigator.clipboard.writeText(text);
                  }
                }}
                className="btn-scale"
                style={{
                  flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  gap: '7px', padding: '10px 16px', borderRadius: '999px',
                  background: 'linear-gradient(135deg, rgba(183,148,244,0.2), rgba(237,100,166,0.12))',
                  border: '1px solid rgba(183,148,244,0.3)',
                  cursor: 'pointer',
                }}
              >
                <span style={{ fontSize: '15px' }}>📤</span>
                <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--drb-text-secondary)', whiteSpace: 'nowrap' }}>
                  Compartir app
                </span>
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}