'use client';

/*
  CHANGELOG — 2025-12-27
  - Se crea la página /donaciones con look & feel coherente con /chat, /profile y /faq.
  - Fondo con efecto parallax mediante backgroundPositionY dinámico.
  - Logo centrado en la parte superior.
  - Contenido informativo sobre donativos.
  - Botón "Volver al chat" que detecta si existe drbeautybot_profile en localStorage:
    - Si existe → /chat?mode=profile
    - Si no existe → /chat?mode=quick.
  - 2025-12-27 (B): Tamaño del logo homologado con /faq y /contact (w-full max-w-[260px]).
*/

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

/** ✅ ASSETS (fáciles de encontrar y cambiar) */
const DONATIONS_LOGO_URL = 'https://i.ibb.co/0y2m1R74/Untitled.png';

/** 🔎🔎🔎 FONDO DONACIONES — CAMBIAR AQUÍ (SEÑALIZACIÓN) 🔎🔎🔎 */
const DONATIONS_BG_URL = 'https://i.ibb.co/VWvTYBtj/IMG-7141.jpg';

export default function DonacionesPage() {
  const router = useRouter();

  // ✅ Parallax sin background-attachment: fixed
  const mainRef = useRef<HTMLElement | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const apply = () => {
      if (!mainRef.current) return;
      const y = window.scrollY || 0;
      const offset = Math.round(y * 0.18);
      mainRef.current.style.backgroundPosition = `center ${-offset}px`;
      rafRef.current = null;
    };

    const onScroll = () => {
      if (rafRef.current != null) return;
      rafRef.current = window.requestAnimationFrame(apply);
    };

    apply();
    window.addEventListener('scroll', onScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', onScroll);
      if (rafRef.current != null) window.cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const handleBackToChat = () => {
    try {
      if (typeof window !== 'undefined') {
        const raw = window.localStorage.getItem('drbeautybot_profile');
        if (raw) {
          router.push('/chat?mode=profile');
          return;
        }
      }
    } catch (error) {
      console.error('No se pudo leer drbeautybot_profile desde localStorage:', error);
    }

    router.push('/chat?mode=quick');
  };

  return (
    <main
      ref={(el) => {
        mainRef.current = el;
      }}
      className="min-h-screen flex flex-col items-center px-4 py-10"
      style={{
        backgroundColor: '#FEF9E7',
        backgroundImage: `url(${DONATIONS_BG_URL})`, // 🔎🔎🔎 FONDO DONACIONES — CAMBIAR AQUÍ 🔎🔎🔎
        backgroundRepeat: 'repeat',
        backgroundSize: '420px auto',
        backgroundPosition: 'center 0px',
      }}
    >
      {/* Overlay suave */}
      <div className="pointer-events-none fixed inset-0 bg-gradient-to-b from-white/40 via-white/30 to-white/40" />

      <div className="relative w-full max-w-3xl z-10 flex flex-col items-center">
        {/* Logo centrado, tamaño homologado */}
        <img
          src={DONATIONS_LOGO_URL}
          alt="Dr. BeautyBot"
          draggable={false}
          className="
            pointer-events-none select-none
            w-full max-w-[260px]
            drop-shadow-[0_18px_40px_rgba(0,0,0,0.35)]
            mb-4
          "
        />

        {/* Tarjeta principal */}
        <section
          className="
            mt-2
            w-full
            rounded-[32px]
            bg-[#FDF7EC]/95
            border border-black/10
            shadow-[0_18px_55px_rgba(0,0,0,0.35)]
            overflow-hidden
          "
        >
          <header className="bg-[#F8C6C6] px-6 py-4">
            <h1 className="text-lg md:text-xl font-semibold text-slate-900">Donativos</h1>
            <p className="text-xs md:text-sm text-slate-800/90 mt-1">
              Gracias por querer apoyar este proyecto. Cada aporte ayuda a mantener y mejorar Dr. BeautyBot.
            </p>
          </header>

          <div className="bg-[#FBEEDC] px-5 md:px-7 py-6 md:py-7 space-y-4 text-sm text-slate-800">
            <p>
              Dr. BeautyBot nació como una herramienta pensada para acercar la{' '}
              <strong>información en medicina estética</strong> a más personas, de forma clara,
              responsable y accesible.
            </p>

            <p>
              Los donativos ayudan a sostener el tiempo de desarrollo, pruebas, servidores y
              nuevas funciones que hacen que la experiencia sea cada vez más útil y segura.
            </p>

            <ul className="list-disc list-inside space-y-1">
              <li>Mejorar las respuestas y flujos de orientación.</li>
              <li>Incorporar más temas, procedimientos y escenarios reales.</li>
              <li>Seguir afinando mensajes de seguridad y advertencias responsables.</li>
            </ul>

            <p className="mt-2">
              Próximamente se habilitarán diferentes opciones para apoyar el proyecto
              (por ejemplo, donativos únicos, apoyo mensual o modalidades específicas).
            </p>

            <p className="mt-2 text-slate-700/90">
              Por ahora, el simple hecho de usar la app, compartir tu experiencia y enviar
              comentarios ya es una forma enorme de apoyar 💕
            </p>

            <div className="pt-4 flex justify-center">
              <button
                type="button"
                onClick={handleBackToChat}
                className="
                  px-5 py-2.5
                  rounded-full
                  bg-[#FCCD78]
                  hover:bg-[#FAD28C]
                  text-sm font-semibold text-slate-900
                  shadow-md
                  border border-[#F4C56F]/80
                  transition
                "
              >
                Volver al chat
              </button>
            </div>
          </div>
        </section>

        <div className="h-10" />
      </div>
    </main>
  );
}
