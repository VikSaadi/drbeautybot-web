'use client';

/*
  CHANGELOG — 2025-12-27 (B)
  - Se reemplaza el parallax con JS por una animación CSS tipo /chat (tapiz repetido y suave).
  - Se elimina el header tipo chat (avatar + "Dr. BeautyBot en línea") dentro de la tarjeta.
  - La tarjeta del formulario mantiene estilo crema y añade acento azul #9BD4F5 en la parte superior.
  - Se preserva el layout: globo a la izquierda y robot a la derecha, ambos por fuera del recuadro
    y con comportamiento responsive (centrados en móvil).
*/

/*
  CHANGELOG — 2025-12-27 (A)
  - Profile UI: se unifica parcialmente el look & feel con /chat (tarjeta crema, sombras suaves, inputs claros).
  - Layout: el robot queda FUERA del recuadro del formulario a la derecha (desktop).
  - Layout: globo queda FUERA del recuadro a la izquierda y arriba (desktop) y NO desaparece en móvil:
    se reubica arriba del formulario (centrado) con tamaño responsive.
*/

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { db } from '@/lib/firebase';
import { addDoc, collection } from 'firebase/firestore';

//
// 🔹 1. Tipo de datos de perfil (pensado para futuro backend/estadísticas)
//
interface ProfileData {
  name: string;
  ageRange: string;
  country: string;
  area: string;
  interests: string[];
  previousProcedures: string[];
  botoxZones: string[];
  fillerMaterials: string[];
  fillerMaterialOther: string;
  fillerZones: string[];
  healthConditions: string[];
  healthOther: string;
  isPregnant: boolean;
  acceptedDisclaimer: boolean;
  createdAt: string;
}

/** ✅ ASSETS (fáciles de encontrar y cambiar) */
const PROFILE_MASCOT_URL = 'https://i.ibb.co/8nhxvDKf/Untitled-1.png';

/** 🔎🔎🔎 FONDO DEL PERFIL — CAMBIAR AQUÍ (SEÑALIZACIÓN) 🔎🔎🔎 */
const PROFILE_BG_URL = 'https://i.ibb.co/VcCc6CHL/IMG-7140.jpg';

export default function ProfilePage() {
  const router = useRouter();

  // 🔹 Estado del formulario (campos básicos)
  const [name, setName] = useState('');
  const [ageRange, setAgeRange] = useState('');
  const [country, setCountry] = useState('');
  const [area, setArea] = useState('');

  // 🔹 Intereses + procedimientos previos
  const [interests, setInterests] = useState<string[]>([]);
  const [previousProcedures, setPreviousProcedures] = useState<string[]>([]);

  // Subdetalle: zonas de toxina botulínica
  const [botoxZones, setBotoxZones] = useState<string[]>([]);

  // Subdetalle: fillers/rellenos (material + zona)
  const [fillerMaterials, setFillerMaterials] = useState<string[]>([]);
  const [fillerMaterialOther, setFillerMaterialOther] = useState('');
  const [fillerZones, setFillerZones] = useState<string[]>([]);

  // 🔹 Salud
  const [healthConditions, setHealthConditions] = useState<string[]>([]);
  const [healthOther, setHealthOther] = useState('');
  const [isPregnant, setIsPregnant] = useState(false);

  // 🔹 Aviso legal
  const [acceptedDisclaimer, setAcceptedDisclaimer] = useState(false);

  // Helper genérico para checkboxes múltiples
  const toggleInArray = (value: string, array: string[], setter: (v: string[]) => void) => {
    if (array.includes(value)) {
      setter(array.filter((item) => item !== value));
    } else {
      setter([...array, value]);
    }
  };

  // Envío del formulario
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!acceptedDisclaimer) {
      alert('Por favor, acepta el aviso para continuar.');
      return;
    }

    const profileData: ProfileData = {
      name,
      ageRange,
      country,
      area,
      interests,
      previousProcedures,
      botoxZones,
      fillerMaterials,
      fillerMaterialOther,
      fillerZones,
      healthConditions,
      healthOther,
      isPregnant,
      acceptedDisclaimer,
      createdAt: new Date().toISOString(),
    };

    try {
      await addDoc(collection(db, 'profiles'), profileData);

      if (typeof window !== 'undefined') {
        const profileSummary = {
          name,
          ageRange,
          country,
          area,
          interests,
          previousProcedures,
          isPregnant,
        };
        window.localStorage.setItem('drbeautybot_profile', JSON.stringify(profileSummary));
      }

      router.push('/chat?mode=profile');
    } catch (error) {
      console.error('Error al guardar el perfil en Firestore:', error);
      alert('Ocurrió un problema al guardar tu información. Intenta de nuevo más tarde.');
    }
  };

  return (
    <main
      className="min-h-screen flex flex-col items-center px-4 py-8 profile-bg-animated"
      style={{
        backgroundColor: '#FEF9E7',
        backgroundImage: `url(${PROFILE_BG_URL})`, // 🔎🔎🔎 FONDO DEL PERFIL — CAMBIAR AQUÍ 🔎🔎🔎
        backgroundRepeat: 'repeat',
        backgroundSize: '420px auto',
      }}
    >
      {/* 🔄 Parallax suave tipo /chat */}
      <style>{`
        @keyframes profileBgScroll {
          from {
            background-position: 0 0;
          }
          to {
            background-position: -420px -420px;
          }
        }
        .profile-bg-animated {
          animation: profileBgScroll 140s linear infinite;
        }
        @media (max-width: 640px) {
          .profile-bg-animated {
            animation-duration: 180s;
          }
        }
      `}</style>

      {/* ✅ Wrapper del “escenario” (globo + robot + tarjeta) */}
      <div className="relative w-full max-w-3xl z-10">
        {/* ✅ Globo:
            - Mobile: centrado arriba
            - Desktop: a la izquierda, por encima del recuadro del formulario
        */}
        <div
          className="
            relative
            mx-auto
            w-full max-w-xl
            md:max-w-[420px]
            md:absolute md:left-0 md:top-4
            bg-white/80
            backdrop-blur-md
            border border-white/80
            rounded-[22px]
            shadow-[0_18px_40px_rgba(0,0,0,0.30)]
            px-5 py-4
            text-slate-900
          "
        >
          <div className="text-lg font-semibold leading-tight">Consulta personalizada</div>
          <p className="mt-1 text-sm text-slate-700">
            Cuéntame un poco sobre ti para orientar mejor la información. No tomará más de 1 minuto.
          </p>

          {/* “colita” del globo (solo desktop) */}
          <div
            className="
              hidden md:block
              absolute -bottom-2 left-10
              h-4 w-4
              bg-white/80
              border-l border-b border-white/80
              rotate-45
              backdrop-blur-md
            "
          />
        </div>

        {/* ✅ Robot:
            - Mobile: centrado arriba del recuadro
            - Desktop: alineado a la derecha, fuera del recuadro del formulario
        */}
        <img
          src={PROFILE_MASCOT_URL}
          alt="Dr. BeautyBot"
          draggable={false}
          className="
            pointer-events-none select-none
            mx-auto mt-6
            h-[120px] w-auto
            drop-shadow-[0_18px_34px_rgba(0,0,0,0.45)]
            md:absolute md:right-0 md:top-0 md:mt-0
            md:h-[150px]
          "
        />

        {/* ✅ Recuadro del formulario (tarjeta crema con acento azul) */}
        <section
          className="
            mt-6
            md:mt-24
            mx-auto
            w-full
            max-w-2xl
            rounded-[32px]
            bg-[#FDF7EC]/96
            shadow-[0_18px_55px_rgba(0,0,0,0.40)]
            border border-black/10
            overflow-hidden
          "
        >
          {/* Banda superior de acento azul (sin header tipo chat) */}
          <div className="h-2 w-full bg-[#9BD4F5]" />

          {/* Contenido del formulario */}
          <div className="bg-[#FBEEDC] px-5 py-6 md:px-7 md:py-7">
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* 🔹 Nombre / apodo */}
              <div className="space-y-1">
                <label className="text-sm font-semibold text-slate-900" htmlFor="name">
                  Nombre o apodo
                </label>
                <input
                  id="name"
                  type="text"
                  placeholder="Ej. Laura, Ana, Vicky..."
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 shadow-inner outline-none focus:border-[#9BD4F5] focus:ring-2 focus:ring-[#9BD4F5]/40"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
                <p className="text-xs text-slate-600">Solo se usará para dirigirme a ti dentro del chat.</p>
              </div>

              {/* 🔹 País de residencia */}
              <div className="space-y-1">
                <label className="text-sm font-semibold text-slate-900" htmlFor="country">
                  País de residencia
                </label>
                <input
                  id="country"
                  type="text"
                  placeholder="Ej. México, Colombia, España..."
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 shadow-inner outline-none focus:border-[#9BD4F5] focus:ring-2 focus:ring-[#9BD4F5]/40"
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                />
                <p className="text-xs text-slate-600">
                  Este dato ayudará a entender desde dónde se conectan las pacientes.
                </p>
              </div>

              {/* 🔹 Rango de edad */}
              <div className="space-y-1">
                <label className="text-sm font-semibold text-slate-900" htmlFor="ageRange">
                  Rango de edad
                </label>
                <select
                  id="ageRange"
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-inner outline-none focus:border-[#9BD4F5] focus:ring-2 focus:ring-[#9BD4F5]/40"
                  value={ageRange}
                  onChange={(e) => setAgeRange(e.target.value)}
                >
                  <option value="">Selecciona una opción</option>
                  <option value="18-25">18 - 25 años</option>
                  <option value="26-35">26 - 35 años</option>
                  <option value="36-45">36 - 45 años</option>
                  <option value="46-55">46 - 55 años</option>
                  <option value="56+">56 años o más</option>
                </select>
              </div>

              {/* 🔹 Zona de interés principal */}
              <div className="space-y-1">
                <label className="text-sm font-semibold text-slate-900" htmlFor="area">
                  Zona o tratamiento de interés principal
                </label>
                <select
                  id="area"
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-inner outline-none focus:border-[#9BD4F5] focus:ring-2 focus:ring-[#9BD4F5]/40"
                  value={area}
                  onChange={(e) => setArea(e.target.value)}
                >
                  <option value="">Selecciona una opción</option>
                  <option value="rostro-general">Rostro en general</option>
                  <option value="toxina">Toxina botulínica</option>
                  <option value="rellenos">Fillers / rellenos</option>
                  <option value="labios">Labios</option>
                  <option value="laser">Láser / manchas / depilación</option>
                  <option value="cicatrices-acne">Cicatrices de acné</option>
                  <option value="otros">Otros</option>
                </select>
              </div>

              {/* 🔹 Intereses */}
              <div className="space-y-3">
                <p className="text-sm font-semibold text-slate-900">Otros temas que te interesan</p>

                {[
                  { k: 'prevencion-envejecimiento', label: 'Prevención del envejecimiento / mantenimiento' },
                  { k: 'manchas', label: 'Manchas / melasma' },
                  { k: 'alopecia', label: 'Alopecia / caída de cabello' },
                  { k: 'cuerpo', label: 'Tratamientos corporales' },
                ].map((it) => (
                  <label key={it.k} className="flex items-center gap-3 text-sm text-slate-800">
                    <input
                      type="checkbox"
                      className="h-4 w-4 accent-pink-500"
                      checked={interests.includes(it.k)}
                      onChange={() => toggleInArray(it.k, interests, setInterests)}
                    />
                    <span>{it.label}</span>
                  </label>
                ))}
              </div>

              {/* 🔹 Procedimientos previos */}
              <div className="space-y-3">
                <p className="text-sm font-semibold text-slate-900">
                  ¿Te has realizado alguno de estos tratamientos?
                </p>

                <label className="flex items-center gap-3 text-sm text-slate-800">
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-pink-500"
                    checked={previousProcedures.includes('toxina')}
                    onChange={() => toggleInArray('toxina', previousProcedures, setPreviousProcedures)}
                  />
                  <span>Toxina botulínica</span>
                </label>

                {previousProcedures.includes('toxina') && (
                  <div className="rounded-2xl bg-white/70 border border-black/5 p-4">
                    <p className="text-xs font-semibold text-slate-700 mb-2">
                      ¿En qué zonas te la has aplicado?
                    </p>

                    <div className="grid gap-2">
                      {[
                        { value: 'baby-botox', label: 'Baby botox (preventivo)' },
                        { value: 'antifaz', label: 'Antifaz (entrecejo, bunny lines y patas de gallo)' },
                        {
                          value: 'full-face-i',
                          label: 'Full Face I (entrecejo, bunny lines, patas de gallo, frente completa)',
                        },
                        {
                          value: 'full-face-ii',
                          label:
                            'Full Face II (entrecejo, bunny lines, patas de gallo, frente completa, mentón, nariz)',
                        },
                        {
                          value: 'nefertiti-neck',
                          label: 'Nefertiti Neck (bandas de platisma, contorno mandibular)',
                        },
                        { value: 'gummy-smile', label: 'Gummy Smile (sonrisa gingival)' },
                        { value: 'lip-flip', label: 'Lip Flip (labios)' },
                        { value: 'bruxismo', label: 'Bruxismo (músculos maseteros)' },
                        { value: 'trap-botox', label: 'Trap Botox / Barbie Botox (músculos del trapecio)' },
                      ].map((zone) => (
                        <label key={zone.value} className="flex items-center gap-3 text-xs text-slate-800">
                          <input
                            type="checkbox"
                            className="h-4 w-4 accent-pink-500"
                            checked={botoxZones.includes(zone.value)}
                            onChange={() => toggleInArray(zone.value, botoxZones, setBotoxZones)}
                          />
                          <span>{zone.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                <label className="flex items-center gap-3 text-sm text-slate-800">
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-pink-500"
                    checked={previousProcedures.includes('rellenos')}
                    onChange={() => {
                      const isSelected = previousProcedures.includes('rellenos');
                      toggleInArray('rellenos', previousProcedures, setPreviousProcedures);
                      if (isSelected) {
                        setFillerMaterials([]);
                        setFillerMaterialOther('');
                        setFillerZones([]);
                      }
                    }}
                  />
                  <span>Fillers / rellenos</span>
                </label>

                {previousProcedures.includes('rellenos') && (
                  <div className="rounded-2xl bg-white/70 border border-black/5 p-4 space-y-4">
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-slate-700">Material</p>
                      {[
                        {
                          value: 'ah',
                          label: 'Ácido Hialurónico (AH) (Juvéderm, Restylane, Revofil, Belotero, etc)',
                        },
                        { value: 'caha', label: 'Hidroxiapatita de Calcio (CaHA) (Radiesse)' },
                        { value: 'plla', label: 'Ácido Poliláctico (PLLA) (Sculptra)' },
                        { value: 'pcl-cmc', label: 'Policaprolactona (PCL) con CMC (Ellansé)' },
                        { value: 'otro-material', label: 'Otro - especificar' },
                      ].map((mat) => (
                        <label key={mat.value} className="flex items-center gap-3 text-xs text-slate-800">
                          <input
                            type="checkbox"
                            className="h-4 w-4 accent-pink-500"
                            checked={fillerMaterials.includes(mat.value)}
                            onChange={() => toggleInArray(mat.value, fillerMaterials, setFillerMaterials)}
                          />
                          <span>{mat.label}</span>
                        </label>
                      ))}

                      {fillerMaterials.includes('otro-material') && (
                        <div className="space-y-1 pt-2">
                          <label className="text-xs font-semibold text-slate-700" htmlFor="fillerMaterialOther">
                            Otro material - especificar
                          </label>
                          <input
                            id="fillerMaterialOther"
                            type="text"
                            placeholder="Escribe aquí el material..."
                            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs text-slate-900 placeholder:text-slate-400 shadow-inner outline-none focus:border-[#9BD4F5] focus:ring-2 focus:ring-[#9BD4F5]/40"
                            value={fillerMaterialOther}
                            onChange={(e) => setFillerMaterialOther(e.target.value)}
                          />
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-slate-700">Zona</p>
                      <div className="grid gap-2">
                        {[
                          { value: 'labios', label: 'Labios' },
                          { value: 'ojeras', label: 'Ojeras' },
                          { value: 'pomulos', label: 'Pómulos' },
                          { value: 'menton', label: 'Mentón' },
                          { value: 'nariz', label: 'Nariz' },
                          { value: 'surcos-nasogenianos', label: 'Surcos nasogenianos' },
                          { value: 'definicion-mandibular', label: 'Definición mandibular' },
                          { value: 'temporal', label: 'Zona temporal' },
                        ].map((zone) => (
                          <label key={zone.value} className="flex items-center gap-3 text-xs text-slate-800">
                            <input
                              type="checkbox"
                              className="h-4 w-4 accent-pink-500"
                              checked={fillerZones.includes(zone.value)}
                              onChange={() => toggleInArray(zone.value, fillerZones, setFillerZones)}
                            />
                            <span>{zone.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                <label className="flex items-center gap-3 text-sm text-slate-800">
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-pink-500"
                    checked={previousProcedures.includes('laser')}
                    onChange={() => toggleInArray('laser', previousProcedures, setPreviousProcedures)}
                  />
                  <span>Láser / luz pulsada / depilación</span>
                </label>

                <label className="flex items-center gap-3 text-sm text-slate-800">
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-pink-500"
                    checked={previousProcedures.includes('otros')}
                    onChange={() => toggleInArray('otros', previousProcedures, setPreviousProcedures)}
                  />
                  <span>Otros procedimientos estéticos</span>
                </label>
              </div>

              {/* 🔹 Salud */}
              <div className="space-y-3">
                <p className="text-sm font-semibold text-slate-900">Datos de salud relevantes</p>

                <div className="grid gap-2">
                  {[
                    { value: 'cardiopatias', label: 'Cardiopatías' },
                    { value: 'hipertension', label: 'Hipertensión' },
                    { value: 'hipotension', label: 'Hipotensión' },
                    { value: 'diabetes', label: 'Diabetes' },
                    { value: 'sop', label: 'Síndrome de ovario poliquístico' },
                    { value: 'anorexia-bulimia', label: 'Anorexia / Bulimia' },
                    { value: 'otros', label: 'Otros (especificar abajo)' },
                  ].map((condition) => (
                    <label key={condition.value} className="flex items-center gap-3 text-sm text-slate-800">
                      <input
                        type="checkbox"
                        className="h-4 w-4 accent-pink-500"
                        checked={healthConditions.includes(condition.value)}
                        onChange={() => toggleInArray(condition.value, healthConditions, setHealthConditions)}
                      />
                      <span>{condition.label}</span>
                    </label>
                  ))}
                </div>

                {healthConditions.includes('otros') && (
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700" htmlFor="healthOther">
                      Otros - especificar
                    </label>
                    <input
                      id="healthOther"
                      type="text"
                      placeholder="Escribe aquí la condición..."
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs text-slate-900 placeholder:text-slate-400 shadow-inner outline-none focus:border-[#9BD4F5] focus:ring-2 focus:ring-[#9BD4F5]/40"
                      value={healthOther}
                      onChange={(e) => setHealthOther(e.target.value)}
                    />
                  </div>
                )}

                <label className="flex items-center gap-3 text-sm text-slate-800 pt-1">
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-pink-500"
                    checked={isPregnant}
                    onChange={(e) => setIsPregnant(e.target.checked)}
                  />
                  <span>Estoy embarazada o en periodo de lactancia</span>
                </label>

                {isPregnant && (
                  <p className="text-xs text-amber-700 font-semibold bg-amber-100/70 border border-amber-200 rounded-2xl p-3">
                    NO ES RECOMENDABLE REALIZARSE PROCEDIMIENTOS COMO RELLENOS, TOXINA BOTULÍNICA, ETC DURANTE EL
                    EMBARAZO O LACTANCIA. AL CONTINUAR ACEPTAS QUE TUS DUDAS SON INFORMATIVAS Y QUE CUALQUIER
                    DECISIÓN DEBE SER CON TU MÉDICO.
                  </p>
                )}

                <p className="text-xs text-slate-600">
                  Esta información no sustituye una historia clínica formal, pero ayuda a orientar las recomendaciones.
                </p>
              </div>

              {/* 🔹 Disclaimer */}
              <div className="space-y-2">
                <label className="flex items-start gap-3 text-xs text-slate-700">
                  <input
                    type="checkbox"
                    className="mt-[3px] h-4 w-4 accent-pink-500"
                    checked={acceptedDisclaimer}
                    onChange={(e) => setAcceptedDisclaimer(e.target.checked)}
                  />
                  <span>
                    Entiendo que DrBeautyBot no sustituye una consulta médica presencial u online. La información que
                    reciba es orientativa y no constituye diagnóstico ni prescripción.
                  </span>
                </label>
              </div>

              {/* 🔹 Botones */}
              <div className="flex flex-col gap-2 pt-2">
                <button
                  type="submit"
                  className="w-full px-4 py-3 rounded-full bg-pink-500 hover:bg-pink-400 text-sm font-semibold text-white shadow-md transition"
                >
                  Ir al chat personalizado
                </button>

                <button
                  type="button"
                  onClick={() => router.push('/chat?mode=quick')}
                  className="w-full px-4 py-3 rounded-full border border-slate-400/70 bg-white/30 text-sm text-slate-900 hover:bg-white/40 transition"
                >
                  Prefiero una consulta rápida
                </button>
              </div>
            </form>
          </div>
        </section>
      </div>

      {/* Un poco de aire abajo para el scroll */}
      <div className="h-10" />
    </main>
  );
}
