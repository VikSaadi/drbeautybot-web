'use client';

/**
 * CHANGELOG app/cita/page.tsx
 * - 2026-03-30 v1.0:
 *   - Checklist interactivo "Antes de mi cita".
 *   - Selector de procedimiento.
 *   - 3 secciones: Antes, Durante (preguntas al médico), Después.
 *   - Items checkables con progreso visual.
 *   - Botón compartir checklist via Web Share API.
 *   - Datos estáticos desde checklists.json.
 *   - Compatible con dark mode.
 */

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import checklistsData from '@/data/checklists.json';

// ── TIPOS ─────────────────────────────────────────────────────
interface CheckItem {
  id: string; texto: string; urgencia: 'alta' | 'media' | 'baja';
}
interface Section {
  titulo: string; items: CheckItem[];
}
interface Checklist {
  nombre: string; emoji: string;
  antes: Section; durante: Section; despues: Section;
}

const CHECKLISTS = checklistsData as Record<string, Checklist>;

const PROCEDIMIENTOS_SELECT = [
  { id: 'toxina', label: '💉 Toxina botulínica' },
  { id: 'ah',     label: '✨ Ácido Hialurónico' },
  { id: 'laser',  label: '☀️ Láser / Luz pulsada' },
  { id: 'hilos',  label: '🪡 Hilos tensores' },
  { id: 'caha',   label: '🔬 Radiesse (CaHA)' },
];

const URGENCIA_COLORS = {
  alta:  { bg: 'rgba(252,129,129,0.12)', border: 'rgba(252,129,129,0.3)', dot: '#fc8181' },
  media: { bg: 'rgba(246,173,85,0.1)',   border: 'rgba(246,173,85,0.3)',  dot: '#f6ad55' },
  baja:  { bg: 'transparent',            border: 'var(--drb-border-soft)', dot: 'var(--drb-border)' },
};

// ── COMPONENTE INNER ──────────────────────────────────────────
function CitaPageInner() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const initProc     = searchParams.get('proc') ?? 'toxina';

  const [selectedProc, setSelectedProc] = useState(initProc);
  const [checked,      setChecked]      = useState<Set<string>>(new Set());
  const [activeTab,    setActiveTab]    = useState<'antes' | 'durante' | 'despues'>('antes');

  const cl = CHECKLISTS[selectedProc];

  // Reset checks al cambiar procedimiento
  useEffect(() => { setChecked(new Set()); setActiveTab('antes'); }, [selectedProc]);

  const toggleCheck = (id: string) => {
    setChecked((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  // Progreso total
  const allItems = cl
    ? [...cl.antes.items, ...cl.durante.items, ...cl.despues.items]
    : [];
  const totalChecked = allItems.filter((i) => checked.has(i.id)).length;
  const progress = allItems.length ? Math.round((totalChecked / allItems.length) * 100) : 0;

  const currentSection = cl?.[activeTab];
  const sectionItems   = currentSection?.items ?? [];
  const sectionChecked = sectionItems.filter((i) => checked.has(i.id)).length;

  // Compartir
  const handleShare = async () => {
    if (!cl) return;
    const text = [
      `📋 Checklist: ${cl.nombre}`,
      '',
      `✅ Antes de la cita:`,
      ...cl.antes.items.map((i) => `${checked.has(i.id) ? '☑' : '☐'} ${i.texto}`),
      '',
      `🗣️ Preguntas al médico:`,
      ...cl.durante.items.map((i) => `${checked.has(i.id) ? '☑' : '☐'} ${i.texto}`),
      '',
      `🔵 Después del procedimiento:`,
      ...cl.despues.items.map((i) => `${checked.has(i.id) ? '☑' : '☐'} ${i.texto}`),
      '',
      '— Dr. BeautyBot · drbeautybot.app',
    ].join('\n');

    try {
      if (navigator.share) {
        await navigator.share({ title: `Checklist ${cl.nombre}`, text });
      } else {
        await navigator.clipboard.writeText(text);
      }
    } catch { /* usuario canceló */ }
  };

  const selectStyle: React.CSSProperties = {
    width: '100%', padding: '11px 14px', borderRadius: '14px',
    border: '1px solid var(--drb-border)', appearance: 'none',
    background: 'var(--drb-input-bg)', color: 'var(--drb-text-primary)',
    fontSize: '13px', outline: 'none', cursor: 'pointer',
  };

  const TABS = [
    { key: 'antes',   label: '📅 Antes',   count: cl?.antes.items.length   ?? 0 },
    { key: 'durante', label: '🗣️ En cita', count: cl?.durante.items.length ?? 0 },
    { key: 'despues', label: '🔵 Después', count: cl?.despues.items.length ?? 0 },
  ] as const;

  return (
    <div className="drb-home-bg" style={{ minHeight: '100dvh' }}>
      <div style={{ maxWidth: '480px', margin: '0 auto', padding: '20px 16px 80px' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
          <button onClick={() => router.push('/')} style={{
            fontSize: '22px', color: 'var(--drb-text-muted)',
            background: 'none', border: 'none', cursor: 'pointer', lineHeight: 1,
          }}>‹</button>
          <div>
            <h1 style={{ fontSize: '17px', fontWeight: 700, color: 'var(--drb-text-primary)', margin: 0 }}>
              Antes de mi cita ✓
            </h1>
            <p style={{ fontSize: '12px', color: 'var(--drb-text-muted)', margin: '2px 0 0' }}>
              Checklist para llegar preparada
            </p>
          </div>
        </div>

        {/* Selector */}
        <div style={{ position: 'relative', marginBottom: '16px' }}>
          <select value={selectedProc} onChange={(e) => setSelectedProc(e.target.value)} style={selectStyle}>
            {PROCEDIMIENTOS_SELECT.map((p) => (
              <option key={p.id} value={p.id}>{p.label}</option>
            ))}
          </select>
          <span style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--drb-accent)', pointerEvents: 'none' }}>▾</span>
        </div>

        {/* Barra de progreso */}
        <div style={{
          padding: '14px 16px', borderRadius: '18px', marginBottom: '16px',
          background: 'var(--drb-surface-card)', border: '1px solid var(--drb-border-soft)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--drb-text-primary)' }}>
              {totalChecked} de {allItems.length} completados
            </span>
            <span style={{ fontSize: '13px', fontWeight: 700, color: progress === 100 ? '#38a169' : 'var(--drb-accent)' }}>
              {progress === 100 ? '✅ ¡Lista!' : `${progress}%`}
            </span>
          </div>
          <div style={{ background: 'var(--drb-border-soft)', borderRadius: '4px', height: '8px' }}>
            <div style={{
              width: `${progress}%`, height: '100%', borderRadius: '4px',
              background: progress === 100
                ? 'linear-gradient(90deg, #68d391, #38a169)'
                : 'linear-gradient(90deg, #b794f4, #ed64a6)',
              transition: 'width 0.4s ease, background 0.4s ease',
            }} />
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
          {TABS.map((tab) => {
            const isActive = activeTab === tab.key;
            const tabChecked = (cl?.[tab.key].items ?? []).filter((i) => checked.has(i.id)).length;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                style={{
                  flex: 1, padding: '9px 4px', borderRadius: '14px',
                  border: isActive ? '1.5px solid rgba(183,148,244,0.5)' : '1px solid var(--drb-border-soft)',
                  background: isActive
                    ? 'linear-gradient(135deg, rgba(183,148,244,0.2), rgba(237,100,166,0.1))'
                    : 'var(--drb-surface-card)',
                  color: isActive ? 'var(--drb-accent)' : 'var(--drb-text-muted)',
                  fontSize: '11.5px', fontWeight: isActive ? 700 : 500,
                  cursor: 'pointer',
                }}
              >
                {tab.label}
                <span style={{
                  display: 'block', fontSize: '10px', marginTop: '2px',
                  color: tabChecked === tab.count && tab.count > 0 ? '#38a169' : 'var(--drb-text-muted)',
                }}>
                  {tabChecked}/{tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Items */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
          {cl && (
            <p style={{ fontSize: '12px', color: 'var(--drb-text-muted)', marginBottom: '4px' }}>
              {currentSection?.titulo}
            </p>
          )}
          {sectionItems.map((item) => {
            const isChecked = checked.has(item.id);
            const colors = URGENCIA_COLORS[item.urgencia];
            return (
              <button
                key={item.id}
                onClick={() => toggleCheck(item.id)}
                style={{
                  display: 'flex', alignItems: 'flex-start', gap: '12px',
                  padding: '12px 14px', borderRadius: '16px', textAlign: 'left',
                  width: '100%', cursor: 'pointer',
                  background: isChecked
                    ? 'rgba(72,187,120,0.1)'
                    : item.urgencia !== 'baja' ? colors.bg : 'var(--drb-surface-card)',
                  border: isChecked
                    ? '1px solid rgba(72,187,120,0.3)'
                    : `1px solid ${colors.border}`,
                  transition: 'all 0.2s ease',
                }}
              >
                {/* Checkbox */}
                <div style={{
                  width: '22px', height: '22px', borderRadius: '8px', flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: isChecked
                    ? 'linear-gradient(135deg, #b794f4, #ed64a6)'
                    : 'var(--drb-surface-card)',
                  border: isChecked ? 'none' : `2px solid ${colors.dot}`,
                  transition: 'all 0.2s ease',
                  fontSize: '12px', color: 'white',
                }}>
                  {isChecked && '✓'}
                </div>

                <div style={{ flex: 1 }}>
                  <p style={{
                    fontSize: '13px', lineHeight: 1.45, margin: 0,
                    color: isChecked ? 'var(--drb-text-muted)' : 'var(--drb-text-primary)',
                    textDecoration: isChecked ? 'line-through' : 'none',
                    transition: 'all 0.2s',
                  }}>
                    {item.texto}
                  </p>
                  {!isChecked && item.urgencia === 'alta' && (
                    <span style={{
                      fontSize: '10px', fontWeight: 700, color: '#fc8181',
                      marginTop: '3px', display: 'block',
                    }}>
                      ⚡ Importante
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Botones */}
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={handleShare} style={{
            flex: 1, padding: '13px', borderRadius: '999px',
            background: 'var(--drb-surface-card)',
            border: '1px solid var(--drb-border-soft)',
            color: 'var(--drb-text-secondary)', fontSize: '13px', fontWeight: 600,
            cursor: 'pointer',
          }}>
            📤 Compartir checklist
          </button>
          <button onClick={() => {
            const topic = `Voy a hacerme ${PROCEDIMIENTOS_SELECT.find(p => p.id === selectedProc)?.label}, ¿qué más debo saber?`;
            router.push(`/chat?mode=quick&topic=${encodeURIComponent(topic)}`);
          }} style={{
            flex: 1, padding: '13px', borderRadius: '999px',
            background: 'linear-gradient(135deg, #b794f4, #ed64a6)',
            color: 'white', fontSize: '13px', fontWeight: 600,
            border: 'none', cursor: 'pointer',
            boxShadow: '0 4px 14px rgba(183,148,244,0.4)',
          }}>
            💬 Consultar al bot
          </button>
        </div>

      </div>
    </div>
  );
}

export default function CitaPage() {
  return (
    <Suspense fallback={
      <div className="drb-home-bg" style={{ height: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: 'var(--drb-text-muted)', fontSize: '14px' }}>Cargando checklist…</p>
      </div>
    }>
      <CitaPageInner />
    </Suspense>
  );
}