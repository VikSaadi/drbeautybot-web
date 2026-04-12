'use client';

/**
 * CHANGELOG app/precios/page.tsx
 * - 2026-03-30 v1.0: Precios red flag con cards simples.
 * - 2026-03-30 v1.1:
 *   - Acordeón plegable por procedimiento (mismo patrón que FAQ).
 *   - IPL con nota clínica de advertencia destacada.
 *   - Depilación Láser separada de IPL.
 *   - Ellansé como entrada independiente.
 *   - Selector de país persiste al plegar/desplegar.
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import procedimientosData from '@/data/procedimientos.json';

// ── HELPERS ───────────────────────────────────────────────────
// toLocaleString() causa hydration mismatch (server vs client).
// Usamos un formateador consistente que funciona igual en ambos.
function formatNum(n: number): string {
  return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}
interface RedFlag {
  min: number; moneda: string; por: string; alerta: string;
}
interface Procedimiento {
  id: string; nombre: string; emoji: string; descripcion: string;
  nota_clinica?: string;
  para_que: string[];
  no_recomendado: string[];
  red_flags_precio: Record<string, RedFlag>;
}

const PROCEDIMIENTOS = procedimientosData as Procedimiento[];

const PAISES = [
  { code: 'MX', label: '🇲🇽 México' },
  { code: 'CO', label: '🇨🇴 Colombia' },
  { code: 'ES', label: '🇪🇸 España' },
];

// Señales de alerta generales (independientes del precio)
const RED_FLAGS_GENERALES = [
  { icon: '📍', titulo: 'Sin consultorio formal',      desc: 'Procedimientos en domicilios, peluquerías o salones sin condiciones de esterilidad.', urgencia: 'alta' },
  { icon: '🧪', titulo: 'No muestra el producto',      desc: 'El médico no presenta el vial original sellado antes de aplicarlo. No tienes forma de verificar qué te inyectan.', urgencia: 'alta' },
  { icon: '📋', titulo: 'Sin consentimiento informado',desc: 'Todo procedimiento invasivo requiere que firmes un documento donde se explican los riesgos.', urgencia: 'alta' },
  { icon: '🩺', titulo: 'No es médico certificado',    desc: 'En la mayoría de países la medicina estética solo puede ejercerla un médico. Verifica cédula y especialidad.', urgencia: 'alta' },
  { icon: '📸', titulo: '"Garantizo resultados perfectos"', desc: 'Ningún profesional serio puede garantizar resultados exactos — dependen de factores individuales.', urgencia: 'media' },
  { icon: '⚡', titulo: 'Presión para decidir ya',     desc: '"Hoy solo, precio especial." Es una táctica de venta, no de salud. Tómate tu tiempo.', urgencia: 'media' },
  { icon: '💬', titulo: 'Sin valoración previa',       desc: 'Un buen profesional evalúa tu historial, alergias, medicamentos y expectativas antes de cualquier procedimiento.', urgencia: 'alta' },
  { icon: '📦', titulo: 'Sin registro sanitario',      desc: 'Exige ver el registro COFEPRIS (MX), INVIMA (CO) o CE (ES) del producto antes de aplicarlo.', urgencia: 'alta' },
];

// ── ACCORDION ITEM ────────────────────────────────────────────
function PrecioItem({
  proc, pais, isOpen, onToggle,
}: {
  proc: Procedimiento;
  pais: string;
  isOpen: boolean;
  onToggle: () => void;
}) {
  const router = useRouter();
  const rf = proc.red_flags_precio[pais];
  const isIPL = proc.id === 'ipl';

  return (
    <div style={{
      borderRadius: '18px', overflow: 'hidden',
      border: isOpen
        ? isIPL
          ? '1px solid rgba(246,173,85,0.4)'
          : '1px solid rgba(183,148,244,0.4)'
        : '1px solid var(--drb-border-soft)',
      boxShadow: isOpen ? '0 4px 16px rgba(130,80,200,0.1)' : '0 2px 8px rgba(130,80,200,0.05)',
      transition: 'box-shadow 0.2s, border-color 0.2s',
    }}>
      {/* Header del acordeón */}
      <button
        type="button"
        onClick={onToggle}
        style={{
          width: '100%', display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', gap: '12px',
          padding: '14px 16px', textAlign: 'left',
          border: 'none', cursor: 'pointer',
          background: isOpen
            ? isIPL
              ? 'linear-gradient(135deg, rgba(246,173,85,0.15), rgba(237,100,166,0.08))'
              : 'linear-gradient(135deg, rgba(183,148,244,0.18), rgba(237,100,166,0.1))'
            : 'var(--drb-surface-card)',
          transition: 'background 0.2s',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0 }}>
          <span style={{ fontSize: '22px', flexShrink: 0 }}>{proc.emoji}</span>
          <div style={{ minWidth: 0 }}>
            <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--drb-text-primary)', margin: 0 }}>
              {proc.nombre}
            </p>
            {!isOpen && rf && (
              <p style={{ fontSize: '11px', color: '#ed64a6', margin: '2px 0 0', fontWeight: 500 }}>
                🚩 Alerta: &lt; {formatNum(rf.min)} {rf.moneda}/{rf.por}
              </p>
            )}
          </div>
        </div>
        <span style={{
          fontSize: '18px', color: 'var(--drb-text-muted)', flexShrink: 0,
          transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
          transition: 'transform 0.25s ease',
        }}>›</span>
      </button>

      {/* Contenido desplegable */}
      {isOpen && (
        <div style={{
          padding: '0 16px 16px',
          background: 'var(--drb-surface)',
          borderTop: '1px solid var(--drb-border-soft)',
          animation: 'drb-fade-up 0.25s ease both',
        }}>

          {/* Nota clínica IPL — destacada */}
          {isIPL && proc.nota_clinica && (
            <div style={{
              margin: '14px 0',
              padding: '12px 14px', borderRadius: '14px',
              background: 'rgba(246,173,85,0.1)',
              border: '1px solid rgba(246,173,85,0.35)',
            }}>
              <p style={{ fontSize: '12.5px', color: '#c05621', lineHeight: 1.55, margin: 0, fontWeight: 500 }}>
                {proc.nota_clinica}
              </p>
            </div>
          )}

          {/* Descripción */}
          {!isIPL && (
            <p style={{ fontSize: '13px', color: 'var(--drb-text-secondary)', lineHeight: 1.5, margin: '14px 0 12px' }}>
              {proc.descripcion}
            </p>
          )}

          {/* Precio alerta */}
          {rf && (
            <div style={{
              padding: '11px 14px', borderRadius: '14px', marginBottom: '12px',
              background: 'rgba(237,100,166,0.08)',
              border: '1px solid rgba(237,100,166,0.22)',
              display: 'flex', alignItems: 'flex-start', gap: '10px',
            }}>
              <span style={{ fontSize: '20px', flexShrink: 0 }}>🚩</span>
              <div>
                <p style={{ fontSize: '13px', fontWeight: 700, color: 'var(--drb-text-primary)', margin: '0 0 3px' }}>
                  Menos de {formatNum(rf.min)} {rf.moneda} por {rf.por}
                </p>
                <p style={{ fontSize: '12px', color: 'var(--drb-text-muted)', margin: 0, lineHeight: 1.4 }}>
                  {rf.alerta}
                </p>
              </div>
            </div>
          )}

          {/* Para qué / No recomendado — en columnas */}
          <div style={{ display: 'flex', gap: '10px', marginBottom: '14px' }}>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: '10.5px', fontWeight: 700, color: '#68d391', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 6px' }}>
                ✅ Útil para
              </p>
              {proc.para_que.slice(0, 3).map((item) => (
                <p key={item} style={{ fontSize: '11.5px', color: 'var(--drb-text-secondary)', margin: '0 0 4px', lineHeight: 1.4 }}>
                  · {item}
                </p>
              ))}
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: '10.5px', fontWeight: 700, color: '#fc8181', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 6px' }}>
                ⚠️ No si
              </p>
              {proc.no_recomendado.slice(0, 3).map((item) => (
                <p key={item} style={{ fontSize: '11.5px', color: 'var(--drb-text-secondary)', margin: '0 0 4px', lineHeight: 1.4 }}>
                  · {item}
                </p>
              ))}
            </div>
          </div>

          {/* CTA */}
          <button
            onClick={() => router.push(`/chat?mode=quick&topic=${encodeURIComponent(`¿Cuánto debería costar ${proc.nombre} y cómo verificar si el precio es justo?`)}`)}
            style={{
              width: '100%', padding: '10px', borderRadius: '999px',
              background: 'rgba(183,148,244,0.1)', color: 'var(--drb-accent)',
              border: '1px solid rgba(183,148,244,0.25)',
              fontSize: '12.5px', fontWeight: 600, cursor: 'pointer',
            }}
          >
            💬 Consultar sobre precios de {proc.nombre}
          </button>
        </div>
      )}
    </div>
  );
}

// ── COMPONENTE PRINCIPAL ──────────────────────────────────────
export default function PreciosPage() {
  const router = useRouter();
  const [pais,     setPais]     = useState<string>('MX');
  const [openId,   setOpenId]   = useState<string | null>(null);
  const [showFlags, setShowFlags] = useState(false);

  const toggle = (id: string) => setOpenId((prev) => (prev === id ? null : id));

  const selectStyle: React.CSSProperties = {
    width: '100%', padding: '11px 14px 11px 36px', borderRadius: '14px',
    border: '1px solid var(--drb-border)', appearance: 'none',
    background: 'var(--drb-input-bg)', color: 'var(--drb-text-primary)',
    fontSize: '13px', outline: 'none', cursor: 'pointer',
  };

  return (
    <div className="drb-home-bg" style={{ minHeight: '100dvh' }}>
      <div style={{ maxWidth: '480px', margin: '0 auto', padding: '20px 16px 80px' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
          <button onClick={() => router.push('/')} style={{
            fontSize: '22px', color: 'var(--drb-text-muted)',
            background: 'none', border: 'none', cursor: 'pointer', lineHeight: 1,
          }}>‹</button>
          <div>
            <h1 style={{ fontSize: '17px', fontWeight: 700, color: 'var(--drb-text-primary)', margin: 0 }}>
              🚩 Precios que deben alertarte
            </h1>
            <p style={{ fontSize: '12px', color: 'var(--drb-text-muted)', margin: '2px 0 0' }}>
              Guía de referencia orientativa por país
            </p>
          </div>
        </div>

        {/* Disclaimer */}
        <div style={{
          padding: '12px 14px', borderRadius: '14px', marginBottom: '16px',
          background: 'rgba(183,148,244,0.08)', border: '1px solid var(--drb-border-soft)',
        }}>
          <p style={{ fontSize: '12px', color: 'var(--drb-text-muted)', lineHeight: 1.5, margin: 0 }}>
            Los precios varían por ciudad, médico y calidad del producto. Esta guía señala rangos{' '}
            <strong style={{ color: 'var(--drb-accent)' }}>mínimos de alerta</strong> — valores que deben invitarte a investigar más, no necesariamente indican fraude.
          </p>
        </div>

        {/* Selector país */}
        <div style={{ position: 'relative', marginBottom: '20px' }}>
          <select value={pais} onChange={(e) => setPais(e.target.value)} style={selectStyle}>
            {PAISES.map((p) => <option key={p.code} value={p.code}>{p.label}</option>)}
          </select>
          <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '14px', pointerEvents: 'none' }}>📍</span>
          <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--drb-accent)', pointerEvents: 'none' }}>▾</span>
        </div>

        {/* Acordeón procedimientos */}
        <p style={{
          fontSize: '11px', fontWeight: 700, color: 'var(--drb-text-muted)',
          textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '12px',
        }}>
          Toca para ver detalles
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '28px' }}>
          {PROCEDIMIENTOS.map((proc) => (
            <PrecioItem
              key={proc.id}
              proc={proc}
              pais={pais}
              isOpen={openId === proc.id}
              onToggle={() => toggle(proc.id)}
            />
          ))}
        </div>

        {/* Señales generales — también plegable */}
        <button
          type="button"
          onClick={() => setShowFlags(!showFlags)}
          style={{
            width: '100%', display: 'flex', justifyContent: 'space-between',
            alignItems: 'center', padding: '14px 16px', borderRadius: '18px',
            border: showFlags ? '1px solid rgba(252,129,129,0.4)' : '1px solid var(--drb-border-soft)',
            background: showFlags
              ? 'linear-gradient(135deg, rgba(252,129,129,0.12), rgba(237,100,166,0.08))'
              : 'var(--drb-surface-card)',
            cursor: 'pointer', marginBottom: showFlags ? 0 : '20px',
            transition: 'all 0.2s',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '20px' }}>🚨</span>
            <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--drb-text-primary)', margin: 0 }}>
              Señales de alerta independientes del precio
            </p>
          </div>
          <span style={{
            fontSize: '18px', color: 'var(--drb-text-muted)',
            transform: showFlags ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.25s',
          }}>›</span>
        </button>

        {showFlags && (
          <div style={{
            borderRadius: '0 0 18px 18px',
            border: '1px solid rgba(252,129,129,0.3)',
            borderTop: 'none',
            background: 'var(--drb-surface)',
            padding: '12px 14px',
            marginBottom: '20px',
            display: 'flex', flexDirection: 'column', gap: '10px',
          }}>
            {RED_FLAGS_GENERALES.map((flag) => (
              <div
                key={flag.titulo}
                style={{
                  padding: '12px 14px', borderRadius: '14px',
                  background: flag.urgencia === 'alta' ? 'rgba(252,129,129,0.08)' : 'rgba(246,173,85,0.08)',
                  border: `1px solid ${flag.urgencia === 'alta' ? 'rgba(252,129,129,0.22)' : 'rgba(246,173,85,0.22)'}`,
                  display: 'flex', gap: '12px', alignItems: 'flex-start',
                }}
              >
                <span style={{ fontSize: '20px', flexShrink: 0 }}>{flag.icon}</span>
                <div>
                  <p style={{ fontSize: '13px', fontWeight: 700, color: 'var(--drb-text-primary)', margin: '0 0 3px' }}>
                    {flag.titulo}
                  </p>
                  <p style={{ fontSize: '12px', color: 'var(--drb-text-secondary)', lineHeight: 1.5, margin: 0 }}>
                    {flag.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* CTA final */}
        <button
          onClick={() => router.push('/chat?mode=quick&topic=¿Cómo puedo verificar si un médico estético es confiable?')}
          style={{
            width: '100%', padding: '14px', borderRadius: '999px',
            background: 'linear-gradient(135deg, #b794f4, #ed64a6)',
            color: 'white', fontSize: '14px', fontWeight: 600,
            border: 'none', cursor: 'pointer',
            boxShadow: '0 4px 18px rgba(183,148,244,0.4)',
          }}
        >
          💬 ¿Cómo verificar si un médico es confiable?
        </button>

      </div>
    </div>
  );
}