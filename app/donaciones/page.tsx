'use client';

/**
 * CHANGELOG app/donaciones/page.tsx
 * - 2026-03-26 v2.0:
 *   - Rediseño completo con paleta lavanda/rosa (v2.0).
 *   - Hero: robot con corazones (Untitled.png), mix-blend-mode multiply.
 *   - Card de descripción con ✓ lavanda en las bullets.
 *   - Badge "Próximamente" con gradiente.
 *   - 3 tarjetas preview de opciones de donativo futuras.
 *   - Card de amor con fondo rosa/lavanda suave.
 *   - Lógica original preservada: chatHref dinámico según localStorage.
 *   - Eliminado parallax con JS (reemplazado por drb-home-bg estático).
 *   - Fondo: drb-home-bg (degradado suave, sin tapiz).
 */

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

// ── ASSET ─────────────────────────────────────────────────────
const HEARTS_BOT = '/images/Untitled.png';

// ── COMPONENTE ────────────────────────────────────────────────
export default function DonacionesPage() {
  const router = useRouter();
  const [chatHref, setChatHref] = useState('/chat?mode=quick');

  // Detecta perfil guardado — misma lógica que el original
  useEffect(() => {
    try {
      if (localStorage.getItem('drbeautybot_profile')) {
        setChatHref('/chat?mode=profile');
      }
    } catch { /* ignore */ }
  }, []);

  // ── Estilos reutilizables ────────────────────────────────────
  const card: React.CSSProperties = {
    background: 'var(--drb-surface-card)',
    borderRadius: '20px',
    border: '1px solid rgba(180,140,220,0.22)',
    padding: '18px',
    marginBottom: '14px',
  };

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

          {/* ── HEADER ──────────────────────────────────────── */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
            <button
              onClick={() => router.push('/')}
              style={{ fontSize: '22px', color: '#8b6fa8', background: 'none', border: 'none', cursor: 'pointer', lineHeight: 1 }}
            >‹</button>
            <span style={{ fontSize: '16px', fontWeight: 700, color: 'var(--drb-text-primary)' }}>Donativos</span>
          </div>

          {/* ── HERO — Robot con corazones ───────────────────── */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', marginBottom: '24px' }}>
            <img
              src={HEARTS_BOT}
              alt="Dr. BeautyBot"
              className="drb-img-blend"
              style={{ width: '140px', marginBottom: '12px' }}
            />
            <h1 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--drb-text-primary)', marginBottom: '6px' }}>
              Donativos 💝
            </h1>
            <p style={{ fontSize: '13px', color: 'var(--drb-text-muted)', lineHeight: 1.5, maxWidth: '320px' }}>
              Gracias por querer apoyar este proyecto. Cada aporte ayuda a mantener y mejorar Dr. BeautyBot.
            </p>
          </div>

          {/* ── DESCRIPCIÓN ─────────────────────────────────── */}
          <div style={card}>
            <p style={{ fontSize: '13px', color: '#4a3568', lineHeight: 1.65, marginBottom: '12px' }}>
              Dr. BeautyBot nació como una herramienta pensada para acercar la{' '}
              <strong style={{ color: '#6b46a8' }}>información en medicina estética</strong> a más
              personas, de forma clara, responsable y accesible.
            </p>
            <p style={{ fontSize: '13px', color: '#4a3568', lineHeight: 1.65, marginBottom: '12px' }}>
              Los donativos ayudan a sostener el tiempo de desarrollo, pruebas, servidores y nuevas
              funciones que hacen que la experiencia sea cada vez más útil y segura:
            </p>

            {/* Bullets con ✓ lavanda */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {[
                'Mejorar las respuestas y flujos de orientación.',
                'Incorporar más temas, procedimientos y escenarios reales.',
                'Seguir afinando mensajes de seguridad y advertencias responsables.',
              ].map((item, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                  <span style={{ color: '#b794f4', fontWeight: 700, flexShrink: 0, marginTop: '2px', fontSize: '14px' }}>✓</span>
                  <span style={{ fontSize: '13px', color: '#4a3568', lineHeight: 1.5 }}>{item}</span>
                </div>
              ))}
            </div>
          </div>

          {/* ── BADGE PRÓXIMAMENTE ───────────────────────────── */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: '14px',
            padding: '14px 16px', borderRadius: '18px', marginBottom: '14px',
            background: 'linear-gradient(135deg, rgba(183,148,244,0.14), rgba(237,100,166,0.09))',
            border: '1px solid rgba(183,148,244,0.3)',
          }}>
            <span style={{ fontSize: '24px', flexShrink: 0 }}>🚀</span>
            <div>
              <span style={{
                display: 'inline-block',
                background: 'linear-gradient(135deg, #b794f4, #ed64a6)',
                color: 'white', fontSize: '10px', fontWeight: 600,
                padding: '2px 10px', borderRadius: '999px', marginBottom: '5px',
              }}>Próximamente</span>
              <p style={{ fontSize: '12px', color: '#6b46a8', lineHeight: 1.5, margin: 0 }}>
                Se habilitarán diferentes opciones para apoyar el proyecto: donativos únicos,
                apoyo mensual o modalidades específicas.
              </p>
            </div>
          </div>

          {/* ── TARJETAS PREVIEW ────────────────────────────── */}
          <div style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
            {[
              { emoji: '☕', label: 'Donativo único',    desc: 'Un café para el proyecto' },
              { emoji: '💜', label: 'Mensual',           desc: 'Apoya de forma recurrente', highlight: true },
              { emoji: '⭐', label: 'Modalidad pro',     desc: 'Funciones avanzadas' },
            ].map((opt) => (
              <div
                key={opt.label}
                style={{
                  flex: 1, borderRadius: '16px', padding: '14px 10px', textAlign: 'center',
                  background: opt.highlight
                    ? 'linear-gradient(135deg, rgba(183,148,244,0.22), rgba(237,100,166,0.14))'
                    : 'var(--drb-surface)',
                  border: opt.highlight
                    ? '1px solid rgba(183,148,244,0.4)'
                    : '1px solid rgba(180,140,220,0.22)',
                }}
              >
                <div style={{ fontSize: '22px', marginBottom: '6px' }}>{opt.emoji}</div>
                <div style={{ fontSize: '10.5px', fontWeight: 600, color: '#6b46a8', marginBottom: '3px' }}>
                  {opt.label}
                </div>
                <div style={{ fontSize: '9.5px', color: '#9b82b8', lineHeight: 1.3, marginBottom: '6px' }}>
                  {opt.desc}
                </div>
                <span style={{
                  display: 'inline-block', background: 'rgba(183,148,244,0.18)',
                  color: '#8b6fa8', fontSize: '9px', padding: '2px 8px', borderRadius: '999px',
                }}>Próximamente</span>
              </div>
            ))}
          </div>

          {/* ── CARD DE AMOR ────────────────────────────────── */}
          <div style={{
            background: 'linear-gradient(135deg, rgba(237,100,166,0.1), rgba(183,148,244,0.1))',
            borderRadius: '18px', border: '1px solid rgba(237,100,166,0.25)',
            padding: '16px 18px', textAlign: 'center', marginBottom: '20px',
          }}>
            <p style={{ fontSize: '13px', color: '#6b46a8', lineHeight: 1.6 }}>
              Por ahora, el simple hecho de usar la app, compartir tu experiencia y enviar
              comentarios ya es una forma enorme de apoyar 💕
            </p>
          </div>

          {/* ── BOTÓN CTA ───────────────────────────────────── */}
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