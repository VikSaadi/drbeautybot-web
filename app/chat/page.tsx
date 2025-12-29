'use client';

/*
  CHANGELOG — 2025-12-28
  - Se envuelve la página de chat en un <Suspense> con un componente interno
    ChatPageInner para cumplir con el requisito de Next 16 al usar useSearchParams.
*/

/*
  CHANGELOG — 2025-12-26 (E)
  - Mobile FIX: el botón "Nueva conversación" se mueve abajo-derecha (floating),
    para evitar superposición con el logo superior.
  - Desktop: el botón permanece arriba a la derecha (como estaba).
  - Se agrega movimiento tipo parallax/scroll infinito al fondo (CSS animation),
    reemplazando backgroundAttachment: 'fixed' (poco fiable en mobile).
*/

/*
  CHANGELOG — 2025-12-26 (D)
  - FIX logo flotante: se elimina el padding-top interno del <section> (pt-12/md:pt-16)
    que creaba la franja crema superior (parecía que la tarjeta “subía” con el logo).
  - En su lugar, se usa margin-top externo en la tarjeta (mt-16/md:mt-20) para reservar
    espacio real arriba sin afectar el layout interno del chat.
*/

/*
  CHANGELOG — 2025-12-26 (C)
  - Logo: ahora flota FUERA de la ventana del chat (overlay), centrado respecto a la tarjeta.
  - Se usa wrapper relative + posicionamiento absolute con top negativo.
  - Se mantiene PNG transparente, tamaño grande y sombra.
*/

/*
  CHANGELOG — 2025-12-26
  - Logo superior: se mueve al centro de la ventana del chat (sin contenedor/botón),
    manteniendo PNG transparente y añadiendo sombra tipo “flotante”.
  - Logo superior: se incrementa el tamaño para que sea claramente visible.
  - Fondo: se cambia el tapiz al nuevo patrón (con señalización para localizar la línea).
*/

/*
  CHANGELOG — 2025-12-22 (B)
  - Se elimina por completo el botón/ícono de clip en la barra de entrada.
  - Se rediseña el botón “Nueva conversación” con color amarillo pastel
    acorde a la paleta principal del chat.
*/

/*
  CHANGELOG — 2025-12-22
  - Se fija la altura de la tarjeta de chat para tener un layout más consistente
    (tanto en desktop como en móvil) y que el scroll ocurra solo dentro del área
    de mensajes.
  - Se añade auto-scroll al final del listado de mensajes cada vez que el usuario
    o el bot envían un mensaje, para que siempre se vea la parte más reciente
    de la conversación.
  - FIX: se simplifica la estructura del contenedor de mensajes usando
    flex-1 + min-h-0 + overflow-y-auto directamente sobre la zona de mensajes,
    evitando que el contenido “empuje” la barra de entrada y desaparezca.
*/

/*
  CHANGELOG — 2025-12-18
  - Se elimina la leyenda “AESTHETICA AI / Tu guía amigable…” y se reemplaza
    por un contenedor neutro para futuro logo en el header.
  - Se mejora la legibilidad del texto en el input: color de texto más oscuro
    y placeholder diferenciado.
  - Se deshabilita el botón de clip (adjuntar) dejándolo solo como ícono
    decorativo, sin interacción.
*/

/*
  CHANGELOG — 2025-12-17
  - Nuevo layout de chat estilo “WhatsApp” dentro de una tarjeta central:
    - Fondo oscuro global y tarjeta clara con encabezado verde menta.
    - Burbujas: usuario a la derecha en verde menta, bot a la izquierda en blanco.
  - Se mantiene intacta la lógica de:
    - sessionId por pestaña (sessionStorage) y botón “Nueva conversación”.
    - Lectura de perfil desde localStorage y saludo inicial según modo/perfil.
    - Envío a /api/chat con { message, mode, profile, sessionId }.
  - La cinta amarilla QUICK_DISCLAIMER se conserva SOLO en modo "quick"
    y SOLO para mensajes del bot, ahora dentro de cada burbuja.
*/

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { FormEvent, useEffect, useRef, useState } from 'react';

type Sender = 'user' | 'bot';

interface ChatMessage {
  id: number;
  sender: Sender;
  text: string;
}

interface StoredProfile {
  name?: string;
  ageRange?: string;
  country?: string;
  area?: string;
  interests?: string[];
  previousProcedures?: string[];
  isPregnant?: boolean;
}

const areaLabels: Record<string, string> = {
  'rostro-general': 'rostro en general',
  toxina: 'toxina botulínica',
  rellenos: 'fillers / rellenos',
  labios: 'labios',
  laser: 'láser / manchas / depilación',
  'cicatrices-acne': 'cicatrices de acné',
  otros: 'otros tratamientos estéticos',
};

const QUICK_DISCLAIMER =
  'Esta es una consulta rápida. La información que te daré es general y no sustituye una consulta médica.';

const SESSION_KEY = 'drbeautybot_chat_session_id';

function generateSessionId(): string {
  // Nota: en algunos entornos crypto.randomUUID puede no existir, por eso el check defensivo
  const uuid = typeof crypto !== 'undefined' && crypto?.randomUUID ? crypto.randomUUID() : null;
  if (uuid) return uuid;

  return `sess_${Date.now()}_${Math.random().toString(16).slice(2)}_${Math.random()
    .toString(16)
    .slice(2)}`;
}

/** ✅ ASSETS (fáciles de encontrar y cambiar) */
const CHAT_LOGO_URL = 'https://i.ibb.co/nNGLPYz5/doctorbeautybot-logo-rekorte.png';
const BOT_AVATAR_URL = 'https://i.ibb.co/XZLzLMW9/DON-REDONDON.png';

/** 🔎🔎🔎 FONDO DEL CHAT — CAMBIAR AQUÍ (SEÑALIZACIÓN) 🔎🔎🔎 */
const CHAT_BG_URL = 'https://i.ibb.co/Y7VkGPrX/IMG-7139.jpg';

function ChatPageInner() {
  const searchParams = useSearchParams();
  const mode = searchParams.get('mode'); // "quick" | "profile" | null

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      const existing = window.sessionStorage.getItem(SESSION_KEY);
      if (existing) {
        setSessionId(existing);
        return;
      }

      const created = generateSessionId();
      window.sessionStorage.setItem(SESSION_KEY, created);
      setSessionId(created);
    } catch (err) {
      console.error('No se pudo inicializar sessionId (sessionStorage):', err);
      setSessionId(generateSessionId());
    }
  }, []);

  useEffect(() => {
    if (!messagesEndRef.current) return;
    try {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
    } catch {
      // ignore
    }
  }, [messages]);

  const startNewConversation = () => {
    try {
      const created = generateSessionId();
      if (typeof window !== 'undefined') {
        window.sessionStorage.setItem(SESSION_KEY, created);
      }
      setSessionId(created);
      setIsSending(false);
      setInput('');
      setMessages([]);
    } catch (err) {
      console.error('No se pudo iniciar nueva conversación:', err);
      setIsSending(false);
      setInput('');
      setMessages([]);
    }
  };

  useEffect(() => {
    if (messages.length > 0) return;

    const greetingQuick =
      'Hola 💬, esta es una consulta rápida. Si más adelante quieres orientación más personalizada, podemos completar tu perfil.';
    const greetingDefault =
      'Hola 💉✨, soy DrBeautyBot. Te iré dando información adaptada a tu caso, pero recuerda que esto no sustituye una consulta médica.';

    let storedProfile: StoredProfile | null = null;
    try {
      if (typeof window !== 'undefined') {
        const raw = window.localStorage.getItem('drbeautybot_profile');
        if (raw) storedProfile = JSON.parse(raw) as StoredProfile;
      }
    } catch (error) {
      console.error('No se pudo leer el perfil guardado:', error);
    }

    let text: string;

    if (mode === 'quick') {
      text = greetingQuick;
    } else if (storedProfile) {
      const namePart = storedProfile.name ? `Hola, ${storedProfile.name}. ` : 'Hola. ';
      const areaKey = storedProfile.area ?? '';
      const areaLabel = areaLabels[areaKey] ?? '';
      const areaPart = areaLabel ? `He visto que te interesa ${areaLabel}. ` : '';
      const tail =
        'Te iré dando información orientativa basada en tus datos, pero recuerda que esto no sustituye una consulta médica.';
      text = `${namePart}${areaPart}${tail}`;
    } else {
      text = greetingDefault;
    }

    const now = Date.now();
    const initialMessages: ChatMessage[] = [{ id: now, sender: 'bot', text }];

    if (mode !== 'quick' && storedProfile?.isPregnant) {
      initialMessages.push({
        id: now + 1,
        sender: 'bot',
        text:
          'NO ES RECOMENDABLE REALIZARSE PROCEDIMIENTOS COMO RELLENOS, TOXINA BOTULÍNICA, ETC DURANTE EL EMBARAZO O LACTANCIA, CUALQUIER MANEJO DE COMPLICACIONES PUEDE AFECTAR LA SALUD DE TU BEBÉ Y LA TUYA. ' +
          'AL CONTINUAR ACEPTAS QUE TODAS TUS DUDAS SON DE CARÁCTER INFORMATIVO / EDUCATIVO / INVESTIGATIVO Y QUE NO TIENES INTENCIÓN DE REALIZARTE PROCEDIMIENTOS SINO HASTA EL TÉRMINO DE TU LACTANCIA Y CON CONSENTIMIENTO DE TU MÉDICO.',
      });
    }

    setMessages(initialMessages);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, messages.length]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || isSending) return;

    let storedProfile: StoredProfile | null = null;
    try {
      if (typeof window !== 'undefined') {
        const raw = window.localStorage.getItem('drbeautybot_profile');
        if (raw) storedProfile = JSON.parse(raw) as StoredProfile;
      }
    } catch (error) {
      console.error('No se pudo leer el perfil guardado:', error);
    }

    const effectiveProfile = mode === 'quick' ? null : storedProfile;
    const userId = Date.now();

    setMessages((prev) => [...prev, { id: userId, sender: 'user', text: trimmed }]);
    setInput('');
    setIsSending(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: trimmed,
          mode,
          profile: effectiveProfile,
          sessionId: sessionId ?? null,
        }),
      });

      const data = (await res.json()) as { reply?: string };

      setMessages((prev) => [
        ...prev,
        {
          id: userId + 1,
          sender: 'bot',
          text:
            data?.reply ??
            'He recibido tu mensaje, pero hubo un problema al generar una respuesta. Intenta de nuevo en unos minutos.',
        },
      ]);
    } catch (error) {
      console.error('Error al llamar a /api/chat:', error);
      setMessages((prev) => [
        ...prev,
        {
          id: userId + 1,
          sender: 'bot',
          text:
            'Ha ocurrido un problema al procesar tu mensaje. Revisa tu conexión y vuelve a intentarlo, por favor.',
        },
      ]);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <main
      className="min-h-screen flex flex-col items-center justify-center px-4 py-6 chat-bg-animated"
      style={{
        backgroundColor: '#FEF9E7',
        backgroundImage: `url(${CHAT_BG_URL})`,
        backgroundRepeat: 'repeat',
        backgroundSize: '420px auto',
      }}
    >
      {/* ✅ Parallax/scroll infinito suave del tapiz (mejor que backgroundAttachment en mobile) */}
      <style>{`
        @keyframes chatBgScroll {
          from {
            background-position: 0 0;
          }
          to {
            background-position: -420px -420px;
          }
        }
        .chat-bg-animated {
          animation: chatBgScroll 140s linear infinite;
        }
        @media (max-width: 640px) {
          .chat-bg-animated {
            animation-duration: 180s;
          }
        }
      `}</style>

      {/* ✅ Botón en DESKTOP (arriba derecha como antes) */}
      <header className="hidden sm:flex w-full max-w-3xl mb-4 items-center justify-end">
        <button
          type="button"
          onClick={startNewConversation}
          className="px-5 py-2 rounded-full bg-[#FCCD78] hover:bg-[#FAD28C] text-[0.85rem] font-semibold text-slate-900 shadow-md border border-[#F4C56F]/80 transition"
          title="Genera un nuevo sessionId y reinicia el chat"
        >
          Nueva conversación
        </button>
      </header>

      {/* ✅ Wrapper relative para overlays (logo + botón mobile floating) */}
      <div className="relative w-full max-w-3xl">
        {/* ✅ Logo flotando POR FUERA de la tarjeta (overlay) */}
        <img
          src={CHAT_LOGO_URL}
          alt="Dr. BeautyBot"
          draggable={false}
          className="
            pointer-events-none select-none
            absolute left-1/2 -translate-x-1/2
            -top-20 md:-top-28
            h-[120px] md:h-[170px] w-auto object-contain
            drop-shadow-[0_18px_34px_rgba(0,0,0,0.35)]
            z-30
          "
        />

        {/* ✅ Botón en MOBILE: abajo-derecha, fuera de la tarjeta (no choca con el logo) */}
        <button
          type="button"
          onClick={startNewConversation}
          className="
            sm:hidden
            fixed right-4 bottom-5
            px-5 py-2 rounded-full bg-[#FCCD78] active:bg-[#FAD28C]
            text-[0.85rem] font-semibold text-slate-900
            shadow-[0_18px_40px_rgba(0,0,0,0.30)]
            border border-[#F4C56F]/80 transition
            z-50
          "
          title="Genera un nuevo sessionId y reinicia el chat"
        >
          Nueva conversación
        </button>

        {/* ✅ Tarjeta de chat (con mt para reservar espacio externo al logo) */}
        <section className="mt-12 md:mt-16 w-full h-[74vh] rounded-[32px] bg-[#FDF7EC] shadow-[0_18px_40px_rgba(0,0,0,0.35)] overflow-hidden border border-black/5 flex flex-col">
          {/* Encabezado del chat */}
          <div className="flex items-center gap-3 bg-[#B6EBCF] px-5 py-3">
            <div className="h-11 w-11 rounded-full bg-white flex items-center justify-center shadow-inner overflow-hidden">
              <img
                src={BOT_AVATAR_URL}
                alt="Avatar Dr. BeautyBot"
                className="h-full w-full object-cover"
                draggable={false}
              />
            </div>

            <div className="flex flex-col">
              <span className="font-semibold text-slate-900 text-sm">Dr. BeautyBot</span>
              <span className="text-xs text-emerald-700 flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                {isSending ? 'Escribiendo…' : 'En línea'}
              </span>
            </div>
          </div>

          {/* Zona de mensajes */}
          <div className="flex-1 min-h-0 bg-[#FBEEDC] px-4 py-4 md:px-6 md:py-5 overflow-y-auto">
            <div className="space-y-3 pr-1">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={
                      msg.sender === 'user'
                        ? 'rounded-3xl bg-[#B6EBCF] px-4 py-3 text-sm md:text-[15px] text-slate-900 max-w-[80%] shadow-md rounded-br-md'
                        : 'rounded-3xl bg-white px-0 py-0 text-sm md:text-[15px] text-slate-900 max-w-[80%] shadow-md rounded-bl-md overflow-hidden'
                    }
                  >
                    {mode === 'quick' && msg.sender === 'bot' && (
                      <div className="bg-yellow-300 text-black text-[0.72rem] font-semibold px-3 py-1 border-b border-yellow-400">
                        {QUICK_DISCLAIMER}
                      </div>
                    )}

                    <div className="px-3 py-2 text-[0.9rem] leading-relaxed whitespace-pre-line">
                      {msg.text}
                    </div>
                  </div>
                </div>
              ))}

              {messages.length === 0 && (
                <p className="text-sm text-slate-500 text-center mt-4">
                  Cargando conversación con DrBeautyBot…
                </p>
              )}

              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Barra de entrada */}
          <form
            onSubmit={handleSubmit}
            className="flex items-center gap-3 border-t border-black/5 bg-[#FDF7EC] px-4 py-3 md:px-5 md:py-4"
          >
            <div className="flex-1">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Escribe un mensaje…"
                disabled={isSending}
                className="w-full rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm md:text-[15px] text-slate-900 placeholder:text-slate-400 shadow-inner outline-none focus:border-[#9BD4F5] focus:ring-2 focus:ring-[#9BD4F5]/40"
              />
            </div>

            <button
              type="submit"
              disabled={isSending || !input.trim()}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[#FCCD78] text-xl shadow-md disabled:opacity-60 disabled:cursor-not-allowed"
              aria-label="Enviar"
            >
              ➤
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}

export default function ChatPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen flex items-center justify-center px-4 py-6">
          <p className="text-sm text-slate-700">Cargando chat…</p>
        </main>
      }
    >
      <ChatPageInner />
    </Suspense>
  );
}
