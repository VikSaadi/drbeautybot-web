'use client';

/**
 * CHANGELOG app/faq/page.tsx
 * - 2026-03-26 v2.0:
 *   - Rediseño completo con paleta lavanda/rosa (v2.0).
 *   - Hero: robot detective con lupa, mix-blend-mode multiply sobre fondo lavanda.
 *   - Acordeón: primera pregunta abierta por defecto, header con gradiente al abrirse.
 *   - Ícono +/− con gradiente lavanda/rosa cuando está abierto.
 *   - Listas ✓ lavanda (SÍ) y ✕ rosa (NO).
 *   - Botón CTA dinámico: detecta perfil guardado → /chat?mode=profile o quick.
 *   - Fondo: drb-home-bg (degradado suave, sin tapiz).
 *   - Todo el contenido del FAQ original preservado íntegramente.
 */

import { useEffect, useState, ReactNode } from 'react';
import { useRouter } from 'next/navigation';

// ── ASSET ─────────────────────────────────────────────────────
const DETECTIVE_BOT = '/images/Adobe-Express-file.png';

// ── TIPOS ─────────────────────────────────────────────────────
interface FaqItem {
  title: string;
  body: ReactNode;
}

// ── CONTENIDO (íntegramente preservado del original) ──────────
const FAQ_ITEMS: FaqItem[] = [
  {
    title: '¿Qué es Dr. BeautyBot?',
    body: (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <p>
          Dr. BeautyBot es tu{' '}
          <strong style={{ color: '#6b46a8' }}>compañero virtual en medicina estética</strong>.
          No viene a reemplazar a tu médico, sino a ayudarte a entender mejor los tratamientos,
          resolver dudas frecuentes y orientarte antes de tomar decisiones importantes sobre tu
          piel y tu cuerpo.
        </p>
        <p>
          Piensa en él como esa persona que se sabe todos los detalles técnicos, pero te los
          explica{' '}
          <strong style={{ color: '#6b46a8' }}>con calma, en lenguaje sencillo y sin juicios</strong>.
        </p>
      </div>
    ),
  },
  {
    title: 'Formas de consulta: rápida vs personalizada',
    body: (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <p>Tienes dos maneras principales de usar Dr. BeautyBot, según el tiempo y la profundidad que necesites:</p>
        <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <li style={{ display: 'flex', gap: '8px' }}>
            <span style={{ color: '#b794f4', fontWeight: 700, flexShrink: 0 }}>✓</span>
            <span><strong style={{ color: '#6b46a8' }}>Consulta rápida:</strong> ideal para dudas puntuales, por ejemplo "¿qué tan común es que salga un moretón después de toxina?" o "¿qué significa ácido hialurónico reticulado?".</span>
          </li>
          <li style={{ display: 'flex', gap: '8px' }}>
            <span style={{ color: '#b794f4', fontWeight: 700, flexShrink: 0 }}>✓</span>
            <span><strong style={{ color: '#6b46a8' }}>Consulta personalizada:</strong> si completas tu perfil, el bot tendrá más contexto sobre tu rango de edad, zona de interés y antecedentes estéticos. Así puede adaptar mejor las explicaciones a tu situación.</span>
          </li>
        </ul>
        <p>En ambos casos, la información es <strong style={{ color: '#6b46a8' }}>orientativa</strong> y no sustituye una consulta médica presencial.</p>
      </div>
    ),
  },
  {
    title: '¿Qué pasa con la información que compartes?',
    body: (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <p>La información que compartes en tu perfil se usa para poder darte respuestas más claras y contextualizadas. Por ejemplo, saber si ya te has aplicado toxina o rellenos ayuda a explicar mejor riesgos, tiempos de duración o cuidados.</p>
        <p>El objetivo es <strong style={{ color: '#6b46a8' }}>orientarte</strong>, no juzgarte ni evaluarte. Tu perfil no es una historia clínica formal, sino una guía para adaptar las explicaciones.</p>
        <p>Siempre que tengas dudas sobre privacidad o te incomode compartir algo, puedes preguntar usando solo la <strong style={{ color: '#6b46a8' }}>consulta rápida</strong>.</p>
      </div>
    ),
  },
  {
    title: 'Lo que SÍ hace Dr. BeautyBot',
    body: (
      <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {[
          'Te explica conceptos de medicina estética en lenguaje claro.',
          'Te ayuda a entender beneficios, tiempos y cuidados generales de distintos procedimientos.',
          'Te da pistas útiles para conversar mejor con tu médico (qué preguntar, qué datos son importantes, qué cosas vale la pena aclarar).',
          'Refuerza mensajes de seguridad, realismo y cuidado de la salud por encima de modas o tendencias virales.',
        ].map((item, i) => (
          <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
            <span style={{ color: '#b794f4', fontWeight: 700, flexShrink: 0, marginTop: '2px' }}>✓</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    ),
  },
  {
    title: 'Lo que NO hace Dr. BeautyBot',
    body: (
      <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {[
          'No puede sustituir una valoración médica presencial.',
          'No prescribe tratamientos, dosis ni combina productos específicos para un caso individual.',
          'No realiza diagnósticos formales.',
          'No reemplaza el consentimiento informado que debes firmar con tu médico antes de cualquier procedimiento.',
        ].map((item, i) => (
          <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
            <span style={{ color: '#ed64a6', fontWeight: 700, flexShrink: 0, marginTop: '2px' }}>✕</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    ),
  },
  {
    title: 'Tu espacio seguro para preguntar',
    body: (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <p>Muchas personas sienten vergüenza o miedo de preguntar ciertas cosas en consulta: complicaciones, precios, resultados realistas, o incluso qué ocurre si algo sale mal.</p>
        <p>Dr. BeautyBot está pensado como un <strong style={{ color: '#6b46a8' }}>espacio seguro</strong> para explorar esas dudas, entender mejor los conceptos y llegar a tu médico mucho más informada.</p>
        <p>Cuanto más claro entiendas lo que quieres y lo que no, más fácil será tomar decisiones cuidadosas sobre tu cuerpo. 💜</p>
      </div>
    ),
  },
];

// ── COMPONENTE ────────────────────────────────────────────────
export default function FaqPage() {
  const router = useRouter();
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  const [chatHref, setChatHref]   = useState('/chat?mode=quick');

  // Detecta perfil guardado para el botón CTA
  useEffect(() => {
    try {
      if (localStorage.getItem('drbeautybot_profile')) {
        setChatHref('/chat?mode=profile');
      }
    } catch { /* ignore */ }
  }, []);

  return (
    <div
      className="drb-home-bg"
      style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column' }}
    >
      <div
        className="drb-scroll-hide"
        style={{ flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}
      >
        <div
          style={{
            width: '100%',
            maxWidth: '520px',
            margin: '0 auto',
            padding: '20px 18px 60px',
            display: 'flex',
            flexDirection: 'column',
          }}
        >

          {/* ── HEADER ────────────────────────────────────────── */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
            <button
              onClick={() => router.push('/')}
              style={{ fontSize: '22px', color: 'var(--drb-text-muted)', background: 'none', border: 'none', cursor: 'pointer', lineHeight: 1 }}
            >‹</button>
            <span style={{ fontSize: '16px', fontWeight: 700, color: 'var(--drb-text-primary)' }}>Cómo funciona</span>
          </div>

          {/* ── HERO — Detective Bot ───────────────────────────── */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', marginBottom: '24px' }}>
            <img
              src={DETECTIVE_BOT}
              alt="Dr. BeautyBot detective"
              className="drb-img-blend"
              style={{ width: '120px', marginBottom: '12px' }}
            />
            <h1 style={{ fontSize: '19px', fontWeight: 700, color: 'var(--drb-text-primary)', marginBottom: '6px' }}>
              ¿Cómo funciona Dr. BeautyBot?
            </h1>
            <p style={{ fontSize: '13px', color: 'var(--drb-text-muted)', lineHeight: 1.5, maxWidth: '320px' }}>
              Tu compañero virtual en medicina estética: información clara, responsable y fácil de entender.
            </p>
          </div>

          {/* ── ACORDEÓN ──────────────────────────────────────── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '24px' }}>
            {FAQ_ITEMS.map((item, index) => {
              const isOpen = openIndex === index;
              return (
                <div
                  key={item.title}
                  style={{
                    borderRadius: '18px',
                    overflow: 'hidden',
                    border: isOpen
                      ? '1px solid rgba(183,148,244,0.4)'
                      : '1px solid rgba(180,140,220,0.22)',
                    boxShadow: isOpen
                      ? '0 4px 16px rgba(183,148,244,0.15)'
                      : '0 2px 8px rgba(130,80,200,0.06)',
                    transition: 'box-shadow 0.2s, border-color 0.2s',
                  }}
                >
                  {/* Header del item */}
                  <button
                    type="button"
                    onClick={() => setOpenIndex(isOpen ? null : index)}
                    style={{
                      width: '100%',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '14px 16px',
                      textAlign: 'left',
                      border: 'none',
                      cursor: 'pointer',
                      background: isOpen
                        ? 'linear-gradient(135deg, rgba(183,148,244,0.18), rgba(237,100,166,0.1))'
                        : 'var(--drb-surface-card)',
                      transition: 'background 0.2s',
                    }}
                  >
                    <span style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--drb-text-primary)', flex: 1, lineHeight: 1.35 }}>
                      {item.title}
                    </span>
                    {/* Ícono +/− */}
                    <div style={{
                      width: '26px', height: '26px', borderRadius: '50%', flexShrink: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '16px', fontWeight: 700,
                      background: isOpen
                        ? 'linear-gradient(135deg, #b794f4, #ed64a6)'
                        : 'rgba(183,148,244,0.15)',
                      color: isOpen ? 'white' : '#b794f4',
                      transition: 'background 0.2s, color 0.2s',
                    }}>
                      {isOpen ? '−' : '+'}
                    </div>
                  </button>

                  {/* Cuerpo del item */}
                  {isOpen && (
                    <div style={{
                      padding: '14px 16px 16px',
                      background: 'var(--drb-surface)',
                      borderTop: '1px solid var(--drb-border-soft)',
                      fontSize: '13px', color: 'var(--drb-text-secondary)', lineHeight: 1.6,
                    }}>
                      {item.body}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* ── BOTÓN CTA ─────────────────────────────────────── */}
          <button
            onClick={() => router.push(chatHref)}
            style={{
              width: '100%', padding: '14px', borderRadius: '999px',
              background: 'linear-gradient(135deg, #b794f4, #ed64a6)',
              color: 'white', fontSize: '14px', fontWeight: 600,
              border: 'none', cursor: 'pointer',
              boxShadow: '0 4px 18px rgba(183,148,244,0.45)',
            }}
          >
            💬 Volver al chat
          </button>

        </div>
      </div>
    </div>
  );
}