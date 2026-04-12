'use client';

/**
 * CHANGELOG app/profile/page.tsx
 * - 2026-03-26 v2.0: Rediseño completo paleta lavanda/rosa. Dos estados.
 * - 2026-03-26 v2.1: Estado guardado ampliado, procedimientos, fechas, salud.
 * - 2026-04-04 v2.2: Banner Google en Estado 1.
 * - 2026-04-04 v2.3: Auto-relleno nombre Google, avatar dinámico.
 * - 2026-04-04 v2.4: deleteAccount() con modal de confirmación.
 * - 2026-04-05 v2.5: referrerPolicy en avatares, nameWasEmpty en deps.
 * - 2026-04-05 v2.6: Botón eliminar cuenta en Estado 1 cuando isGoogle.
 * - 2026-04-05 v2.7:
 *   - Botón "🗑️ Eliminar mi perfil" en Estado 2 para todas las usuarias.
 *     Borra Firestore + localStorage pero mantiene la cuenta de Auth.
 *   - Modal propio para confirmar eliminación de perfil (diferente al de cuenta).
 *   - Jerarquía de acciones:
 *       ✏️ Actualizar mis datos   → edita campos
 *       🗑️ Eliminar mi perfil    → borra datos, mantiene cuenta
 *       💀 Eliminar mi cuenta    → borra todo (solo si isGoogle)
 */

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { db, getAnonymousUid, deleteProfile as firebaseDeleteProfile } from '@/lib/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { useAuth } from '@/hooks/useAuth';

// ── ASSETS ────────────────────────────────────────────────────
const CLIPBOARD_BOT = '/images/Untitled-(1).png';
const DON_REDONDON  = '/images/DON-REDONDON.png';
const PROFILE_KEY   = 'drbeautybot_profile';

// ── DURACIONES ESTIMADAS (meses) ──────────────────────────────
const DURATIONS: Record<string, { months: number; label: string }> = {
  toxina:    { months: 5,  label: '4–6 meses' },
  ah:        { months: 10, label: '9–12 meses' },
  caha:      { months: 15, label: '12–18 meses' },
  plla:      { months: 21, label: '18–24 meses' },
  'pcl-cmc': { months: 24, label: '~24 meses' },
  laser:     { months: 6,  label: '~6 meses' },
};

// ── TIPOS ─────────────────────────────────────────────────────
interface ProcedureDate { month: string; year: string; }
interface ProcedureDates { [key: string]: ProcedureDate; }
interface ProfileData {
  name: string; ageRange: string; country: string; area: string;
  interests: string[]; previousProcedures: string[];
  botoxZones: string[]; fillerMaterials: string[];
  fillerMaterialOther: string; fillerZones: string[];
  healthConditions: string[]; healthOther: string;
  isPregnant: boolean; acceptedDisclaimer: boolean;
  procedureDates: ProcedureDates; createdAt: string;
}

// ── HELPERS ───────────────────────────────────────────────────
function toggle(value: string, arr: string[], set: (v: string[]) => void) {
  set(arr.includes(value) ? arr.filter((i) => i !== value) : [...arr, value]);
}

const MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 6 }, (_, i) => String(CURRENT_YEAR - i));

function calcNextDate(month: string, year: string, months: number): string {
  const monthIdx = MONTHS.indexOf(month);
  if (monthIdx === -1 || !year) return '';
  const date = new Date(Number(year), monthIdx + months, 1);
  return `${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
}

// ── ETIQUETAS ─────────────────────────────────────────────────
const areaLabels: Record<string, string> = {
  'rostro-general': 'Rostro general', toxina: 'Botox', rellenos: 'Rellenos',
  labios: 'Labios', laser: 'Láser', 'cicatrices-acne': 'Cicatrices', otros: 'Otros',
};
const interestLabels: Record<string, string> = {
  'prevencion-envejecimiento': '✨ Prevención', manchas: '💧 Manchas',
  alopecia: '💆 Alopecia', cuerpo: '🏋️ Corporal',
};
const healthLabels: Record<string, string> = {
  cardiopatias: '❤️ Cardiopatías', hipertension: '🩸 Hipertensión',
  hipotension: '🩸 Hipotensión', diabetes: '💊 Diabetes',
  sop: '🔬 SOP', 'anorexia-bulimia': '⚠️ Anorexia/Bulimia',
};
const materialLabels: Record<string, string> = {
  ah: 'Ácido Hialurónico', caha: 'Radiesse (CaHA)',
  plla: 'Sculptra (PLLA)', 'pcl-cmc': 'Ellansé (PCL)', 'otro-material': 'Otro',
};
const countryFlag: Record<string, string> = {
  México: '🇲🇽', Colombia: '🇨🇴', España: '🇪🇸',
  Argentina: '🇦🇷', Venezuela: '🇻🇪', 'Estados Unidos': '🇺🇸',
};

// ── SVG GOOGLE ICON ───────────────────────────────────────────
const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
  </svg>
);

// ── ESTILOS ───────────────────────────────────────────────────
const inputStyle: React.CSSProperties = {
  width: '100%', padding: '11px 14px', borderRadius: '14px',
  border: '1px solid rgba(180,140,220,0.3)', background: 'var(--drb-input-bg)',
  fontSize: '13px', color: 'var(--drb-text-primary)', outline: 'none',
};
const inputFilledStyle: React.CSSProperties = { ...inputStyle, borderColor: 'rgba(183,148,244,0.5)' };
const labelStyle: React.CSSProperties = {
  fontSize: '12px', fontWeight: 600, color: 'var(--drb-text-secondary)',
  display: 'block', marginBottom: '6px',
};
const sectionTitle: React.CSSProperties = {
  fontSize: '10.5px', fontWeight: 700, color: 'var(--drb-text-muted)',
  textTransform: 'uppercase', letterSpacing: '0.07em',
  marginBottom: '10px', marginTop: '20px',
};
const infoCard: React.CSSProperties = {
  background: 'var(--drb-surface-card)', border: '1px solid var(--drb-border-soft)',
  borderRadius: '16px', padding: '14px 16px', marginBottom: '12px',
};

// ── CHECK ITEM ────────────────────────────────────────────────
function CheckItem({ label, checked, onChange, small = false }:
  { label: string; checked: boolean; onChange: () => void; small?: boolean }) {
  return (
    <button type="button" onClick={onChange} style={{
      display: 'flex', alignItems: 'center', gap: '10px',
      padding: small ? '8px 12px' : '10px 14px',
      borderRadius: '13px', width: '100%', textAlign: 'left',
      background: checked ? 'linear-gradient(135deg, rgba(183,148,244,0.18), rgba(237,100,166,0.1))' : 'var(--drb-surface-card)',
      border: checked ? '1px solid rgba(183,148,244,0.4)' : '1px solid var(--drb-border-soft)',
      cursor: 'pointer',
    }}>
      <div style={{
        width: '18px', height: '18px', borderRadius: '6px', flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: checked ? 'linear-gradient(135deg, #b794f4, #ed64a6)' : 'var(--drb-input-bg)',
        border: checked ? 'none' : '1.5px solid var(--drb-border)',
        fontSize: '11px', color: 'white',
      }}>{checked && '✓'}</div>
      <span style={{ fontSize: small ? '12px' : '13px', color: 'var(--drb-text-primary)', lineHeight: 1.4 }}>{label}</span>
    </button>
  );
}

// ── DATE PICKERS ──────────────────────────────────────────────
function MonthYearPicker({ value, onChange, label }:
  { value: ProcedureDate; onChange: (v: ProcedureDate) => void; label: string }) {
  return (
    <div style={{ marginTop: '8px', padding: '10px 12px', borderRadius: '12px', background: 'rgba(183,148,244,0.08)', border: '1px solid rgba(183,148,244,0.2)' }}>
      <p style={{ fontSize: '10.5px', color: 'var(--drb-accent)', fontWeight: 600, marginBottom: '8px' }}>📅 ¿Cuándo fue tu última aplicación de {label}?</p>
      <div style={{ display: 'flex', gap: '8px' }}>
        <div style={{ position: 'relative', flex: 2 }}>
          <select value={value.month} onChange={(e) => onChange({ ...value, month: e.target.value })} style={{ ...inputStyle, padding: '8px 12px', fontSize: '12px', appearance: 'none' }}>
            <option value="">Mes</option>{MONTHS.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
          <span style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--drb-accent)', pointerEvents: 'none', fontSize: '12px' }}>▾</span>
        </div>
        <div style={{ position: 'relative', flex: 1 }}>
          <select value={value.year} onChange={(e) => onChange({ ...value, year: e.target.value })} style={{ ...inputStyle, padding: '8px 12px', fontSize: '12px', appearance: 'none' }}>
            <option value="">Año</option>{YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
          <span style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--drb-accent)', pointerEvents: 'none', fontSize: '12px' }}>▾</span>
        </div>
      </div>
      {value.month && value.year && (() => {
        const key = label === 'Botox' ? 'toxina' : 'laser';
        const dur = DURATIONS[key];
        const next = calcNextDate(value.month, value.year, dur.months);
        return next ? <p style={{ fontSize: '11px', color: 'var(--drb-text-muted)', marginTop: '6px' }}>🔔 Próxima estimada: <strong style={{ color: 'var(--drb-accent)' }}>{next}</strong> ({dur.label})</p> : null;
      })()}
    </div>
  );
}

function FillerDatePicker({ material, value, onChange }:
  { material: string; value: ProcedureDate; onChange: (v: ProcedureDate) => void }) {
  const dur = DURATIONS[material] ?? DURATIONS['ah'];
  return (
    <div style={{ marginTop: '8px', padding: '10px 12px', borderRadius: '12px', background: 'rgba(183,148,244,0.08)', border: '1px solid rgba(183,148,244,0.2)' }}>
      <p style={{ fontSize: '10.5px', color: 'var(--drb-accent)', fontWeight: 600, marginBottom: '8px' }}>📅 Última aplicación de {materialLabels[material] ?? material}</p>
      <div style={{ display: 'flex', gap: '8px' }}>
        <div style={{ position: 'relative', flex: 2 }}>
          <select value={value.month} onChange={(e) => onChange({ ...value, month: e.target.value })} style={{ ...inputStyle, padding: '8px 12px', fontSize: '12px', appearance: 'none' }}>
            <option value="">Mes</option>{MONTHS.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
          <span style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--drb-accent)', pointerEvents: 'none', fontSize: '12px' }}>▾</span>
        </div>
        <div style={{ position: 'relative', flex: 1 }}>
          <select value={value.year} onChange={(e) => onChange({ ...value, year: e.target.value })} style={{ ...inputStyle, padding: '8px 12px', fontSize: '12px', appearance: 'none' }}>
            <option value="">Año</option>{YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
          <span style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--drb-accent)', pointerEvents: 'none', fontSize: '12px' }}>▾</span>
        </div>
      </div>
      {value.month && value.year && <p style={{ fontSize: '11px', color: 'var(--drb-text-muted)', marginTop: '6px' }}>🔔 Próxima: <strong style={{ color: 'var(--drb-accent)' }}>{calcNextDate(value.month, value.year, dur.months)}</strong> ({dur.label})</p>}
    </div>
  );
}

// ── COMPONENTE PRINCIPAL ──────────────────────────────────────
export default function ProfilePage() {
  const router = useRouter();
  const { permission, isSupported, request, scheduleFromProfile, reminders } = usePushNotifications();
  const {
    isAnonymous, isGoogle, displayName, email, photoURL,
    linking, linkError, linkGoogle,
    deleting, deleteError, deleteAccount,
  } = useAuth();

  const [hasSavedProfile,      setHasSavedProfile]      = useState<boolean | null>(null);
  const [isEditing,            setIsEditing]            = useState(false);
  const [showSavedDialog,      setShowSavedDialog]      = useState(false);
  const [showDeleteModal,      setShowDeleteModal]      = useState(false);      // eliminar cuenta
  const [showDeleteProfileModal, setShowDeleteProfileModal] = useState(false); // eliminar perfil
  const [isDeletingProfile,    setIsDeletingProfile]    = useState(false);
  const [nameFromGoogle,       setNameFromGoogle]       = useState(false);
  const [nameWasEmpty,         setNameWasEmpty]         = useState(false);

  const [name,               setName]               = useState('');
  const [ageRange,           setAgeRange]           = useState('');
  const [country,            setCountry]            = useState('');
  const [area,               setArea]               = useState('');
  const [interests,          setInterests]          = useState<string[]>([]);
  const [previousProcedures, setPreviousProcedures] = useState<string[]>([]);
  const [botoxZones,         setBotoxZones]         = useState<string[]>([]);
  const [fillerMaterials,    setFillerMaterials]    = useState<string[]>([]);
  const [fillerMaterialOther,setFillerMaterialOther]= useState('');
  const [fillerZones,        setFillerZones]        = useState<string[]>([]);
  const [healthConditions,   setHealthConditions]   = useState<string[]>([]);
  const [healthOther,        setHealthOther]        = useState('');
  const [isPregnant,         setIsPregnant]         = useState(false);
  const [acceptedDisclaimer, setAcceptedDisclaimer] = useState(false);
  const [procedureDates,     setProcedureDates]     = useState<ProcedureDates>({});

  const setProcDate = (key: string, val: ProcedureDate) =>
    setProcedureDates((prev) => ({ ...prev, [key]: val }));
  const getProcDate = (key: string): ProcedureDate =>
    procedureDates[key] ?? { month: '', year: '' };

  // ── Auto-relleno nombre desde Google ──────────────────────
  useEffect(() => {
    if (isGoogle && displayName && (!name || nameWasEmpty)) {
      setName(displayName.split(' ')[0]);
      setNameFromGoogle(true);
      setNameWasEmpty(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isGoogle, displayName, nameWasEmpty]);

  const handleNameChange = (val: string) => {
    setName(val);
    if (nameFromGoogle) setNameFromGoogle(false);
  };

  // ── Cargar perfil ──────────────────────────────────────────
  useEffect(() => {
    const loadProfile = async () => {
      try {
        const raw = localStorage.getItem(PROFILE_KEY);
        if (raw) { applyProfile(JSON.parse(raw)); return; }
        try {
          const { getAnonymousUid: getUid } = await import('@/lib/firebase');
          const { doc: fsDoc, getDoc } = await import('firebase/firestore');
          const uid = await getUid();
          const snap = await getDoc(fsDoc(db, 'profiles', uid));
          if (snap.exists()) {
            const p = snap.data();
            localStorage.setItem(PROFILE_KEY, JSON.stringify(p));
            applyProfile(p);
          } else { setHasSavedProfile(false); }
        } catch { setHasSavedProfile(false); }
      } catch { setHasSavedProfile(false); }
    };

    const applyProfile = (p: any) => {
      setHasSavedProfile(true);
      const savedName = p.name ?? '';
      setName(savedName);
      if (savedName === '') setNameWasEmpty(true);
      setAgeRange(p.ageRange ?? ''); setCountry(p.country ?? ''); setArea(p.area ?? '');
      setInterests(p.interests ?? []); setPreviousProcedures(p.previousProcedures ?? []);
      setBotoxZones(p.botoxZones ?? []); setFillerMaterials(p.fillerMaterials ?? []);
      setFillerMaterialOther(p.fillerMaterialOther ?? ''); setFillerZones(p.fillerZones ?? []);
      setHealthConditions(p.healthConditions ?? []); setHealthOther(p.healthOther ?? '');
      setIsPregnant(p.isPregnant ?? false); setAcceptedDisclaimer(true);
      setProcedureDates(p.procedureDates ?? {});
    };

    loadProfile();
  }, []);

  // ── Guardar ───────────────────────────────────────────────
  const saveProfile = async () => {
    if (!acceptedDisclaimer) { alert('Por favor, acepta el aviso para continuar.'); return; }
    const data: ProfileData = {
      name, ageRange, country, area, interests, previousProcedures,
      botoxZones, fillerMaterials, fillerMaterialOther, fillerZones,
      healthConditions, healthOther, isPregnant, acceptedDisclaimer,
      procedureDates, createdAt: new Date().toISOString(),
    };
    localStorage.setItem(PROFILE_KEY, JSON.stringify(data));
    setHasSavedProfile(true); setIsEditing(false); setShowSavedDialog(true);
    try {
      const uid = await getAnonymousUid();
      await setDoc(doc(db, 'profiles', uid), data, { merge: true });
    } catch (e) { console.warn('Firestore sync failed:', e); }
  };

  const handleSubmit = (e: FormEvent) => { e.preventDefault(); saveProfile(); };

  // ── Resetear estado del formulario ────────────────────────
  const resetFormState = () => {
    setHasSavedProfile(false); setIsEditing(false);
    setNameFromGoogle(false); setNameWasEmpty(false);
    setName(''); setAgeRange(''); setCountry(''); setArea('');
    setInterests([]); setPreviousProcedures([]);
    setBotoxZones([]); setFillerMaterials([]); setFillerMaterialOther('');
    setFillerZones([]); setHealthConditions([]); setHealthOther('');
    setIsPregnant(false); setAcceptedDisclaimer(false); setProcedureDates({});
  };

  // ── Eliminar perfil (datos solamente, mantiene cuenta) ────
  const handleDeleteProfile = async () => {
    setIsDeletingProfile(true);
    try {
      await firebaseDeleteProfile();
      localStorage.removeItem(PROFILE_KEY);
      setShowDeleteProfileModal(false);
      resetFormState();
    } catch (e) {
      console.error('Error eliminando perfil:', e);
    } finally {
      setIsDeletingProfile(false);
    }
  };

  // ── Eliminar cuenta completa ──────────────────────────────
  const handleDeleteAccount = () => {
    deleteAccount(() => {
      localStorage.removeItem(PROFILE_KEY);
      resetFormState();
      router.push('/');
    });
  };

  const showSaved = hasSavedProfile === true && !isEditing;
  const flag      = countryFlag[country] ?? '🌎';
  const avatarSrc = isGoogle && photoURL ? photoURL : DON_REDONDON;

  // ── FORMULARIO ────────────────────────────────────────────
  const FormContent = (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <div>
        <label style={labelStyle}>Nombre o apodo</label>
        <input type="text" placeholder="Ej. Laura, Ana, Vicky…" value={name}
          onChange={(e) => handleNameChange(e.target.value)} style={name ? inputFilledStyle : inputStyle} />
        <p style={{ fontSize: '10.5px', marginTop: '4px', color: nameFromGoogle ? 'var(--drb-accent)' : 'var(--drb-text-hint)' }}>
          {nameFromGoogle ? '✨ Tomado de tu cuenta Google — puedes cambiarlo' : 'Solo para dirigirme a ti en el chat.'}
        </p>
      </div>
      <div>
        <label style={labelStyle}>País de residencia</label>
        <input type="text" placeholder="Ej. México, Colombia, España…" value={country}
          onChange={(e) => setCountry(e.target.value)} style={country ? inputFilledStyle : inputStyle} />
      </div>
      <div>
        <label style={labelStyle}>Rango de edad</label>
        <div style={{ position: 'relative' }}>
          <select value={ageRange} onChange={(e) => setAgeRange(e.target.value)}
            style={{ ...(ageRange ? inputFilledStyle : inputStyle), appearance: 'none' }}>
            <option value="">Selecciona una opción</option>
            {['18-25','26-35','36-45','46-55','56+'].map((r) => (
              <option key={r} value={r}>{r === '56+' ? '56 años o más' : `${r} años`}</option>
            ))}
          </select>
          <span style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--drb-accent)', pointerEvents: 'none' }}>▾</span>
        </div>
      </div>
      <div>
        <label style={labelStyle}>Zona o tratamiento de interés principal</label>
        <div style={{ position: 'relative' }}>
          <select value={area} onChange={(e) => setArea(e.target.value)}
            style={{ ...(area ? inputFilledStyle : inputStyle), appearance: 'none' }}>
            <option value="">Selecciona una opción</option>
            <option value="rostro-general">Rostro en general</option>
            <option value="toxina">Toxina botulínica</option>
            <option value="rellenos">Fillers / rellenos</option>
            <option value="labios">Labios</option>
            <option value="laser">Láser / manchas / depilación</option>
            <option value="cicatrices-acne">Cicatrices de acné</option>
            <option value="otros">Otros</option>
          </select>
          <span style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--drb-accent)', pointerEvents: 'none' }}>▾</span>
        </div>
      </div>
      <div>
        <p style={sectionTitle}>Otros temas que te interesan</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
          {[
            { k: 'prevencion-envejecimiento', label: 'Prevención del envejecimiento / mantenimiento' },
            { k: 'manchas', label: 'Manchas / melasma' },
            { k: 'alopecia', label: 'Alopecia / caída de cabello' },
            { k: 'cuerpo', label: 'Tratamientos corporales' },
          ].map((it) => <CheckItem key={it.k} label={it.label} checked={interests.includes(it.k)} onChange={() => toggle(it.k, interests, setInterests)} />)}
        </div>
      </div>
      <div>
        <p style={sectionTitle}>¿Te has realizado alguno de estos tratamientos?</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
          <CheckItem label="Toxina botulínica" checked={previousProcedures.includes('toxina')} onChange={() => toggle('toxina', previousProcedures, setPreviousProcedures)} />
          {previousProcedures.includes('toxina') && (
            <div style={{ marginLeft: '12px', padding: '12px 14px', borderRadius: '14px', background: 'var(--drb-surface)', border: '1px solid var(--drb-border-soft)' }}>
              <p style={{ ...labelStyle, marginBottom: '10px' }}>¿En qué zonas?</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {[
                  { v: 'baby-botox', l: 'Baby botox (preventivo)' },
                  { v: 'antifaz', l: 'Antifaz (entrecejo, bunny lines, patas de gallo)' },
                  { v: 'full-face-i', l: 'Full Face I' },
                  { v: 'full-face-ii', l: 'Full Face II (mentón, nariz incluidos)' },
                  { v: 'nefertiti-neck', l: 'Nefertiti Neck' },
                  { v: 'gummy-smile', l: 'Gummy Smile' },
                  { v: 'lip-flip', l: 'Lip Flip (labios)' },
                  { v: 'bruxismo', l: 'Bruxismo (maseteros)' },
                  { v: 'trap-botox', l: 'Trap Botox / Barbie Botox' },
                ].map((z) => <CheckItem key={z.v} label={z.l} small checked={botoxZones.includes(z.v)} onChange={() => toggle(z.v, botoxZones, setBotoxZones)} />)}
              </div>
              <MonthYearPicker label="Botox" value={getProcDate('toxina')} onChange={(v) => setProcDate('toxina', v)} />
            </div>
          )}
          <CheckItem label="Fillers / rellenos" checked={previousProcedures.includes('rellenos')}
            onChange={() => { const sel = previousProcedures.includes('rellenos'); toggle('rellenos', previousProcedures, setPreviousProcedures); if (sel) { setFillerMaterials([]); setFillerMaterialOther(''); setFillerZones([]); } }} />
          {previousProcedures.includes('rellenos') && (
            <div style={{ marginLeft: '12px', padding: '12px 14px', borderRadius: '14px', background: 'var(--drb-surface)', border: '1px solid var(--drb-border-soft)' }}>
              <p style={{ ...labelStyle, marginBottom: '8px' }}>Material</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '12px' }}>
                {[
                  { v: 'ah', l: 'Ácido Hialurónico (Juvéderm, Restylane, Belotero…)' },
                  { v: 'caha', l: 'Hidroxiapatita de Calcio — Radiesse' },
                  { v: 'plla', l: 'Ácido Poliláctico — Sculptra' },
                  { v: 'pcl-cmc', l: 'Policaprolactona — Ellansé' },
                  { v: 'otro-material', l: 'Otro (especificar)' },
                ].map((m) => <CheckItem key={m.v} label={m.l} small checked={fillerMaterials.includes(m.v)} onChange={() => toggle(m.v, fillerMaterials, setFillerMaterials)} />)}
              </div>
              {fillerMaterials.includes('otro-material') && (
                <input type="text" placeholder="Especifica el material…" value={fillerMaterialOther}
                  onChange={(e) => setFillerMaterialOther(e.target.value)} style={{ ...inputStyle, fontSize: '12px', marginBottom: '12px' }} />
              )}
              {fillerMaterials.filter(m => m !== 'otro-material').map((m) => (
                <FillerDatePicker key={m} material={m} value={getProcDate(`relleno_${m}`)} onChange={(v) => setProcDate(`relleno_${m}`, v)} />
              ))}
              <p style={{ ...labelStyle, margin: '12px 0 8px' }}>Zona</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {[
                  { v: 'labios', l: 'Labios' }, { v: 'ojeras', l: 'Ojeras' },
                  { v: 'pomulos', l: 'Pómulos' }, { v: 'menton', l: 'Mentón' },
                  { v: 'nariz', l: 'Nariz' }, { v: 'surcos-nasogenianos', l: 'Surcos nasogenianos' },
                  { v: 'definicion-mandibular', l: 'Definición mandibular' }, { v: 'temporal', l: 'Zona temporal' },
                ].map((z) => <CheckItem key={z.v} label={z.l} small checked={fillerZones.includes(z.v)} onChange={() => toggle(z.v, fillerZones, setFillerZones)} />)}
              </div>
            </div>
          )}
          <CheckItem label="Láser / luz pulsada / depilación" checked={previousProcedures.includes('laser')} onChange={() => toggle('laser', previousProcedures, setPreviousProcedures)} />
          {previousProcedures.includes('laser') && (
            <div style={{ marginLeft: '12px' }}>
              <MonthYearPicker label="Láser" value={getProcDate('laser')} onChange={(v) => setProcDate('laser', v)} />
            </div>
          )}
          <CheckItem label="Otros procedimientos estéticos" checked={previousProcedures.includes('otros')} onChange={() => toggle('otros', previousProcedures, setPreviousProcedures)} />
        </div>
      </div>
      <div>
        <p style={sectionTitle}>Datos de salud relevantes</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
          {[
            { v: 'cardiopatias', l: 'Cardiopatías' }, { v: 'hipertension', l: 'Hipertensión' },
            { v: 'hipotension', l: 'Hipotensión' }, { v: 'diabetes', l: 'Diabetes' },
            { v: 'sop', l: 'Síndrome de ovario poliquístico' }, { v: 'anorexia-bulimia', l: 'Anorexia / Bulimia' },
            { v: 'otros', l: 'Otros (especificar abajo)' },
          ].map((c) => <CheckItem key={c.v} label={c.l} checked={healthConditions.includes(c.v)} onChange={() => toggle(c.v, healthConditions, setHealthConditions)} />)}
        </div>
        {healthConditions.includes('otros') && (
          <input type="text" placeholder="Especifica la condición…" value={healthOther}
            onChange={(e) => setHealthOther(e.target.value)} style={{ ...inputStyle, marginTop: '8px' }} />
        )}
      </div>
      <CheckItem label="🤰 Estoy embarazada o en periodo de lactancia" checked={isPregnant} onChange={() => setIsPregnant(!isPregnant)} />
      {isPregnant && (
        <div style={{ padding: '12px 14px', borderRadius: '14px', background: 'rgba(255,200,100,0.1)', border: '1px solid rgba(200,150,50,0.3)' }}>
          <p style={{ fontSize: '12px', color: '#92600a', lineHeight: 1.5 }}>⚠️ NO ES RECOMENDABLE REALIZARSE PROCEDIMIENTOS COMO RELLENOS, TOXINA BOTULÍNICA, ETC. DURANTE EL EMBARAZO O LACTANCIA.</p>
        </div>
      )}
      <button type="button" onClick={() => setAcceptedDisclaimer(!acceptedDisclaimer)} style={{
        display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '12px 14px', borderRadius: '14px', textAlign: 'left',
        background: acceptedDisclaimer ? 'linear-gradient(135deg, rgba(183,148,244,0.15), rgba(237,100,166,0.08))' : 'var(--drb-surface-card)',
        border: acceptedDisclaimer ? '1px solid rgba(183,148,244,0.4)' : '1px solid var(--drb-border-soft)', cursor: 'pointer',
      }}>
        <div style={{ width: '18px', height: '18px', borderRadius: '6px', flexShrink: 0, marginTop: '1px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: acceptedDisclaimer ? 'linear-gradient(135deg, #b794f4, #ed64a6)' : 'var(--drb-input-bg)', border: acceptedDisclaimer ? 'none' : '1.5px solid var(--drb-border)', fontSize: '11px', color: 'white' }}>{acceptedDisclaimer && '✓'}</div>
        <p style={{ fontSize: '12px', color: 'var(--drb-text-secondary)', lineHeight: 1.5 }}>Entiendo que Dr. BeautyBot no sustituye una consulta médica. La información es orientativa y no constituye diagnóstico ni prescripción.</p>
      </button>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', paddingTop: '4px' }}>
        <button type="submit" style={{ width: '100%', padding: '14px', borderRadius: '999px', background: 'linear-gradient(135deg, #b794f4, #ed64a6)', color: 'white', fontSize: '14px', fontWeight: 600, border: 'none', cursor: 'pointer', boxShadow: '0 4px 18px rgba(183,148,244,0.45)' }}>
          {hasSavedProfile && isEditing ? '💾 Actualizar mis datos' : '✨ Guardar y ir al chat'}
        </button>
        <button type="button" onClick={() => router.push('/chat?mode=quick')} style={{ width: '100%', padding: '12px', borderRadius: '999px', background: 'var(--drb-surface-card)', color: 'var(--drb-text-muted)', fontSize: '13px', fontWeight: 500, border: '1px solid var(--drb-border-soft)', cursor: 'pointer' }}>
          Prefiero una consulta rápida
        </button>
      </div>
    </form>
  );

  // ── RENDER ────────────────────────────────────────────────
  return (
    <div className="drb-home-bg" style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column' }}>
      <div style={{ flex: 1, overflowY: 'auto' }} className="drb-scroll-hide">
        <div style={{ width: '100%', maxWidth: '480px', margin: '0 auto', padding: '20px 18px 60px', display: 'flex', flexDirection: 'column' }}>

          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
            <button onClick={() => router.push('/')} style={{ fontSize: '22px', color: 'var(--drb-text-muted)', background: 'none', border: 'none', cursor: 'pointer', lineHeight: 1 }}>‹</button>
            <span style={{ fontSize: '16px', fontWeight: 700, color: 'var(--drb-text-primary)' }}>Mis Datos</span>
          </div>

          {/* ── ESTADO 1 ──────────────────────────────────── */}
          {!showSaved && (
            <>
              {!isGoogle && (
                <button type="button" onClick={linkGoogle} disabled={linking} style={{ display: 'flex', alignItems: 'center', gap: '12px', width: '100%', padding: '11px 16px', borderRadius: '16px', marginBottom: '20px', background: 'white', border: '1px solid rgba(66,133,244,0.3)', cursor: linking ? 'not-allowed' : 'pointer', opacity: linking ? 0.7 : 1, boxShadow: '0 2px 10px rgba(66,133,244,0.1)', textAlign: 'left' }}>
                  <GoogleIcon />
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: '12.5px', fontWeight: 600, color: '#3c4043', margin: 0 }}>{linking ? 'Conectando con Google…' : 'Continuar con Google'}</p>
                    <p style={{ fontSize: '11px', color: '#80868b', margin: '1px 0 0' }}>Guarda tu perfil en la nube · Accede desde cualquier dispositivo</p>
                  </div>
                  <span style={{ fontSize: '18px', color: '#bdc1c6', flexShrink: 0 }}>›</span>
                </button>
              )}
              {isGoogle && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', borderRadius: '14px', marginBottom: '20px', background: 'rgba(52,168,83,0.08)', border: '1px solid rgba(52,168,83,0.25)' }}>
                  {photoURL && <img src={photoURL} alt="" referrerPolicy="no-referrer" style={{ width: '28px', height: '28px', borderRadius: '50%', flexShrink: 0 }} />}
                  <p style={{ fontSize: '12px', fontWeight: 600, color: '#2d6a4f', margin: 0 }}>✓ Conectada con Google · {email ?? displayName}</p>
                </div>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', marginBottom: '20px' }}>
                <img src={CLIPBOARD_BOT} alt="Dr. BeautyBot" className="drb-img-blend" style={{ width: '110px', marginBottom: '10px' }} />
                <h1 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--drb-text-primary)', marginBottom: '6px' }}>Consulta personalizada</h1>
                <p style={{ fontSize: '13px', color: 'var(--drb-text-muted)', lineHeight: 1.5, maxWidth: '300px' }}>Cuéntame un poco sobre ti para orientar mejor la información. No tomará más de 1 minuto.</p>
              </div>
              {FormContent}
              {isGoogle && (
                <button type="button" onClick={() => setShowDeleteModal(true)} style={{ width: '100%', padding: '11px', borderRadius: '999px', background: 'transparent', color: '#d4537e', fontSize: '13px', border: '1px solid rgba(212,83,126,0.3)', cursor: 'pointer', marginTop: '8px' }}>
                  💀 Eliminar mi cuenta
                </button>
              )}
            </>
          )}

          {/* ── ESTADO 2 ──────────────────────────────────── */}
          {showSaved && (
            <>
              {/* Banner */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '14px 16px', borderRadius: '20px', marginBottom: '16px', background: 'linear-gradient(135deg, rgba(183,148,244,0.2), rgba(237,100,166,0.12))', border: '1px solid rgba(183,148,244,0.35)' }}>
                <div style={{ width: '50px', height: '50px', borderRadius: '50%', overflow: 'hidden', flexShrink: 0, border: '2px solid rgba(183,148,244,0.4)', background: '#e8f5ee' }}>
                  <img src={avatarSrc} alt={isGoogle && displayName ? displayName : 'Don Redondón'} referrerPolicy="no-referrer" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: '15px', fontWeight: 600, color: 'var(--drb-text-primary)', margin: 0 }}>Hola{name ? `, ${name}` : ''} 👋</p>
                  <p style={{ fontSize: '11px', color: 'var(--drb-accent)', fontWeight: 500, margin: '2px 0 0' }}>✓ Perfil guardado · Actualizado hoy</p>
                </div>
                <button onClick={() => setIsEditing(true)} style={{ padding: '6px 14px', borderRadius: '999px', background: 'var(--drb-surface-card)', color: 'var(--drb-text-muted)', fontSize: '12px', fontWeight: 500, border: '1px solid var(--drb-border-soft)', cursor: 'pointer', flexShrink: 0 }}>✏️ Editar</button>
              </div>

              {/* Google card */}
              {!isGoogle ? (
                <div style={{ width: '100%', padding: '14px 16px', borderRadius: '18px', marginBottom: '14px', background: 'linear-gradient(135deg, rgba(66,133,244,0.08), rgba(52,168,83,0.06))', border: '1px solid rgba(66,133,244,0.2)' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                    <span style={{ fontSize: '22px', flexShrink: 0 }}>☁️</span>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--drb-text-primary)', margin: '0 0 4px' }}>Guarda tu perfil en la nube</p>
                      <p style={{ fontSize: '12px', color: 'var(--drb-text-muted)', lineHeight: 1.45, margin: '0 0 12px' }}>Conecta con Google para acceder desde cualquier dispositivo y no perder tus datos.</p>
                      {linkError && <p style={{ fontSize: '11.5px', color: '#fc8181', margin: '0 0 8px' }}>{linkError}</p>}
                      <button onClick={linkGoogle} disabled={linking} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '9px 16px', borderRadius: '999px', background: linking ? 'var(--drb-surface-card)' : 'white', border: '1px solid rgba(66,133,244,0.4)', cursor: linking ? 'not-allowed' : 'pointer', opacity: linking ? 0.7 : 1, boxShadow: '0 2px 8px rgba(66,133,244,0.15)' }}>
                        <GoogleIcon />
                        <span style={{ fontSize: '13px', fontWeight: 600, color: '#3c4043' }}>{linking ? 'Conectando…' : 'Continuar con Google'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ width: '100%', padding: '12px 16px', borderRadius: '16px', marginBottom: '14px', background: 'rgba(52,168,83,0.08)', border: '1px solid rgba(52,168,83,0.25)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  {photoURL && <img src={photoURL} alt="" referrerPolicy="no-referrer" style={{ width: '32px', height: '32px', borderRadius: '50%', flexShrink: 0 }} />}
                  <div>
                    <p style={{ fontSize: '12.5px', fontWeight: 600, color: '#2d6a4f', margin: 0 }}>✓ Sincronizado con Google</p>
                    <p style={{ fontSize: '11px', color: '#52b788', margin: '2px 0 0' }}>{email ?? displayName ?? 'Cuenta vinculada'}</p>
                  </div>
                </div>
              )}

              {/* Chips */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '4px' }}>
                {country && <span style={{ padding: '6px 14px', borderRadius: '999px', fontSize: '12px', fontWeight: 500, background: 'linear-gradient(135deg, rgba(183,148,244,0.25), rgba(237,100,166,0.15))', border: '1px solid rgba(183,148,244,0.4)', color: 'var(--drb-text-secondary)' }}>{flag} {country}</span>}
                {ageRange && <span style={{ padding: '6px 14px', borderRadius: '999px', fontSize: '12px', fontWeight: 500, background: 'var(--drb-surface-card)', border: '1px solid var(--drb-border-soft)', color: 'var(--drb-text-secondary)' }}>{ageRange.replace('-', '–')} años</span>}
                {area && <span style={{ padding: '6px 14px', borderRadius: '999px', fontSize: '12px', fontWeight: 500, background: 'linear-gradient(135deg, rgba(183,148,244,0.25), rgba(237,100,166,0.15))', border: '1px solid rgba(183,148,244,0.4)', color: 'var(--drb-text-secondary)' }}>💉 {areaLabels[area] ?? area}</span>}
                {isPregnant && <span style={{ padding: '6px 14px', borderRadius: '999px', fontSize: '12px', fontWeight: 500, background: 'rgba(255,200,100,0.15)', border: '1px solid rgba(200,150,50,0.3)', color: '#92600a' }}>🤰 Embarazada / lactancia</span>}
              </div>

              {/* Procedimientos */}
              {previousProcedures.length > 0 && (
                <>
                  <p style={sectionTitle}>Últimos procedimientos</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {previousProcedures.includes('toxina') && (() => {
                      const d = getProcDate('toxina'); const next = d.month && d.year ? calcNextDate(d.month, d.year, DURATIONS.toxina.months) : '';
                      return <div style={infoCard}><p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--drb-text-primary)', margin: '0 0 6px' }}>💉 Toxina botulínica</p>{botoxZones.length > 0 && <p style={{ fontSize: '11.5px', color: 'var(--drb-text-muted)', margin: '0 0 6px' }}>Zonas: {botoxZones.map(z => z.replace(/-/g,' ')).join(', ')}</p>}{d.month && d.year ? (<><p style={{ fontSize: '12px', color: 'var(--drb-text-secondary)', margin: '0 0 3px' }}>📅 Aplicado: <strong>{d.month} {d.year}</strong></p>{next && <p style={{ fontSize: '12px', color: 'var(--drb-accent)', margin: 0 }}>🔔 Próxima: <strong>{next}</strong> ({DURATIONS.toxina.label})</p>}</>) : <p style={{ fontSize: '11px', color: 'var(--drb-text-muted)', margin: 0 }}>Sin fecha registrada.</p>}</div>;
                    })()}
                    {previousProcedures.includes('rellenos') && fillerMaterials.filter(m => m !== 'otro-material').map((m) => {
                      const d = getProcDate(`relleno_${m}`); const dur = DURATIONS[m] ?? DURATIONS['ah']; const next = d.month && d.year ? calcNextDate(d.month, d.year, dur.months) : '';
                      return <div key={m} style={infoCard}><p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--drb-text-primary)', margin: '0 0 6px' }}>✨ Relleno — {materialLabels[m]}</p>{fillerZones.length > 0 && <p style={{ fontSize: '11.5px', color: 'var(--drb-text-muted)', margin: '0 0 6px' }}>Zonas: {fillerZones.join(', ')}</p>}{d.month && d.year ? (<><p style={{ fontSize: '12px', color: 'var(--drb-text-secondary)', margin: '0 0 3px' }}>📅 Aplicado: <strong>{d.month} {d.year}</strong></p>{next && <p style={{ fontSize: '12px', color: 'var(--drb-accent)', margin: 0 }}>🔔 Próxima: <strong>{next}</strong> ({dur.label})</p>}</>) : <p style={{ fontSize: '11px', color: 'var(--drb-text-muted)', margin: 0 }}>Sin fecha registrada.</p>}</div>;
                    })}
                    {previousProcedures.includes('laser') && (() => {
                      const d = getProcDate('laser'); const next = d.month && d.year ? calcNextDate(d.month, d.year, DURATIONS.laser.months) : '';
                      return <div style={infoCard}><p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--drb-text-primary)', margin: '0 0 6px' }}>☀️ Láser / luz pulsada / depilación</p>{d.month && d.year ? (<><p style={{ fontSize: '12px', color: 'var(--drb-text-secondary)', margin: '0 0 3px' }}>📅 Aplicado: <strong>{d.month} {d.year}</strong></p>{next && <p style={{ fontSize: '12px', color: 'var(--drb-accent)', margin: 0 }}>🔔 Próximo: <strong>{next}</strong> ({DURATIONS.laser.label})</p>}</>) : <p style={{ fontSize: '11px', color: 'var(--drb-text-muted)', margin: 0 }}>Sin fecha registrada.</p>}</div>;
                    })()}
                    {previousProcedures.includes('otros') && <div style={infoCard}><p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--drb-text-primary)', margin: 0 }}>🔬 Otros procedimientos estéticos</p></div>}
                  </div>
                </>
              )}

              {/* Salud */}
              {(healthConditions.length > 0 || isPregnant) && (
                <>
                  <p style={sectionTitle}>Datos de salud</p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {healthConditions.filter(c => c !== 'otros').map((c) => <span key={c} style={{ padding: '6px 12px', borderRadius: '999px', fontSize: '11.5px', fontWeight: 500, background: 'rgba(237,100,166,0.1)', border: '1px solid rgba(237,100,166,0.25)', color: 'var(--drb-text-secondary)' }}>{healthLabels[c] ?? c}</span>)}
                    {healthConditions.includes('otros') && healthOther && <span style={{ padding: '6px 12px', borderRadius: '999px', fontSize: '11.5px', fontWeight: 500, background: 'rgba(237,100,166,0.1)', border: '1px solid rgba(237,100,166,0.25)', color: 'var(--drb-text-secondary)' }}>⚕️ {healthOther}</span>}
                  </div>
                </>
              )}

              {/* Intereses */}
              {interests.length > 0 && (
                <>
                  <p style={sectionTitle}>Temas de interés</p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {interests.map((i) => <span key={i} style={{ padding: '6px 12px', borderRadius: '999px', fontSize: '11.5px', fontWeight: 500, background: 'var(--drb-surface-card)', border: '1px solid var(--drb-border-soft)', color: 'var(--drb-text-secondary)' }}>{interestLabels[i] ?? i}</span>)}
                  </div>
                </>
              )}

              {/* ── BOTONES ESTADO 2 ──────────────────────── */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '24px' }}>
                <button onClick={() => router.push('/chat?mode=profile')} style={{ width: '100%', padding: '14px', borderRadius: '999px', background: 'linear-gradient(135deg, #b794f4, #ed64a6)', color: 'white', fontSize: '14px', fontWeight: 600, border: 'none', cursor: 'pointer', boxShadow: '0 4px 18px rgba(183,148,244,0.45)' }}>💬 Ir al chat personalizado</button>
                <button onClick={() => setIsEditing(true)} style={{ width: '100%', padding: '12px', borderRadius: '999px', background: 'var(--drb-surface-card)', color: 'var(--drb-text-muted)', fontSize: '13px', fontWeight: 500, border: '1px solid var(--drb-border-soft)', cursor: 'pointer' }}>✏️ Actualizar mis datos</button>

                {/* 🆕 Eliminar perfil — disponible para todas */}
                <button
                  onClick={() => setShowDeleteProfileModal(true)}
                  style={{ width: '100%', padding: '11px', borderRadius: '999px', background: 'transparent', color: '#d4537e', fontSize: '13px', border: '1px solid rgba(212,83,126,0.3)', cursor: 'pointer' }}
                >
                  🗑️ Eliminar mi perfil
                </button>

                {/* Eliminar cuenta — solo si Google */}
                {isGoogle && (
                  <button
                    onClick={() => setShowDeleteModal(true)}
                    style={{ width: '100%', padding: '11px', borderRadius: '999px', background: 'transparent', color: '#a0395e', fontSize: '12px', border: '1px solid rgba(160,57,94,0.2)', cursor: 'pointer' }}
                  >
                    💀 Eliminar mi cuenta
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── MODAL ELIMINAR PERFIL ────────────────────────────── */}
      {showDeleteProfileModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 500, background: 'rgba(15,5,30,0.8)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', padding: '0 16px 40px' }}
          onClick={() => !isDeletingProfile && setShowDeleteProfileModal(false)}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: '100%', maxWidth: '420px', background: 'var(--drb-surface-strong)', borderRadius: '24px', padding: '24px 20px 20px', boxShadow: '0 -4px 40px rgba(200,50,100,0.2)', animation: 'drb-fade-up 0.25s ease both', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px' }}>
            <div style={{ width: '52px', height: '52px', borderRadius: '50%', background: 'rgba(212,83,126,0.1)', border: '1px solid rgba(212,83,126,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>🗑️</div>
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontSize: '16px', fontWeight: 700, color: 'var(--drb-text-primary)', margin: '0 0 8px' }}>¿Eliminar tu perfil?</p>
              <p style={{ fontSize: '13px', color: 'var(--drb-text-muted)', lineHeight: 1.55, margin: 0 }}>
                Se borrarán tus datos — nombre, procedimientos, salud e intereses.
              </p>
              {isGoogle && (
                <p style={{ fontSize: '12px', color: 'var(--drb-text-hint)', marginTop: '6px' }}>
                  Tu cuenta de Google se mantiene vinculada.
                </p>
              )}
              <p style={{ fontSize: '12px', color: '#d4537e', marginTop: '8px', fontWeight: 500 }}>Esta acción no se puede deshacer.</p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%' }}>
              <button onClick={handleDeleteProfile} disabled={isDeletingProfile} style={{ width: '100%', padding: '13px', borderRadius: '999px', background: isDeletingProfile ? 'rgba(212,83,126,0.4)' : 'linear-gradient(135deg, #d4537e, #b03060)', color: 'white', fontSize: '14px', fontWeight: 600, border: 'none', cursor: isDeletingProfile ? 'not-allowed' : 'pointer', boxShadow: isDeletingProfile ? 'none' : '0 4px 16px rgba(180,48,96,0.35)' }}>
                {isDeletingProfile ? 'Eliminando…' : 'Sí, eliminar mi perfil'}
              </button>
              <button onClick={() => setShowDeleteProfileModal(false)} disabled={isDeletingProfile} style={{ width: '100%', padding: '12px', borderRadius: '999px', background: 'var(--drb-surface-card)', color: 'var(--drb-text-muted)', fontSize: '13px', fontWeight: 500, border: '1px solid var(--drb-border-soft)', cursor: 'pointer' }}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL ELIMINAR CUENTA ────────────────────────────── */}
      {showDeleteModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 500, background: 'rgba(15,5,30,0.8)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', padding: '0 16px 40px' }}
          onClick={() => !deleting && setShowDeleteModal(false)}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: '100%', maxWidth: '420px', background: 'var(--drb-surface-strong)', borderRadius: '24px', padding: '24px 20px 20px', boxShadow: '0 -4px 40px rgba(200,50,100,0.25)', animation: 'drb-fade-up 0.25s ease both', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px' }}>
            <div style={{ width: '52px', height: '52px', borderRadius: '50%', background: 'rgba(160,57,94,0.12)', border: '1px solid rgba(160,57,94,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>💀</div>
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontSize: '16px', fontWeight: 700, color: 'var(--drb-text-primary)', margin: '0 0 8px' }}>¿Eliminar tu cuenta?</p>
              <p style={{ fontSize: '13px', color: 'var(--drb-text-muted)', lineHeight: 1.55, margin: 0 }}>
                Se borrarán <strong>todos tus datos</strong> y tu cuenta de Google vinculada a Dr. BeautyBot.
              </p>
              <p style={{ fontSize: '12px', color: '#d4537e', marginTop: '8px', fontWeight: 500 }}>Esta acción no se puede deshacer.</p>
            </div>
            {deleteError && (
              <div style={{ width: '100%', padding: '10px 14px', borderRadius: '12px', background: 'rgba(212,83,126,0.08)', border: '1px solid rgba(212,83,126,0.2)' }}>
                <p style={{ fontSize: '12px', color: '#d4537e', margin: 0, lineHeight: 1.45 }}>⚠️ {deleteError}</p>
              </div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%' }}>
              <button onClick={handleDeleteAccount} disabled={deleting} style={{ width: '100%', padding: '13px', borderRadius: '999px', background: deleting ? 'rgba(160,57,94,0.4)' : 'linear-gradient(135deg, #a0395e, #6b1f3a)', color: 'white', fontSize: '14px', fontWeight: 600, border: 'none', cursor: deleting ? 'not-allowed' : 'pointer', boxShadow: deleting ? 'none' : '0 4px 16px rgba(107,31,58,0.4)' }}>
                {deleting ? 'Eliminando…' : 'Sí, eliminar mi cuenta'}
              </button>
              <button onClick={() => setShowDeleteModal(false)} disabled={deleting} style={{ width: '100%', padding: '12px', borderRadius: '999px', background: 'var(--drb-surface-card)', color: 'var(--drb-text-muted)', fontSize: '13px', fontWeight: 500, border: '1px solid var(--drb-border-soft)', cursor: 'pointer' }}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── DIÁLOGO POST-GUARDADO ────────────────────────────── */}
      {showSavedDialog && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 400, background: 'rgba(15,5,30,0.75)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', padding: '0 16px 40px' }} onClick={() => setShowSavedDialog(false)}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: '100%', maxWidth: '420px', background: 'var(--drb-surface-strong)', borderRadius: '24px', padding: '24px 20px 20px', boxShadow: '0 -4px 40px rgba(130,80,200,0.25)', animation: 'drb-fade-up 0.3s ease both', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
            <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'linear-gradient(135deg, rgba(183,148,244,0.2), rgba(237,100,166,0.15))', border: '1px solid rgba(183,148,244,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '26px' }}>✅</div>
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontSize: '16px', fontWeight: 700, color: 'var(--drb-text-primary)', margin: '0 0 6px' }}>¡Perfil guardado!</p>
              <p style={{ fontSize: '13px', color: 'var(--drb-text-muted)', lineHeight: 1.5, margin: 0 }}>¿A dónde quieres ir ahora?</p>
            </div>
            {isSupported && permission !== 'granted' && reminders.length > 0 && (
              <div style={{ width: '100%', padding: '14px 16px', borderRadius: '18px', background: 'linear-gradient(135deg, rgba(183,148,244,0.12), rgba(237,100,166,0.08))', border: '1px solid rgba(183,148,244,0.25)' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                  <span style={{ fontSize: '22px', flexShrink: 0 }}>🔔</span>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--drb-text-primary)', margin: '0 0 4px' }}>Recordatorios de reaplicación</p>
                    <p style={{ fontSize: '12px', color: 'var(--drb-text-muted)', lineHeight: 1.4, margin: '0 0 10px' }}>Tienes {reminders.length} procedimiento{reminders.length > 1 ? 's' : ''} registrado{reminders.length > 1 ? 's' : ''}. ¿Quieres que te avisemos cuando sea tiempo de reaplicar?</p>
                    <button onClick={async () => { const granted = await request(); if (granted) await scheduleFromProfile(); }} style={{ padding: '8px 16px', borderRadius: '999px', background: 'linear-gradient(135deg, #b794f4, #ed64a6)', color: 'white', fontSize: '12px', fontWeight: 600, border: 'none', cursor: 'pointer', boxShadow: '0 3px 10px rgba(183,148,244,0.4)' }}>🔔 Activar recordatorios</button>
                  </div>
                </div>
              </div>
            )}
            {permission === 'granted' && reminders.length > 0 && (
              <div style={{ width: '100%', padding: '12px 16px', borderRadius: '16px', background: 'rgba(72,187,120,0.1)', border: '1px solid rgba(72,187,120,0.25)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '18px' }}>✓</span>
                <p style={{ fontSize: '12px', color: '#38a169', margin: 0, lineHeight: 1.4 }}>Recordatorios activados — te avisaremos 30 días antes de cada reaplicación.</p>
              </div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%' }}>
              <button onClick={() => router.push('/chat?mode=profile')} style={{ width: '100%', padding: '13px', borderRadius: '999px', background: 'linear-gradient(135deg, #b794f4, #ed64a6)', color: 'white', fontSize: '14px', fontWeight: 600, border: 'none', cursor: 'pointer', boxShadow: '0 4px 16px rgba(183,148,244,0.45)' }}>💬 Ir al chat personalizado</button>
              <button onClick={() => router.push('/')} style={{ width: '100%', padding: '12px', borderRadius: '999px', background: 'var(--drb-surface-card)', color: 'var(--drb-text-muted)', fontSize: '13px', fontWeight: 500, border: '1px solid var(--drb-border-soft)', cursor: 'pointer' }}>🏠 Volver al inicio</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}