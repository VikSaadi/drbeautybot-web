'use client';

/**
 * CHANGELOG app/diario/page.tsx
 * - 2026-03-30 v1.0: Timeline, combos cascada, mini álbum, resize Canvas.
 * - 2026-03-30 v1.1:
 *   - Campo cantidad/gramaje (combos por procedimiento).
 *   - Cálculo automático de próxima reaplicación 🔔 desde fecha + duración.
 *   - Marcas actualizadas: Revofil Fine/Plus/Ultra en AH, Linurase en toxina.
 *   - Radiesse eliminado del combo de AH (es producto distinto).
 */

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import opcionesData from '@/data/diario-opciones.json';

// ── TIPOS ─────────────────────────────────────────────────────
interface ProcOption  { id: string; label: string; emoji: string; color: string; }
interface OpcionesData {
  procedimientos: ProcOption[];
  marcas: Record<string, string[]>;
  zonas: Record<string, string[]>;
  cantidades: Record<string, string[]>;
  duraciones: Record<string, number>;
  sesion_laser: string[];
}

interface DiarioEntry {
  id: string;
  procedimientoId: string;
  procedimientoLabel: string;
  procedimientoEmoji: string;
  procedimientoColor: string;
  marca: string;
  cantidad: string;
  zona: string;
  sesionLaser?: string;
  fecha: string;           // YYYY-MM
  fechaDisplay: string;    // "Marzo 2026"
  proximaDisplay?: string; // "Agosto 2026"
  medico: string;
  notas: string;
  fotos: string[];
  createdAt: string;
}

const OPCIONES = opcionesData as OpcionesData;
const DIARY_KEY = 'drb_diario';

// ── HELPERS ───────────────────────────────────────────────────
const MONTHS = [
  'Enero','Febrero','Marzo','Abril','Mayo','Junio',
  'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre',
];
const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 6 }, (_, i) => String(CURRENT_YEAR - i));

function monthYearDisplay(month: string, year: string): string {
  return month && year ? `${month} ${year}` : '';
}

/** Calcula fecha de próxima reaplicación */
function calcProxima(month: string, year: string, procId: string): string {
  const durMeses = OPCIONES.duraciones[procId] ?? 0;
  if (!durMeses || !month || !year) return '';
  const monthIdx = MONTHS.indexOf(month);
  if (monthIdx === -1) return '';
  const next = new Date(Number(year), monthIdx + durMeses, 1);
  return `${MONTHS[next.getMonth()]} ${next.getFullYear()}`;
}

/** Resize imagen via Canvas — max 800px, JPEG 0.75 */
async function resizeImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const MAX = 800;
      let { width, height } = img;
      if (width > MAX || height > MAX) {
        if (width > height) { height = Math.round((height * MAX) / width); width = MAX; }
        else { width = Math.round((width * MAX) / height); height = MAX; }
      }
      const canvas = document.createElement('canvas');
      canvas.width = width; canvas.height = height;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0, width, height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL('image/jpeg', 0.75));
    };
    img.onerror = reject;
    img.src = url;
  });
}

/** Captura foto — Capacitor nativo o input file en web */
async function capturePhoto(): Promise<string | null> {
  if (typeof window !== 'undefined' && (window as any).Capacitor?.isNativePlatform?.()) {
    try {
      const { Camera, CameraResultType, CameraSource } = await import('@capacitor/camera');
      const photo = await Camera.getPhoto({
        quality: 75, allowEditing: false,
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Prompt,
      });
      return photo.dataUrl ?? null;
    } catch { return null; }
  }
  return null; // fallback al input file
}

// ── COMPONENTE FORM ───────────────────────────────────────────
interface EntryFormProps {
  onSave: (entry: DiarioEntry) => void;
  onCancel: () => void;
  existing?: DiarioEntry;
}

function EntryForm({ onSave, onCancel, existing }: EntryFormProps) {
  const [procId,      setProcId]      = useState(existing?.procedimientoId ?? '');
  const [marca,       setMarca]       = useState(existing?.marca ?? '');
  const [cantidad,    setCantidad]    = useState(existing?.cantidad ?? '');
  const [zona,        setZona]        = useState(existing?.zona ?? '');
  const [sesionLaser, setSesionLaser] = useState(existing?.sesionLaser ?? '');
  const [month,       setMonth]       = useState('');
  const [year,        setYear]        = useState(String(CURRENT_YEAR));
  const [medico,      setMedico]      = useState(existing?.medico ?? '');
  const [notas,       setNotas]       = useState(existing?.notas ?? '');
  const [fotos,       setFotos]       = useState<string[]>(existing?.fotos ?? []);
  const [uploading,   setUploading]   = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const proc = OPCIONES.procedimientos.find((p) => p.id === procId);
  const marcas    = procId ? (OPCIONES.marcas[procId]    ?? []) : [];
  const zonas     = procId ? (OPCIONES.zonas[procId]     ?? []) : [];
  const cantidades = procId ? (OPCIONES.cantidades[procId] ?? []) : [];

  // Reset marca/zona/cantidad cuando cambia el procedimiento
  const handleProcChange = (id: string) => {
    setProcId(id); setMarca(''); setZona(''); setSesionLaser(''); setCantidad('');
  };

  // Agregar foto
  const handleAddPhoto = async () => {
    if (fotos.length >= 3) return;
    const native = await capturePhoto();
    if (native) {
      setFotos((prev) => [...prev, native]);
    } else {
      fileRef.current?.click();
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    setUploading(true);
    try {
      const resized = await Promise.all(
        files.slice(0, 3 - fotos.length).map(resizeImage)
      );
      setFotos((prev) => [...prev, ...resized].slice(0, 3));
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const removePhoto = (i: number) => setFotos((prev) => prev.filter((_, idx) => idx !== i));

  const handleSave = () => {
    if (!procId || !month || !year) return;
    if (!proc) return;
    const proxima = calcProxima(month, year, procId);
    const entry: DiarioEntry = {
      id:                  existing?.id ?? `diary_${Date.now()}`,
      procedimientoId:     procId,
      procedimientoLabel:  proc.label,
      procedimientoEmoji:  proc.emoji,
      procedimientoColor:  proc.color,
      marca, cantidad, zona, sesionLaser,
      fecha:               `${year}-${String(MONTHS.indexOf(month) + 1).padStart(2, '0')}`,
      fechaDisplay:        `${month} ${year}`,
      proximaDisplay:      proxima,
      medico, notas, fotos,
      createdAt:           existing?.createdAt ?? new Date().toISOString(),
    };
    onSave(entry);
  };

  const selectStyle: React.CSSProperties = {
    width: '100%', padding: '10px 14px', borderRadius: '14px',
    border: '1px solid var(--drb-border)', appearance: 'none',
    background: 'var(--drb-input-bg)', color: 'var(--drb-text-primary)',
    fontSize: '13px', outline: 'none', cursor: 'pointer',
  };
  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '10px 14px', borderRadius: '14px',
    border: '1px solid var(--drb-border)',
    background: 'var(--drb-input-bg)', color: 'var(--drb-text-primary)',
    fontSize: '13px', outline: 'none', fontFamily: 'inherit',
  };
  const labelStyle: React.CSSProperties = {
    fontSize: '11px', fontWeight: 700, color: 'var(--drb-text-muted)',
    textTransform: 'uppercase', letterSpacing: '0.05em',
    display: 'block', marginBottom: '6px',
  };
  const fieldWrap: React.CSSProperties = { marginBottom: '14px' };
  const selectWrap: React.CSSProperties = { position: 'relative' };
  const chevron: React.CSSProperties = {
    position: 'absolute', right: '12px', top: '50%',
    transform: 'translateY(-50%)', color: 'var(--drb-accent)',
    pointerEvents: 'none',
  };

  const canSave = !!procId && !!month && !!year;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>

      {/* Header form */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
        <button onClick={onCancel} style={{
          fontSize: '22px', color: 'var(--drb-text-muted)',
          background: 'none', border: 'none', cursor: 'pointer',
        }}>✕</button>
        <div>
          <h2 style={{ fontSize: '17px', fontWeight: 700, color: 'var(--drb-text-primary)', margin: 0 }}>
            {existing ? 'Editar entrada' : 'Nueva entrada ✍️'}
          </h2>
          <p style={{ fontSize: '12px', color: 'var(--drb-text-muted)', margin: '2px 0 0' }}>
            Registra tu procedimiento
          </p>
        </div>
      </div>

      {/* ── 1. PROCEDIMIENTO ──────────────────────────────── */}
      <div style={fieldWrap}>
        <label style={labelStyle}>Procedimiento *</label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {OPCIONES.procedimientos.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => handleProcChange(p.id)}
              style={{
                padding: '8px 13px', borderRadius: '999px',
                fontSize: '12.5px', fontWeight: 500, cursor: 'pointer',
                border: procId === p.id
                  ? `1.5px solid ${p.color}`
                  : '1px solid var(--drb-border-soft)',
                background: procId === p.id
                  ? `${p.color}22`
                  : 'var(--drb-surface-card)',
                color: procId === p.id ? p.color : 'var(--drb-text-secondary)',
                transition: 'all 0.15s',
              }}
            >
              {p.emoji} {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── 2. MARCA (cascada) ────────────────────────────── */}
      {procId && marcas.length > 0 && (
        <div style={fieldWrap}>
          <label style={labelStyle}>Marca / Producto</label>
          <div style={selectWrap}>
            <select value={marca} onChange={(e) => setMarca(e.target.value)} style={selectStyle}>
              <option value="">Selecciona una marca</option>
              {marcas.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
            <span style={chevron}>▾</span>
          </div>
        </div>
      )}

      {/* ── 2b. CANTIDAD / GRAMAJE ────────────────────────── */}
      {procId && cantidades.length > 0 && procId !== 'otro' && (
        <div style={fieldWrap}>
          <label style={labelStyle}>Cantidad / Gramaje</label>
          <div style={selectWrap}>
            <select value={cantidad} onChange={(e) => setCantidad(e.target.value)} style={selectStyle}>
              <option value="">Selecciona la cantidad</option>
              {cantidades.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <span style={chevron}>▾</span>
          </div>
        </div>
      )}

      {/* Sesión láser (solo si laser) */}
      {procId === 'laser' && (
        <div style={fieldWrap}>
          <label style={labelStyle}>Número de sesión</label>
          <div style={selectWrap}>
            <select value={sesionLaser} onChange={(e) => setSesionLaser(e.target.value)} style={selectStyle}>
              <option value="">Selecciona la sesión</option>
              {OPCIONES.sesion_laser.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <span style={chevron}>▾</span>
          </div>
        </div>
      )}

      {/* ── 3. ZONA (cascada) ─────────────────────────────── */}
      {procId && zonas.length > 0 && (
        <div style={fieldWrap}>
          <label style={labelStyle}>Zona de aplicación</label>
          <div style={selectWrap}>
            <select value={zona} onChange={(e) => setZona(e.target.value)} style={selectStyle}>
              <option value="">Selecciona una zona</option>
              {zonas.map((z) => <option key={z} value={z}>{z}</option>)}
            </select>
            <span style={chevron}>▾</span>
          </div>
        </div>
      )}

      {/* ── 4. FECHA ──────────────────────────────────────── */}
      <div style={fieldWrap}>
        <label style={labelStyle}>Fecha *</label>
        <div style={{ display: 'flex', gap: '8px' }}>
          <div style={{ flex: 2, ...selectWrap }}>
            <select value={month} onChange={(e) => setMonth(e.target.value)} style={selectStyle}>
              <option value="">Mes</option>
              {MONTHS.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
            <span style={chevron}>▾</span>
          </div>
          <div style={{ flex: 1, ...selectWrap }}>
            <select value={year} onChange={(e) => setYear(e.target.value)} style={selectStyle}>
              {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
            <span style={chevron}>▾</span>
          </div>
        </div>
      </div>

      {/* ── 5. MÉDICO ─────────────────────────────────────── */}
      <div style={fieldWrap}>
        <label style={labelStyle}>Médico / Clínica</label>
        <input
          type="text"
          placeholder="Ej. Dra. García, Clínica Nova…"
          value={medico}
          onChange={(e) => setMedico(e.target.value)}
          style={inputStyle}
        />
      </div>

      {/* ── 6. FOTOS (máx 3) ──────────────────────────────── */}
      <div style={fieldWrap}>
        <label style={labelStyle}>Fotos ({fotos.length}/3)</label>

        <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
          {/* Thumbnails existentes */}
          {fotos.map((foto, i) => (
            <div key={i} style={{ position: 'relative', width: '80px', height: '80px' }}>
              <img src={foto} alt={`Foto ${i + 1}`} style={{
                width: '80px', height: '80px', objectFit: 'cover',
                borderRadius: '12px',
                border: '1px solid var(--drb-border-soft)',
              }} />
              <button
                onClick={() => removePhoto(i)}
                style={{
                  position: 'absolute', top: '-6px', right: '-6px',
                  width: '20px', height: '20px', borderRadius: '50%',
                  background: '#fc8181', border: '2px solid var(--drb-surface-strong)',
                  color: 'white', fontSize: '11px', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 700,
                }}
              >✕</button>
            </div>
          ))}

          {/* Botón añadir foto */}
          {fotos.length < 3 && (
            <button
              type="button"
              onClick={handleAddPhoto}
              disabled={uploading}
              style={{
                width: '80px', height: '80px', borderRadius: '12px',
                border: '2px dashed rgba(183,148,244,0.4)',
                background: 'rgba(183,148,244,0.06)',
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                gap: '4px', cursor: 'pointer',
              }}
            >
              <span style={{ fontSize: '22px' }}>{uploading ? '⏳' : '📷'}</span>
              <span style={{ fontSize: '10px', color: 'var(--drb-accent)', fontWeight: 600 }}>
                {uploading ? 'Procesando…' : 'Añadir'}
              </span>
            </button>
          )}
        </div>

        {/* Input file oculto (fallback web) */}
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          style={{ display: 'none' }}
          onChange={handleFileChange}
        />
        <p style={{ fontSize: '10.5px', color: 'var(--drb-text-hint)', margin: 0 }}>
          Las fotos se redimensionan automáticamente a 800px para ahorrar espacio.
        </p>
      </div>

      {/* ── 7. NOTAS ──────────────────────────────────────── */}
      <div style={fieldWrap}>
        <label style={labelStyle}>Notas</label>
        <textarea
          rows={3}
          placeholder="¿Cómo fue? Resultados, observaciones, reacciones…"
          value={notas}
          onChange={(e) => setNotas(e.target.value)}
          style={{
            ...inputStyle, resize: 'none', lineHeight: 1.5,
          }}
        />
      </div>

      {/* Botón guardar */}
      <button
        type="button"
        onClick={handleSave}
        disabled={!canSave}
        style={{
          width: '100%', padding: '14px', borderRadius: '999px',
          background: canSave ? 'linear-gradient(135deg, #b794f4, #ed64a6)' : 'var(--drb-border-soft)',
          color: canSave ? 'white' : 'var(--drb-text-hint)',
          fontSize: '14px', fontWeight: 600, border: 'none', cursor: canSave ? 'pointer' : 'not-allowed',
          boxShadow: canSave ? '0 4px 18px rgba(183,148,244,0.45)' : 'none',
          transition: 'all 0.2s',
        }}
      >
        💾 {existing ? 'Guardar cambios' : 'Guardar entrada'}
      </button>
      {!canSave && (
        <p style={{ fontSize: '11px', color: 'var(--drb-text-hint)', textAlign: 'center', marginTop: '6px' }}>
          * Procedimiento y fecha son obligatorios
        </p>
      )}
    </div>
  );
}

// ── TIMELINE ENTRY ────────────────────────────────────────────
function TimelineCard({
  entry, onEdit, onDelete,
}: { entry: DiarioEntry; onEdit: () => void; onDelete: () => void }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div style={{
      display: 'flex', gap: '12px', alignItems: 'flex-start', paddingBottom: '16px',
    }}>
      {/* Dot */}
      <div style={{
        width: '16px', height: '16px', borderRadius: '50%', flexShrink: 0,
        marginTop: '16px', position: 'relative', zIndex: 1,
        background: `${entry.procedimientoColor}44`,
        border: `2px solid ${entry.procedimientoColor}`,
      }} />

      {/* Card */}
      <div style={{
        flex: 1, borderRadius: '18px', overflow: 'hidden',
        background: 'var(--drb-surface-card)',
        border: '1px solid var(--drb-border-soft)',
      }}>
        {/* Header */}
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          style={{
            width: '100%', display: 'flex', alignItems: 'center',
            gap: '10px', padding: '12px 14px', textAlign: 'left',
            background: 'transparent', border: 'none', cursor: 'pointer',
          }}
        >
          <span style={{ fontSize: '20px', flexShrink: 0 }}>{entry.procedimientoEmoji}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--drb-text-primary)', margin: 0 }}>
              {entry.procedimientoLabel}
              {entry.sesionLaser && (
                <span style={{ fontSize: '11px', color: 'var(--drb-text-muted)', fontWeight: 400, marginLeft: '6px' }}>
                  {entry.sesionLaser}
                </span>
              )}
            </p>
            <p style={{ fontSize: '11.5px', color: 'var(--drb-text-muted)', margin: '2px 0 0' }}>
              {entry.fechaDisplay}{entry.medico ? ` · ${entry.medico}` : ''}
              {entry.cantidad ? ` · ${entry.cantidad}` : ''}
            </p>
          </div>
          {/* Foto thumbnail principal */}
          {entry.fotos[0] && (
            <img src={entry.fotos[0]} alt="" style={{
              width: '42px', height: '42px', objectFit: 'cover',
              borderRadius: '10px', flexShrink: 0,
              border: '1px solid var(--drb-border-soft)',
            }} />
          )}
          <span style={{
            fontSize: '16px', color: 'var(--drb-text-muted)',
            transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s', flexShrink: 0,
          }}>›</span>
        </button>

        {/* Detalle expandido */}
        {expanded && (
          <div style={{
            borderTop: '1px solid var(--drb-border-soft)',
            padding: '12px 14px',
            animation: 'drb-fade-up 0.2s ease both',
          }}>
            {/* Tags */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '10px' }}>
              {entry.marca && (
                <span style={{
                  padding: '3px 10px', borderRadius: '999px', fontSize: '11.5px',
                  background: `${entry.procedimientoColor}18`,
                  border: `1px solid ${entry.procedimientoColor}44`,
                  color: entry.procedimientoColor, fontWeight: 500,
                }}>
                  {entry.marca}
                </span>
              )}
              {entry.cantidad && (
                <span style={{
                  padding: '3px 10px', borderRadius: '999px', fontSize: '11.5px',
                  background: 'rgba(183,148,244,0.12)',
                  border: '1px solid rgba(183,148,244,0.3)',
                  color: 'var(--drb-accent)', fontWeight: 600,
                }}>
                  {entry.cantidad}
                </span>
              )}
              {entry.sesionLaser && (
                <span style={{
                  padding: '3px 10px', borderRadius: '999px', fontSize: '11.5px',
                  background: 'var(--drb-surface)',
                  border: '1px solid var(--drb-border-soft)',
                  color: 'var(--drb-text-secondary)',
                }}>
                  {entry.sesionLaser}
                </span>
              )}
              {entry.zona && (
                <span style={{
                  padding: '3px 10px', borderRadius: '999px', fontSize: '11.5px',
                  background: 'var(--drb-surface)',
                  border: '1px solid var(--drb-border-soft)',
                  color: 'var(--drb-text-secondary)',
                }}>
                  📍 {entry.zona}
                </span>
              )}
            </div>

            {/* Notas */}
            {entry.notas && (
              <p style={{
                fontSize: '12.5px', color: 'var(--drb-text-secondary)',
                lineHeight: 1.5, margin: '0 0 10px', fontStyle: 'italic',
              }}>
                "{entry.notas}"
              </p>
            )}

            {/* Mini álbum de fotos */}
            {entry.fotos.length > 0 && (
              <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                {entry.fotos.map((foto, i) => (
                  <img key={i} src={foto} alt={`Foto ${i + 1}`} style={{
                    width: '72px', height: '72px', objectFit: 'cover',
                    borderRadius: '12px', border: '1px solid var(--drb-border-soft)',
                  }} />
                ))}
              </div>
            )}

            {/* 🔔 Próxima reaplicación */}
            {entry.proximaDisplay && (
              <div style={{
                padding: '8px 12px', borderRadius: '12px', marginBottom: '12px',
                background: 'linear-gradient(135deg, rgba(183,148,244,0.12), rgba(237,100,166,0.08))',
                border: '1px solid rgba(183,148,244,0.25)',
                display: 'flex', alignItems: 'center', gap: '8px',
              }}>
                <span style={{ fontSize: '16px' }}>🔔</span>
                <p style={{ fontSize: '12.5px', color: 'var(--drb-accent)', fontWeight: 600, margin: 0 }}>
                  Próxima: {entry.proximaDisplay}
                </p>
              </div>
            )}

            {/* Acciones */}
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={onEdit}
                style={{
                  flex: 1, padding: '8px', borderRadius: '999px',
                  background: 'var(--drb-surface)',
                  border: '1px solid var(--drb-border-soft)',
                  color: 'var(--drb-text-muted)', fontSize: '12px', cursor: 'pointer',
                }}
              >✏️ Editar</button>
              <button
                onClick={onDelete}
                style={{
                  flex: 1, padding: '8px', borderRadius: '999px',
                  background: 'rgba(252,129,129,0.08)',
                  border: '1px solid rgba(252,129,129,0.25)',
                  color: '#fc8181', fontSize: '12px', cursor: 'pointer',
                }}
              >🗑️ Eliminar</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── COMPONENTE PRINCIPAL ──────────────────────────────────────
export default function DiarioPage() {
  const router = useRouter();
  const [entries,    setEntries]    = useState<DiarioEntry[]>([]);
  const [showForm,   setShowForm]   = useState(false);
  const [editEntry,  setEditEntry]  = useState<DiarioEntry | undefined>();

  // Cargar desde localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(DIARY_KEY);
      if (raw) setEntries(JSON.parse(raw));
    } catch { /* ignore */ }
  }, []);

  const persist = (newEntries: DiarioEntry[]) => {
    setEntries(newEntries);
    try { localStorage.setItem(DIARY_KEY, JSON.stringify(newEntries)); } catch { /* ignore */ }
  };

  const handleSave = (entry: DiarioEntry) => {
    const idx = entries.findIndex((e) => e.id === entry.id);
    const next = idx >= 0
      ? entries.map((e) => (e.id === entry.id ? entry : e))
      : [entry, ...entries];
    // Sort by fecha desc
    next.sort((a, b) => b.fecha.localeCompare(a.fecha));
    persist(next);
    setShowForm(false); setEditEntry(undefined);
  };

  const handleDelete = (id: string) => {
    if (!confirm('¿Eliminar esta entrada?')) return;
    persist(entries.filter((e) => e.id !== id));
  };

  const handleEdit = (entry: DiarioEntry) => {
    setEditEntry(entry); setShowForm(true);
  };

  // Stats
  const thisMonth = new Date().toISOString().slice(0, 7);
  const thisMonthCount = entries.filter((e) => e.fecha === thisMonth).length;
  const uniqueProcs = new Set(entries.map((e) => e.procedimientoId)).size;

  return (
    <div className="drb-home-bg" style={{ minHeight: '100dvh' }}>
      <div style={{ maxWidth: '480px', margin: '0 auto', padding: '20px 16px 80px' }}>

        {showForm ? (
          <EntryForm
            existing={editEntry}
            onSave={handleSave}
            onCancel={() => { setShowForm(false); setEditEntry(undefined); }}
          />
        ) : (
          <>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
              <button onClick={() => router.push('/')} style={{
                fontSize: '22px', color: 'var(--drb-text-muted)',
                background: 'none', border: 'none', cursor: 'pointer', lineHeight: 1,
              }}>‹</button>
              <div style={{ flex: 1 }}>
                <h1 style={{ fontSize: '17px', fontWeight: 700, color: 'var(--drb-text-primary)', margin: 0 }}>
                  Mi Diario 📔
                </h1>
                <p style={{ fontSize: '12px', color: 'var(--drb-text-muted)', margin: '2px 0 0' }}>
                  Registro de tus procedimientos
                </p>
              </div>
              <button
                onClick={() => { setEditEntry(undefined); setShowForm(true); }}
                style={{
                  width: '36px', height: '36px', borderRadius: '50%',
                  background: 'var(--drb-gradient-cta)', border: 'none',
                  color: 'white', fontSize: '22px', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 3px 10px rgba(183,148,244,0.5)', flexShrink: 0,
                }}
              >+</button>
            </div>

            {/* Stats */}
            <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
              {[
                { num: entries.length, label: 'Entradas' },
                { num: uniqueProcs,    label: 'Procedimientos' },
                { num: thisMonthCount, label: 'Este mes' },
              ].map((s) => (
                <div key={s.label} style={{
                  flex: 1, padding: '12px 8px', borderRadius: '16px', textAlign: 'center',
                  background: 'var(--drb-surface-card)', border: '1px solid var(--drb-border-soft)',
                }}>
                  <p style={{ fontSize: '22px', fontWeight: 700, color: 'var(--drb-accent)', margin: 0 }}>{s.num}</p>
                  <p style={{ fontSize: '10.5px', color: 'var(--drb-text-muted)', margin: '2px 0 0' }}>{s.label}</p>
                </div>
              ))}
            </div>

            {/* Timeline */}
            {entries.length === 0 ? (
              <div style={{
                padding: '32px 20px', borderRadius: '20px', textAlign: 'center',
                background: 'var(--drb-surface-card)', border: '1px solid var(--drb-border-soft)',
              }}>
                <p style={{ fontSize: '32px', marginBottom: '12px' }}>📔</p>
                <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--drb-text-primary)', marginBottom: '6px' }}>
                  Tu diario está vacío
                </p>
                <p style={{ fontSize: '13px', color: 'var(--drb-text-muted)', marginBottom: '20px', lineHeight: 1.5 }}>
                  Registra tus procedimientos para llevar un historial completo con fotos, fechas y notas.
                </p>
                <button
                  onClick={() => setShowForm(true)}
                  style={{
                    padding: '12px 24px', borderRadius: '999px',
                    background: 'linear-gradient(135deg, #b794f4, #ed64a6)',
                    color: 'white', fontSize: '14px', fontWeight: 600,
                    border: 'none', cursor: 'pointer',
                    boxShadow: '0 4px 14px rgba(183,148,244,0.4)',
                  }}
                >
                  ✍️ Agregar primera entrada
                </button>
              </div>
            ) : (
              <div style={{ position: 'relative' }}>
                {/* Línea vertical de la timeline */}
                <div style={{
                  position: 'absolute', left: '7px', top: '10px', bottom: '10px', width: '2px',
                  background: 'linear-gradient(180deg, rgba(183,148,244,0.4), rgba(237,100,166,0.15))',
                  borderRadius: '2px',
                }} />
                {entries.map((entry) => (
                  <TimelineCard
                    key={entry.id}
                    entry={entry}
                    onEdit={() => handleEdit(entry)}
                    onDelete={() => handleDelete(entry.id)}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}