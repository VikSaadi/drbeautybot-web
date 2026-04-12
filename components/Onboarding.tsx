'use client';

/**
 * CHANGELOG components/Onboarding.tsx
 * - 2026-03-26 v1.0:
 *   - 4 pantallas animadas: Bienvenida, Funciones, Perfil, Listo.
 *   - Transición slide horizontal entre pantallas.
 *   - Barra de progreso superior.
 *   - Dots indicadores que se expanden al estar activos.
 *   - Se muestra solo una vez: localStorage key 'drb_onboarding_done'.
 *   - Botón Saltar en todas menos la última.
 *   - Totalmente compatible con dark mode (usa variables CSS).
 *   - Se puede relanzar llamando resetOnboarding() o borrando localStorage.
 */

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

// ── ASSETS ────────────────────────────────────────────────────
const DON_REDONDON  = '/images/DON-REDONDON.png';
const CLIPBOARD_BOT = '/images/Untitled-(1).png';

// ── CONSTANTE ─────────────────────────────────────────────────
const ONBOARDING_KEY = 'drb_onboarding_done';

// ── HOOK PÚBLICO — usar en page.tsx ───────────────────────────
export function useOnboarding() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem(ONBOARDING_KEY)) setShow(true);
    } catch { /* ignore */ }
  }, []);

  const dismiss = () => {
    try { localStorage.setItem(ONBOARDING_KEY, '1'); } catch { /* ignore */ }
    setShow(false);
  };

  return { show, dismiss };
}

// ── FEATURE ITEMS ─────────────────────────────────────────────
const FEATURES = [
  { emoji: '💉', title: 'Resuelve tus dudas',      desc: 'Botox, rellenos, láser y más — sin juicios' },
  { emoji: '🎯', title: 'Orientación personalizada',desc: 'Adaptada a tu perfil clínico único' },
  { emoji: '🔒', title: 'Privado y seguro',          desc: 'Tu información nunca se comparte con terceros' },
];

// ── COMPONENTE PRINCIPAL ──────────────────────────────────────
interface OnboardingProps {
  onDismiss: () => void;
}

export default function Onboarding({ onDismiss }: OnboardingProps) {
  const router = useRouter();
  const [step,      setStep]      = useState(0);
  const [direction, setDirection] = useState<'forward' | 'back'>('forward');
  const total = 4;

  const goNext = () => {
    if (step >= total - 1) return;
    setDirection('forward');
    setStep((s) => s + 1);
  };

  const goBack = () => {
    if (step === 0) return;
    setDirection('back');
    setStep((s) => s - 1);
  };

  const finish = (goToProfile = false) => {
    onDismiss();
    if (goToProfile) router.push('/profile');
  };

  // ── Slide 1: Bienvenida ───────────────────────────────────
  const Slide0 = (
    <div className="drb-ob-slide" style={{ gap: '0' }}>
      {/* Sparkles */}
      <div style={{ display: 'flex', justifyContent: 'space-around', width: '100%', marginBottom: '8px' }}>
        {['✨','💜','✨','💜','✨'].map((s, i) => (
          <span key={i} className="drb-twinkle" style={{
            fontSize: '18px', animationDelay: `${i * 0.4}s`,
          }}>{s}</span>
        ))}
      </div>

      {/* Robot flotante */}
      <img
        src={DON_REDONDON}
        alt="Don Redondón"
        className="drb-float"
        style={{
          width: '140px', marginBottom: '20px',
          mixBlendMode: 'multiply',
          filter: 'drop-shadow(0 12px 24px rgba(183,148,244,0.4))',
        }}
      />

      <h1 className="drb-ob-title">¡Hola! Soy<br/>Dr. BeautyBot 👋</h1>
      <p className="drb-ob-sub" style={{ marginTop: '8px' }}>
        Tu asistente de medicina estética disponible las 24 horas, los 7 días de la semana.
      </p>
    </div>
  );

  // ── Slide 2: Funciones ────────────────────────────────────
  const Slide1 = (
    <div className="drb-ob-slide" style={{ gap: '0' }}>
      <h1 className="drb-ob-title" style={{ marginBottom: '20px' }}>
        ¿Qué puedo<br/>hacer por ti?
      </h1>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%' }}>
        {FEATURES.map((f, i) => (
          <div
            key={f.title}
            className="drb-ob-feature"
            style={{ animationDelay: `${i * 0.12}s` }}
          >
            <div className="drb-ob-feature-icon">{f.emoji}</div>
            <div>
              <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--drb-ob-text)', margin: 0 }}>
                {f.title}
              </p>
              <p style={{ fontSize: '12px', color: 'var(--drb-ob-subtext)', margin: '2px 0 0', lineHeight: 1.4 }}>
                {f.desc}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  // ── Slide 3: Perfil ───────────────────────────────────────
  const Slide2 = (
    <div className="drb-ob-slide" style={{ gap: '0' }}>
      <img
        src={CLIPBOARD_BOT}
        alt="Robot con cuaderno"
        className="drb-img-blend"
        style={{ width: '95px', marginBottom: '14px' }}
      />
      <h1 className="drb-ob-title" style={{ marginBottom: '8px' }}>Cuéntame<br/>sobre ti ✍️</h1>
      <p className="drb-ob-sub" style={{ marginBottom: '20px' }}>
        Opcional pero recomendado. Las respuestas serán mucho más precisas.
      </p>

      {/* Preview del formulario — mini campos estáticos, sin animación */}
      <div style={{
        width: '100%', padding: '14px 16px', borderRadius: '20px',
        background: 'var(--drb-ob-feature-bg)',
        border: '1px solid var(--drb-border-soft)',
      }}>
        <p style={{
          fontSize: '10px', color: 'var(--drb-accent)', fontWeight: 700,
          marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.06em',
        }}>
          Vista previa del perfil
        </p>
        {[
          { label: 'Nombre',   value: 'Ej. Laura, Ana…',    filled: false },
          { label: 'País',     value: '🇲🇽 México',           filled: true  },
          { label: 'Edad',     value: '26–35 años',          filled: true  },
          { label: 'Intereses',value: 'Botox, rellenos…',    filled: false },
        ].map((field) => (
          <div key={field.label} style={{ marginBottom: '8px' }}>
            <p style={{
              fontSize: '9px', fontWeight: 700,
              color: 'var(--drb-accent)', margin: '0 0 4px',
              textTransform: 'uppercase', letterSpacing: '0.05em',
            }}>
              {field.label}
            </p>
            <div style={{
              padding: '7px 12px', borderRadius: '10px',
              background: field.filled
                ? 'linear-gradient(135deg, rgba(183,148,244,0.25), rgba(237,100,166,0.15))'
                : 'rgba(183,148,244,0.07)',
              border: `1px solid ${field.filled
                ? 'rgba(183,148,244,0.4)'
                : 'rgba(183,148,244,0.15)'}`,
              fontSize: '12px',
              color: field.filled ? 'var(--drb-ob-text)' : 'var(--drb-ob-subtext)',
              fontStyle: field.filled ? 'normal' : 'italic',
            }}>
              {field.value}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  // ── Slide 4: Listo ────────────────────────────────────────
  const Slide3 = (
    <div className="drb-ob-slide" style={{ gap: '0', position: 'relative' }}>
      {/* Confetti */}
      {['🎊','💜','✨','🎉','💖'].map((c, i) => (
        <span
          key={i}
          style={{
            position: 'absolute', top: '10px',
            left: `${15 + i * 18}%`,
            fontSize: '18px',
            animation: `drb-confetti-fall ${1.8 + i * 0.3}s ease-in infinite`,
            animationDelay: `${i * 0.25}s`,
            pointerEvents: 'none',
          }}
        >{c}</span>
      ))}

      {/* Círculo con pop-in */}
      <div
        className="drb-pop-in"
        style={{
          width: '120px', height: '120px', borderRadius: '50%',
          background: 'var(--drb-gradient-cta)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '52px', marginBottom: '22px',
          boxShadow: '0 8px 32px rgba(183,148,244,0.5)',
        }}
      >🤖</div>

      <h1 className="drb-ob-title">¡Todo listo!</h1>
      <p className="drb-ob-sub" style={{ marginTop: '10px' }}>
        Empieza con una consulta rápida o completa tu perfil para respuestas más personalizadas.
      </p>
    </div>
  );

  const slides = [Slide0, Slide1, Slide2, Slide3];
  const isFirst = step === 0;
  const isLast  = step === total - 1;

  return (
    <div className="drb-ob-overlay">

      {/* Barra de progreso */}
      <div className="drb-ob-progress">
        <div className="drb-ob-progress-fill" style={{ width: `${((step + 1) / total) * 100}%` }} />
      </div>

      {/* ── Header: atrás + saltar ────────────────────────── */}
      <div style={{
        flexShrink: 0, display: 'flex',
        justifyContent: 'space-between', alignItems: 'center',
        padding: '12px 20px 0',
      }}>
        {/* Botón atrás — invisible en slide 1 */}
        <button
          onClick={goBack}
          style={{
            display: 'flex', alignItems: 'center', gap: '4px',
            padding: '6px 10px', borderRadius: '999px',
            background: 'transparent',
            border: '1px solid var(--drb-border-soft)',
            color: 'var(--drb-ob-subtext)', fontSize: '13px',
            cursor: 'pointer',
            opacity: isFirst ? 0 : 1,
            pointerEvents: isFirst ? 'none' : 'auto',
            transition: 'opacity 0.2s',
          }}
        >
          ← Atrás
        </button>

        {/* Saltar — oculto en el último slide */}
        {!isLast ? (
          <button
            onClick={() => finish(false)}
            style={{
              padding: '6px 14px', borderRadius: '999px',
              background: 'transparent',
              border: '1px solid var(--drb-border-soft)',
              color: 'var(--drb-ob-subtext)', fontSize: '13px',
              cursor: 'pointer',
            }}
          >
            Saltar
          </button>
        ) : <div style={{ width: '60px' }} /> /* spacer */}
      </div>

      {/* Slide actual — key + direction para animación correcta */}
      <div
        key={step}
        style={{
          flex: 1,
          animation: `${direction === 'back' ? 'drb-slide-in-back' : 'drb-slide-in'} 0.35s ease both`,
        }}
      >
        {slides[step]}
      </div>

      {/* ── Bottom nav ─────────────────────────────────────── */}
      <div style={{
        flexShrink: 0, padding: '8px 24px 28px',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px',
      }}>
        {/* Dots — clicables */}
        <div style={{ display: 'flex', gap: '8px' }}>
          {Array.from({ length: total }).map((_, i) => (
            <div
              key={i}
              onClick={() => { setDirection(i < step ? 'back' : 'forward'); setStep(i); }}
              className={`drb-ob-dot ${i === step ? 'active' : ''}`}
              style={{ cursor: 'pointer' }}
            />
          ))}
        </div>

        {/* Botón principal */}
        {isLast ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%' }}>
            <button
              onClick={() => finish(false)}
              style={{
                width: '100%', padding: '14px', borderRadius: '999px',
                background: 'var(--drb-gradient-cta)',
                color: 'white', fontSize: '15px', fontWeight: 600,
                border: 'none', cursor: 'pointer',
                boxShadow: '0 4px 18px rgba(183,148,244,0.5)',
              }}
            >
              ✨ ¡Empecemos!
            </button>
            <button
              onClick={() => finish(true)}
              style={{
                width: '100%', padding: '12px', borderRadius: '999px',
                background: 'var(--drb-ob-feature-bg)',
                color: 'var(--drb-ob-subtext)', fontSize: '13px', fontWeight: 500,
                border: '1px solid var(--drb-border-soft)', cursor: 'pointer',
              }}
            >
              Completar mi perfil primero →
            </button>
          </div>
        ) : (
          <button
            onClick={goNext}
            style={{
              width: '100%', padding: '13px', borderRadius: '999px',
              background: 'var(--drb-gradient-cta)',
              color: 'white', fontSize: '14px', fontWeight: 600,
              border: 'none', cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(183,148,244,0.45)',
            }}
          >
            {step === total - 2 ? '¡Listo! 🎉' : 'Siguiente →'}
          </button>
        )}
      </div>
    </div>
  );
}