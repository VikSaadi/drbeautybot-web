'use client';

/**
 * CHANGELOG app/comparador/page.tsx
 * - 2026-03-30 v1.0: Comparador side-by-side.
 * - 2026-04-10 v1.1:
 *   - Layout tabbed en viewport estrecho (< 480px efectivos):
 *     toggle A/B para ver un procedimiento a la vez.
 *   - Columnas side-by-side se mantienen en viewports más anchos.
 *   - Reducción de padding y font sizes para marco Android.
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import procedimientosData from '@/data/procedimientos.json';

interface RedFlag {
  min: number; moneda: string; por: string; alerta: string;
}
interface Procedimiento {
  id: string; nombre: string; emoji: string; categoria: string;
  descripcion: string; duracion: string; duracion_meses: number;
  dolor: string; dolor_nivel: number;
  recuperacion: string; recuperacion_dias: number;
  resultado_inicio: string; resultado_maximo: string;
  reversible: boolean; reversible_nota?: string;
  para_que: string[]; no_recomendado: string[];
  preguntas_medico: string[];
  red_flags_precio: Record<string, RedFlag>;
}

const PROCEDIMIENTOS = procedimientosData as Procedimiento[];

function formatNum(n: number): string {
  return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

const PAISES = [
  { code: 'MX', label: '🇲🇽 México' },
  { code: 'CO', label: '🇨🇴 Colombia' },
  { code: 'ES', label: '🇪🇸 España' },
];

function DolorBar({ nivel }: { nivel: number }) {
  return (
    <div style={{ display: 'flex', gap: '3px', marginTop: '3px' }}>
      {[1, 2, 3].map((n) => (
        <div key={n} style={{
          flex: 1, height: '5px', borderRadius: '3px',
          background: n <= nivel
            ? nivel === 1 ? '#68d391' : nivel === 2 ? '#f6ad55' : '#fc8181'
            : 'var(--drb-border-soft)',
        }} />
      ))}
    </div>
  );
}

function DuracionBar({ meses }: { meses: number }) {
  const pct = Math.min((meses / 24) * 100, 100);
  return (
    <div style={{ background: 'var(--drb-border-soft)', borderRadius: '3px', height: '5px', marginTop: '3px' }}>
      <div style={{
        width: `${pct}%`, height: '100%', borderRadius: '3px',
        background: 'linear-gradient(90deg, #b794f4, #ed64a6)',
        transition: 'width 0.5s ease',
      }} />
    </div>
  );
}

function ProcCard({ proc, pais, compact = false }: { proc: Procedimiento; pais: string; compact?: boolean }) {
  const rf = proc.red_flags_precio[pais];
  const fs = compact ? '11px' : '12px';
  const fsLabel = compact ? '9.5px' : '10.5px';
  const pad = compact ? '10px 12px' : '14px 16px';

  return (
    <div style={{
      flex: 1, minWidth: 0,
      background: 'var(--drb-surface-card)',
      border: '1px solid var(--drb-border-soft)',
      borderRadius: '18px', overflow: 'hidden',
      animation: 'drb-fade-up 0.3s ease both',
    }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(183,148,244,0.25), rgba(237,100,166,0.15))',
        borderBottom: '1px solid var(--drb-border-soft)',
        padding: compact ? '10px 12px' : '14px 16px',
      }}>
        <p style={{ fontSize: compact ? '18px' : '22px', margin: '0 0 3px' }}>{proc.emoji}</p>
        <p style={{ fontSize: compact ? '13px' : '14px', fontWeight: 700, color: 'var(--drb-text-primary)', margin: 0 }}>
          {proc.nombre}
        </p>
        <p style={{ fontSize: compact ? '10px' : '11.5px', color: 'var(--drb-text-muted)', margin: '3px 0 0', lineHeight: 1.4 }}>
          {proc.descripcion}
        </p>
      </div>

      <div style={{ padding: pad, display: 'flex', flexDirection: 'column', gap: compact ? '10px' : '14px' }}>

        {/* Stats */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: fsLabel, color: 'var(--drb-text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Duración</span>
              <span style={{ fontSize: fs, fontWeight: 600, color: 'var(--drb-text-secondary)' }}>{proc.duracion}</span>
            </div>
            <DuracionBar meses={proc.duracion_meses} />
          </div>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: fsLabel, color: 'var(--drb-text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Dolor</span>
              <span style={{ fontSize: fs, fontWeight: 600, color: 'var(--drb-text-secondary)' }}>{proc.dolor}</span>
            </div>
            <DolorBar nivel={proc.dolor_nivel} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: fsLabel, color: 'var(--drb-text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Recuperación</span>
            <span style={{ fontSize: fs, fontWeight: 600, color: 'var(--drb-text-secondary)', textAlign: 'right', maxWidth: '55%' }}>{proc.recuperacion}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: fsLabel, color: 'var(--drb-text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Resultado</span>
            <span style={{ fontSize: fs, fontWeight: 600, color: 'var(--drb-text-secondary)' }}>{proc.resultado_inicio}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: fsLabel, color: 'var(--drb-text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>¿Reversible?</span>
            <span style={{
              fontSize: compact ? '10px' : '11px', fontWeight: 600, padding: '2px 7px', borderRadius: '999px',
              background: proc.reversible ? 'rgba(72,187,120,0.15)' : 'rgba(237,100,166,0.12)',
              color: proc.reversible ? '#38a169' : '#ed64a6',
              border: `1px solid ${proc.reversible ? 'rgba(72,187,120,0.3)' : 'rgba(237,100,166,0.25)'}`,
            }}>
              {proc.reversible ? '✓ Sí' : '✗ No'}
            </span>
          </div>
        </div>

        {/* Para qué sirve */}
        <div>
          <p style={{ fontSize: fsLabel, fontWeight: 700, color: 'var(--drb-accent)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            ✅ Para qué sirve
          </p>
          {proc.para_que.map((item) => (
            <div key={item} style={{ display: 'flex', gap: '6px', marginBottom: '4px' }}>
              <span style={{ color: '#68d391', fontSize: fs, flexShrink: 0 }}>✓</span>
              <span style={{ fontSize: fs, color: 'var(--drb-text-secondary)', lineHeight: 1.4 }}>{item}</span>
            </div>
          ))}
        </div>

        {/* No recomendado */}
        <div>
          <p style={{ fontSize: fsLabel, fontWeight: 700, color: '#ed64a6', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            ⚠️ Precaución si…
          </p>
          {proc.no_recomendado.map((item) => (
            <div key={item} style={{ display: 'flex', gap: '6px', marginBottom: '4px' }}>
              <span style={{ color: '#fc8181', fontSize: fs, flexShrink: 0 }}>✗</span>
              <span style={{ fontSize: fs, color: 'var(--drb-text-secondary)', lineHeight: 1.4 }}>{item}</span>
            </div>
          ))}
        </div>

        {/* Red flag precio */}
        {rf && (
          <div style={{
            padding: compact ? '8px 10px' : '10px 12px', borderRadius: '12px',
            background: 'rgba(237,100,166,0.08)',
            border: '1px solid rgba(237,100,166,0.2)',
          }}>
            <p style={{ fontSize: fsLabel, fontWeight: 700, color: '#ed64a6', margin: '0 0 3px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              🚩 Precio de alerta
            </p>
            <p style={{ fontSize: fs, color: 'var(--drb-text-primary)', margin: '0 0 3px', fontWeight: 600 }}>
              Menos de {formatNum(rf.min)} {rf.moneda} / {rf.por}
            </p>
            <p style={{ fontSize: compact ? '10px' : '11px', color: 'var(--drb-text-muted)', margin: 0, lineHeight: 1.4 }}>
              {rf.alerta}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ComparadorPage() {
  const router = useRouter();
  const [selA,    setSelA]    = useState('toxina');
  const [selB,    setSelB]    = useState('ah');
  const [pais,    setPais]    = useState('MX');
  const [activeTab, setActiveTab] = useState<'A' | 'B'>('A'); // para layout tabbed

  const procA = PROCEDIMIENTOS.find((p) => p.id === selA);
  const procB = PROCEDIMIENTOS.find((p) => p.id === selB);

  const handleChat = () => {
    const topic = `Quiero comparar ${procA?.nombre} vs ${procB?.nombre}`;
    router.push(`/chat?mode=quick&topic=${encodeURIComponent(topic)}`);
  };

  const selectStyle: React.CSSProperties = {
    width: '100%', padding: '9px 12px', borderRadius: '12px',
    border: '1px solid var(--drb-border)', appearance: 'none',
    background: 'var(--drb-input-bg)', color: 'var(--drb-text-primary)',
    fontSize: '12px', outline: 'none', cursor: 'pointer',
  };

  const activeProc = activeTab === 'A' ? procA : procB;

  return (
    <div className="drb-home-bg" style={{ minHeight: '100dvh' }}>
      <div style={{ maxWidth: '480px', margin: '0 auto', padding: '16px 12px 60px' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
          <button onClick={() => router.push('/')} style={{
            fontSize: '22px', color: 'var(--drb-text-muted)',
            background: 'none', border: 'none', cursor: 'pointer', lineHeight: 1, flexShrink: 0,
          }}>‹</button>
          <div>
            <h1 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--drb-text-primary)', margin: 0 }}>
              Comparador de procedimientos
            </h1>
            <p style={{ fontSize: '11px', color: 'var(--drb-text-muted)', margin: '1px 0 0' }}>
              Compara cualquier par lado a lado
            </p>
          </div>
        </div>

        {/* Selectores */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <select value={selA} onChange={(e) => { setSelA(e.target.value); setActiveTab('A'); }} style={selectStyle}>
              {PROCEDIMIENTOS.map((p) => (
                <option key={p.id} value={p.id}>{p.emoji} {p.nombre}</option>
              ))}
            </select>
            <span style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--drb-accent)', pointerEvents: 'none', fontSize: '12px' }}>▾</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', fontSize: '13px', flexShrink: 0, color: 'var(--drb-text-muted)', fontWeight: 600 }}>vs</div>
          <div style={{ flex: 1, position: 'relative' }}>
            <select value={selB} onChange={(e) => { setSelB(e.target.value); setActiveTab('B'); }} style={selectStyle}>
              {PROCEDIMIENTOS.map((p) => (
                <option key={p.id} value={p.id}>{p.emoji} {p.nombre}</option>
              ))}
            </select>
            <span style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--drb-accent)', pointerEvents: 'none', fontSize: '12px' }}>▾</span>
          </div>
        </div>

        {/* País */}
        <div style={{ position: 'relative', marginBottom: '16px' }}>
          <select value={pais} onChange={(e) => setPais(e.target.value)} style={{ ...selectStyle, paddingLeft: '32px' }}>
            {PAISES.map((p) => <option key={p.code} value={p.code}>{p.label}</option>)}
          </select>
          <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', fontSize: '13px', pointerEvents: 'none' }}>📍</span>
          <span style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--drb-accent)', pointerEvents: 'none', fontSize: '12px' }}>▾</span>
        </div>

        {selA === selB && (
          <div style={{
            padding: '10px 14px', borderRadius: '12px', marginBottom: '14px',
            background: 'rgba(246,173,85,0.1)', border: '1px solid rgba(246,173,85,0.3)',
          }}>
            <p style={{ fontSize: '12px', color: '#c05621', margin: 0 }}>
              ⚠️ Selecciona dos procedimientos diferentes para comparar.
            </p>
          </div>
        )}

        {selA !== selB && procA && procB && (
          <>
            {/* ── TABS A / B ── */}
            <div style={{
              display: 'flex', gap: '6px', marginBottom: '12px',
              background: 'var(--drb-surface-card)',
              border: '1px solid var(--drb-border-soft)',
              borderRadius: '14px', padding: '4px',
            }}>
              {(['A', 'B'] as const).map((tab) => {
                const proc = tab === 'A' ? procA : procB;
                const active = activeTab === tab;
                return (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    style={{
                      flex: 1, padding: '8px 10px', borderRadius: '10px',
                      border: 'none', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                      background: active ? 'linear-gradient(135deg, #b794f4, #ed64a6)' : 'transparent',
                      color: active ? 'white' : 'var(--drb-text-muted)',
                      fontSize: '12px', fontWeight: active ? 600 : 500,
                      transition: 'all 0.2s',
                      boxShadow: active ? '0 2px 8px rgba(183,148,244,0.35)' : 'none',
                    }}
                  >
                    <span style={{ fontSize: '14px' }}>{proc.emoji}</span>
                    <span style={{
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      maxWidth: '100px',
                    }}>{proc.nombre}</span>
                  </button>
                );
              })}
            </div>

            {/* Card del procedimiento activo */}
            {activeProc && (
              <ProcCard proc={activeProc} pais={pais} compact />
            )}

            {/* Mini resumen comparativo */}
            <div style={{
              marginTop: '12px',
              background: 'var(--drb-surface-card)',
              border: '1px solid var(--drb-border-soft)',
              borderRadius: '16px', overflow: 'hidden',
            }}>
              <div style={{
                padding: '10px 14px',
                borderBottom: '1px solid var(--drb-border-soft)',
                background: 'linear-gradient(135deg, rgba(183,148,244,0.1), rgba(237,100,166,0.05))',
              }}>
                <p style={{ fontSize: '11px', fontWeight: 700, color: 'var(--drb-text-primary)', margin: 0, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  ⚡ Resumen comparativo
                </p>
              </div>
              {/* Tabla comparativa compacta */}
              {[
                { label: 'Duración', a: procA.duracion, b: procB.duracion },
                { label: 'Dolor', a: procA.dolor, b: procB.dolor },
                { label: 'Recuperación', a: procA.recuperacion, b: procB.recuperacion },
                { label: 'Resultado', a: procA.resultado_inicio, b: procB.resultado_inicio },
                { label: 'Reversible', a: procA.reversible ? '✓ Sí' : '✗ No', b: procB.reversible ? '✓ Sí' : '✗ No' },
              ].map((row, i) => (
                <div key={row.label} style={{
                  display: 'grid', gridTemplateColumns: '1fr 1fr 1fr',
                  padding: '8px 12px', gap: '4px',
                  borderBottom: i < 4 ? '1px solid var(--drb-border-soft)' : 'none',
                  background: i % 2 === 0 ? 'transparent' : 'rgba(183,148,244,0.03)',
                }}>
                  <span style={{ fontSize: '10px', color: 'var(--drb-text-muted)', fontWeight: 600, textTransform: 'uppercase', alignSelf: 'center' }}>
                    {row.label}
                  </span>
                  <span style={{
                    fontSize: '10.5px', color: activeTab === 'A' ? '#b794f4' : 'var(--drb-text-secondary)',
                    fontWeight: activeTab === 'A' ? 700 : 400,
                    textAlign: 'center', alignSelf: 'center',
                  }}>
                    {procA.emoji} {row.a}
                  </span>
                  <span style={{
                    fontSize: '10.5px', color: activeTab === 'B' ? '#ed64a6' : 'var(--drb-text-secondary)',
                    fontWeight: activeTab === 'B' ? 700 : 400,
                    textAlign: 'center', alignSelf: 'center',
                  }}>
                    {procB.emoji} {row.b}
                  </span>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Disclaimer + CTA */}
        <div style={{
          marginTop: '16px', padding: '12px 14px', borderRadius: '14px',
          background: 'rgba(183,148,244,0.08)', border: '1px solid var(--drb-border-soft)',
        }}>
          <p style={{ fontSize: '11px', color: 'var(--drb-text-muted)', lineHeight: 1.5, margin: '0 0 10px' }}>
            💜 Información orientativa. Los resultados varían. Consulta siempre con un profesional certificado.
          </p>
          <button onClick={handleChat} style={{
            width: '100%', padding: '11px', borderRadius: '999px',
            background: 'linear-gradient(135deg, #b794f4, #ed64a6)',
            color: 'white', fontSize: '12px', fontWeight: 600,
            border: 'none', cursor: 'pointer',
            boxShadow: '0 4px 14px rgba(183,148,244,0.4)',
          }}>
            💬 Preguntar al bot sobre esta comparación
          </button>
        </div>

      </div>
    </div>
  );
}