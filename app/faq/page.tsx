'use client';

import { useEffect, useState, ReactNode } from 'react';
import Link from 'next/link';

/*
  CHANGELOG — 2025-12-27 (B)
  - Fix móvil: se añade paddingTop usando env(safe-area-inset-top) para que el logo
    nunca quede cortado en pantallas con notch / barra del navegador.
  - Se simplifica el layout superior: logo centrado, tarjeta FAQ debajo, sin posiciones negativas.
  - Se mantiene fondo tipo tapiz con animación suave estilo /donations.
  - Botón "Volver al chat" detecta si hay perfil guardado y redirige a /chat?mode=profile
    o /chat?mode=quick en caso contrario.
*/

const FAQ_BG_URL = 'https://i.ibb.co/k6DhyGNp/IMG-7142.jpg';
const FAQ_LOGO_URL = 'https://i.ibb.co/CprzcnhH/Adobe-Express-file.png';

interface FaqItem {
  title: string;
  body: ReactNode;
}

const FAQ_ITEMS: FaqItem[] = [
  {
    title: '¿Qué es Dr. BeautyBot?',
    body: (
      <>
        <p className="mb-3">
          Dr. BeautyBot es tu <strong>compañero virtual en medicina estética</strong>. No viene a
          reemplazar a tu médico, sino a ayudarte a entender mejor los tratamientos, resolver dudas
          frecuentes y orientarte antes de tomar decisiones importantes sobre tu piel y tu cuerpo.
        </p>
        <p>
          Piensa en él como esa persona que se sabe todos los detalles técnicos, pero te los explica{' '}
          <strong>con calma, en lenguaje sencillo y sin juicios</strong>.
        </p>
      </>
    ),
  },
  {
    title: 'Formas de consulta: rápida vs personalizada',
    body: (
      <>
        <p className="mb-2">
          Tienes dos maneras principales de usar Dr. BeautyBot, según el tiempo y la profundidad que
          necesites:
        </p>
        <ul className="list-disc pl-5 space-y-1">
          <li>
            <strong>Consulta rápida:</strong> ideal para dudas puntuales, por ejemplo “¿qué tan
            común es que salga un moretón después de toxina?” o “¿qué significa ácido hialurónico
            reticulado?”.
          </li>
          <li>
            <strong>Consulta personalizada:</strong> si completas tu perfil, el bot tendrá más
            contexto sobre tu rango de edad, zona de interés y antecedentes estéticos. Así puede
            adaptar mejor las explicaciones a tu situación.
          </li>
        </ul>
        <p className="mt-3">
          En ambos casos, la información es <strong>orientativa</strong> y no sustituye una consulta
          médica presencial.
        </p>
      </>
    ),
  },
  {
    title: '¿Qué pasa con la información que compartes?',
    body: (
      <>
        <p className="mb-2">
          La información que compartes en tu perfil se usa para poder darte respuestas más claras y
          contextualizadas. Por ejemplo, saber si ya te has aplicado toxina o rellenos ayuda a
          explicar mejor riesgos, tiempos de duración o cuidados.
        </p>
        <p className="mb-2">
          El objetivo es <strong>orientarte</strong>, no juzgarte ni evaluarte. Tu perfil no es una
          historia clínica formal, sino una guía para adaptar las explicaciones.
        </p>
        <p>
          Siempre que tengas dudas sobre privacidad o te incomode compartir algo, puedes preguntar
          usando solo la <strong>consulta rápida</strong>.
        </p>
      </>
    ),
  },
  {
    title: 'Lo que SÍ hace Dr. BeautyBot',
    body: (
      <ul className="list-disc pl-5 space-y-1">
        <li>Te explica conceptos de medicina estética en lenguaje claro.</li>
        <li>
          Te ayuda a entender <strong>beneficios, tiempos y cuidados generales</strong> de distintos
          procedimientos.
        </li>
        <li>
          Te da <strong>pistas útiles</strong> para conversar mejor con tu médico (qué preguntar,
          qué datos son importantes, qué cosas vale la pena aclarar).
        </li>
        <li>
          Refuerza mensajes de <strong>seguridad, realismo y cuidado de la salud</strong> por encima
          de modas o tendencias virales.
        </li>
      </ul>
    ),
  },
  {
    title: 'Lo que NO hace Dr. BeautyBot',
    body: (
      <ul className="list-disc pl-5 space-y-1">
        <li>No puede sustituir una valoración médica presencial.</li>
        <li>
          No prescribe tratamientos, dosis ni combina productos específicos para un caso individual.
        </li>
        <li>No realiza diagnósticos formales.</li>
        <li>
          No reemplaza el consentimiento informado que debes firmar con tu médico antes de cualquier
          procedimiento.
        </li>
      </ul>
    ),
  },
  {
    title: 'Tu espacio seguro para preguntar',
    body: (
      <>
        <p className="mb-2">
          Muchas personas sienten vergüenza o miedo de preguntar ciertas cosas en consulta:
          complicaciones, precios, resultados realistas, o incluso qué ocurre si algo sale mal.
        </p>
        <p className="mb-2">
          Dr. BeautyBot está pensado como un <strong>espacio seguro</strong> para explorar esas
          dudas, entender mejor los conceptos y llegar a tu médico mucho más informada.
        </p>
        <p>
          Cuanto más claro entiendas lo que quieres y lo que no, más fácil será tomar decisiones
          cuidadosas sobre tu cuerpo.
        </p>
      </>
    ),
  },
];

export default function FaqPage() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  const [chatHref, setChatHref] = useState('/chat?mode=quick');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = window.localStorage.getItem('drbeautybot_profile');
      if (raw) setChatHref('/chat?mode=profile');
    } catch {
      // ignore
    }
  }, []);

  return (
    <main
      className="min-h-screen flex flex-col items-center px-4 pb-10 faq-bg-animated"
      style={{
        backgroundColor: '#DFF7EC',
        backgroundImage: `url(${FAQ_BG_URL})`,
        backgroundRepeat: 'repeat',
        backgroundSize: '420px auto',
        paddingTop: 'calc(env(safe-area-inset-top, 0px) + 4rem)', // 👈 baja todo en móvil
      }}
    >
      {/* Animación suave del tapiz */}
      <style>{`
        @keyframes faqBgScroll {
          from { background-position: 0 0; }
          to   { background-position: -420px -420px; }
        }
        .faq-bg-animated {
          animation: faqBgScroll 160s linear infinite;
        }
        @media (max-width: 640px) {
          .faq-bg-animated {
            animation-duration: 190s;
          }
        }
      `}</style>

      <section className="w-full max-w-4xl flex flex-col items-center text-center z-10">
        {/* Logo siempre visible, centrado */}
        <img
          src={FAQ_LOGO_URL}
          alt="Dr. BeautyBot"
          className="mx-auto w-full max-w-[260px] drop-shadow-[0_18px_34px_rgba(0,0,0,0.35)] mb-4"
          draggable={false}
        />

        {/* Tarjeta principal */}
        <div className="w-full rounded-[32px] bg-[#FDF7EC]/95 shadow-[0_18px_55px_rgba(0,0,0,0.40)] border border-black/10 overflow-hidden">
          {/* Header azul */}
          <header className="bg-[#9BD4F5] px-6 py-5 md:px-8 md:py-6 text-left">
            <h1 className="text-xl md:text-2xl font-bold text-slate-900">
              ¿Cómo funciona Dr. BeautyBot?
            </h1>
            <p className="mt-1 text-sm md:text-[0.95rem] text-slate-800 max-w-2xl">
              Tu compañero virtual en medicina estética: información clara, responsable y fácil de
              entender.
            </p>
          </header>

          {/* Acordeón */}
          <div className="px-4 py-5 md:px-6 md:py-6 space-y-4 bg-[#FBEEDC]">
            {FAQ_ITEMS.map((item, index) => {
              const isOpen = openIndex === index;
              return (
                <div
                  key={item.title}
                  className="bg-white rounded-[24px] shadow-md border border-black/5 overflow-hidden"
                >
                  <button
                    type="button"
                    className="w-full flex items-center justify-between text-left px-4 md:px-5 py-3 md:py-4"
                    onClick={() => setOpenIndex(isOpen ? null : index)}
                  >
                    <span className="text-sm md:text-[0.95rem] font-semibold text-slate-900">
                      {item.title}
                    </span>
                    <span
                      className={`
                        flex h-7 w-7 items-center justify-center rounded-full border text-sm
                        transition
                        ${isOpen ? 'bg-[#FCCD78] border-[#F0B95C]' : 'bg-white border-slate-300'}
                      `}
                    >
                      {isOpen ? '−' : '+'}
                    </span>
                  </button>

                  {isOpen && (
                    <div className="px-4 md:px-5 pb-4 md:pb-5 text-sm md:text-[0.95rem] text-slate-800 border-t border-slate-100 bg-[#FFF9F2]">
                      {item.body}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Botón volver al chat */}
            <div className="pt-2 flex justify-center">
              <Link
                href={chatHref}
                className="inline-flex items-center justify-center px-6 py-3 rounded-full bg-[#FCCD78] hover:bg-[#FAD28C] text-sm md:text-[0.95rem] font-semibold text-slate-900 shadow-md transition"
              >
                Volver al chat
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
