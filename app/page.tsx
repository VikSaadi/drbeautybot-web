'use client';

import Link from 'next/link';

/**
 * CHANGELOG app/page.tsx
 * - 2025-12-16: Landing Aesthetica AI (header, hero, tarjetas, footer).
 * - 2025-12-16: CTA "Consulta rápida" → /chat?mode=quick.
 * - 2025-12-16: CTA "Consulta personal" → /profile (flujo con formulario).
 * - 2025-12-16: Renombradas tarjetas "Temas populares"→"Donativos" y "Testimonios"→"Contacto"; footer nav actualizado.
 * - 2025-12-26: Nueva landing DrBeautyBot con fondo tipo tapiz animado:
 *   - Reemplazado layout AESTHETICA AI por hero centrado con logo PNG + ilustración del robot.
 *   - Botones principales: "Consulta rápida" y "Consulta personalizada" se mantienen enlazando a /chat?mode=quick y /profile.
 *   - Botones secundarios pastel: "Cómo funciona", "Donativos" y "Contacto".
 *   - Eliminados header/olas negras y footer anteriores (se simplifica la home).
 * - 2025-12-27: Se conectan los botones secundarios pastel:
 *   - "Cómo funciona" → /faq
 *   - "Donativos" → /donaciones
 *   - "Contacto" → /contact
 */

export default function HomePage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-4 antialiased overflow-y-auto font-sans">
      <section className="max-w-4xl w-full flex flex-col items-center text-center z-10 relative my-auto py-6">
        {/* Logo principal como imagen (incluye tagline en el PNG) */}
        <h1 className="mb-2">
          <span className="sr-only">Chatea con Dr. BeautyBot, tu experta en medicina estética</span>
          <img
            src="https://i.ibb.co/67kBFBRY/TIPOGRAFIA-SOLA-doctorbeautybot-logo-rekorte.png"
            alt="Dr. BeautyBot - Medicina Estética"
            className="mx-auto w-full max-w-[420px] drop-shadow-xl"
          />
        </h1>

        {/* Ilustración del robot + pantalla */}
        <div className="mb-8 relative w-full max-w-2xl flex justify-center">
          <img
            src="https://i.ibb.co/MDBspJsL/monito-rekorte-3-OK.png"
            alt="Dr. BeautyBot analizando en pantalla holográfica"
            className="w-full max-w-[420px] h-auto object-contain drop-shadow-xl anim-float"
          />
        </div>

        {/* Botones principales (CTA) */}
        <div className="flex flex-col md:flex-row gap-4 w-full max-w-2xl mb-6 justify-center px-4">
          {/* Consulta rápida → chat en modo quick */}
          <Link
            href="/chat?mode=quick"
            className="flex-1 bg-gradient-to-r from-[#5E8BD1] to-[#3B69B3] text-white py-3 md:py-4 px-6 rounded-full shadow-soft text-lg font-bold flex items-center justify-center gap-3 btn-scale"
          >
            <i className="fa-regular fa-clock text-xl" aria-hidden="true" />
            <span>Consulta rápida</span>
          </Link>

          {/* Consulta personalizada → perfil */}
          <Link
            href="/profile"
            className="flex-1 bg-gradient-to-r from-[#83D5C4] to-[#60BCAA] text-white py-3 md:py-4 px-6 rounded-full shadow-soft text-lg font-bold flex items-center justify-center gap-3 btn-scale"
          >
            <i className="fa-regular fa-user text-xl" aria-hidden="true" />
            <span>Consulta personalizada</span>
          </Link>
        </div>

        {/* Botones secundarios pastel */}
        <div className="flex flex-col md:flex-row gap-3 w-full max-w-3xl justify-center flex-wrap px-4 pb-4">
          <Link
            href="/faq"
            className="bg-[#A8EADB] text-[#4A5568] py-3 px-6 rounded-2xl shadow-soft font-bold flex items-center justify-center gap-3 btn-scale flex-grow md:flex-grow-0 min-w-[160px]"
          >
            <i className="fa-solid fa-gear text-lg opacity-70" aria-hidden="true" />
            <span>Cómo funciona</span>
          </Link>

          <Link
            href="/donaciones"
            className="bg-[#F8C6C6] text-[#4A5568] py-3 px-6 rounded-2xl shadow-soft font-bold flex items-center justify-center gap-3 btn-scale flex-grow md:flex-grow-0 min-w-[160px]"
          >
            <i className="fa-solid fa-gift text-lg opacity-70" aria-hidden="true" />
            <span>Donativos</span>
          </Link>

          <Link
            href="/contact"
            className="bg-[#FCE99A] text-[#4A5568] py-3 px-6 rounded-2xl shadow-soft font-bold flex items-center justify-center gap-3 btn-scale flex-grow md:flex-grow-0 min-w-[160px]"
          >
            <i className="fa-regular fa-envelope text-lg opacity-70" aria-hidden="true" />
            <span>Contacto</span>
          </Link>
        </div>
      </section>

      {/* Icono decorativo en esquina inferior derecha */}
      <div className="fixed bottom-4 right-4 text-[#718096] opacity-30 text-3xl md:text-4xl z-0 pointer-events-none">
        <i className="fa-solid fa-sparkles" aria-hidden="true" />
      </div>
    </main>
  );
}
