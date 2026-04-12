'use client';

/**
 * CHANGELOG app/chat/page.tsx
 * - 2026-03-25 v2.0.3: Eliminado botón flotante. Avatar header 52px.
 * - 2026-03-26 v2.1: Dark mode, compartir respuestas, tarjeta visual.
 * - 2026-04-05 v2.2: Header disclaimer con botón X. Typewriter effect.
 * - 2026-04-10 v2.3:
 *   - Header compacto para viewport estrecho (marco Android en desktop):
 *     · Avatar reducido de 52px a 40px
 *     · Gap y padding más compactos
 *     · Badge "modo personalizado" en línea con el estado (una sola fila)
 *     · Botón "Nueva" solo con ícono en viewports muy estrechos
 */

import { Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { FormEvent, useCallback, useEffect, useRef, useState } from 'react';

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
  botoxZones?: string[];
  fillerMaterials?: string[];
  fillerZones?: string[];
  healthConditions?: string[];
  healthOther?: string;
  isPregnant?: boolean;
  procedureDates?: Record<string, { month: string; year: string }>;
}

const areaLabels: Record<string, string> = {
  'rostro-general': 'rostro en general',
  toxina:           'toxina botulínica',
  rellenos:         'fillers / rellenos',
  labios:           'labios',
  laser:            'láser / manchas / depilación',
  'cicatrices-acne':'cicatrices de acné',
  otros:            'otros tratamientos estéticos',
};

const SESSION_KEY   = 'drbeautybot_chat_session_id';
const PROFILE_KEY   = 'drbeautybot_profile';
const HISTORY_KEY   = 'drb_chat_history';
const BOT_AVATAR    = '/images/DON-REDONDON.png';
const DISCLAIMER    = 'La información proporcionada es orientativa y no sustituye una consulta médica profesional. Ante cualquier duda, consulta a tu médico.';
const TYPEWRITER_MS    = 18;
const TYPEWRITER_CHARS = 3;

function generateSessionId(): string {
  if (typeof crypto !== 'undefined' && crypto?.randomUUID) return crypto.randomUUID();
  return 'sess_' + Date.now() + '_' + Math.random().toString(16).slice(2);
}

function saveToHistory(sessionId: string, firstMessage: string) {
  try {
    const raw     = localStorage.getItem(HISTORY_KEY);
    const history = raw ? (JSON.parse(raw) as { id: string; title: string; meta: string }[]) : [];
    if (history.find((h) => h.id === sessionId)) return;
    const title = firstMessage.length > 48 ? firstMessage.slice(0, 45) + '…' : firstMessage;
    history.unshift({ id: sessionId, title, meta: 'Ahora mismo' });
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, 10)));
  } catch { /* ignore */ }
}

function ChatPageInner() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const mode         = searchParams.get('mode');
  const topicParam   = searchParams.get('topic');

  const [messages,       setMessages]       = useState<ChatMessage[]>([]);
  const [input,          setInput]          = useState('');
  const [isSending,      setIsSending]      = useState(false);
  const [sessionId,      setSessionId]      = useState<string | null>(null);
  const [hasProfile,     setHasProfile]     = useState(false);
  const [showSuggest,    setShowSuggest]    = useState(false);
  const [firstSaved,     setFirstSaved]     = useState(false);
  const [showDisclaimer, setShowDisclaimer] = useState(true);
  const messagesScrollRef = useRef<HTMLDivElement | null>(null);
  const formRef = useRef<HTMLFormElement | null>(null);

  const [copiedId,  setCopiedId]  = useState<number | null>(null);
  const [shareMsg,  setShareMsg]  = useState<ChatMessage | null>(null);
  const shareCardRef = useRef<HTMLDivElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    try {
      const ex = sessionStorage.getItem(SESSION_KEY);
      if (ex) setSessionId(ex);
      else {
        const id = generateSessionId();
        sessionStorage.setItem(SESSION_KEY, id);
        setSessionId(id);
      }
    } catch { setSessionId(generateSessionId()); }
    try { setHasProfile(!!localStorage.getItem(PROFILE_KEY)); } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages]);



  useEffect(() => {
    if (messages.length > 0) return;
    let profile: StoredProfile | null = null;
    try { const r = localStorage.getItem(PROFILE_KEY); if (r) profile = JSON.parse(r); } catch { /* ignore */ }

    let greeting: string;
    if (mode === 'quick' || !profile) {
      greeting = 'Hola 💬 Esta es una consulta rápida. Si quieres orientación más personalizada, completa tu perfil desde el menú principal.\n\nℹ️ ' + DISCLAIMER;
    } else {
      const name    = profile.name ? 'Hola, ' + profile.name + '. ' : 'Hola. ';
      const area    = areaLabels[profile.area ?? ''] ?? '';
      const areaTxt = area ? 'He visto que te interesa ' + area + '. ' : '';
      greeting = name + areaTxt + 'Te iré dando información orientativa — cuéntame en qué puedo ayudarte.\n\nℹ️ ' + DISCLAIMER;
    }

    const now  = Date.now();
    const init: ChatMessage[] = [{ id: now, sender: 'bot', text: greeting }];
    if (profile?.isPregnant && mode !== 'quick') {
      init.push({ id: now + 1, sender: 'bot', text: '⚠️ NO ES RECOMENDABLE REALIZARSE PROCEDIMIENTOS COMO RELLENOS, TOXINA BOTULÍNICA, ETC. DURANTE EL EMBARAZO O LACTANCIA. Al continuar aceptas que tus dudas son de carácter informativo.' });
    }
    setMessages(init);
    if (topicParam) {
      setTimeout(() => sendMessage('Quiero información sobre ' + topicParam, profile, now + 10), 600);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, topicParam]);

  const startNew = () => {
    try {
      const id = generateSessionId();
      sessionStorage.setItem(SESSION_KEY, id);
      setSessionId(id);
    } catch { /* ignore */ }
    setMessages([]); setInput(''); setIsSending(false); setShowSuggest(false); setFirstSaved(false);
  };

  const typewriterEmit = async (
    delta: string,
    getAccumulated: () => string,
    setAccumulated: (s: string) => void,
    botId: number,
  ) => {
    let local = getAccumulated();
    let i = 0;
    while (i < delta.length) {
      const chars = delta.slice(i, i + TYPEWRITER_CHARS);
      local += chars;
      i += TYPEWRITER_CHARS;
      setAccumulated(local);
      setMessages((prev) => prev.map((m) => m.id === botId ? { ...m, text: local } : m));
      if (i < delta.length) {
        await new Promise<void>((resolve) => setTimeout(resolve, TYPEWRITER_MS));
      }
    }
  };

  const sendMessage = async (text: string, profile: StoredProfile | null, baseId: number) => {
    setMessages((prev) => [...prev, { id: baseId, sender: 'user', text }]);
    setIsSending(true);
    if (!firstSaved && sessionId) { saveToHistory(sessionId, text); setFirstSaved(true); }

    const history = messages
      .filter((_, i) => i > 0 || messages[0]?.sender !== 'bot')
      .slice(-8)
      .map((m) => ({ role: m.sender === 'user' ? 'user' : 'assistant', text: m.text }));

    let uid: string | null = null;
    try {
      const { getAnonymousUid } = await import('@/lib/firebase');
      uid = await getAnonymousUid();
    } catch { /* offline */ }

    const botId = baseId + 1;
    setMessages((prev) => [...prev, { id: botId, sender: 'bot', text: '' }]);

    let accumulated = '';
    const getAcc = () => accumulated;
    const setAcc = (s: string) => { accumulated = s; };

    try {
      const res = await fetch((process.env.NEXT_PUBLIC_API_URL ?? '') + '/api/chat', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text, history, uid, mode,
          profile: mode === 'quick' ? null : profile, sessionId,
        }),
      });

      const contentType = res.headers.get('content-type') ?? '';

      if (contentType.includes('text/event-stream')) {
        const reader = res.body!.getReader();
        const decoder = new TextDecoder();
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value);
          const lines = chunk.split('\n').filter((l) => l.startsWith('data: '));
          for (const line of lines) {
            const payload = line.slice(6);
            if (payload === '[DONE]') break;
            try {
              const { text: delta } = JSON.parse(payload);
              if (delta) await typewriterEmit(delta, getAcc, setAcc, botId);
            } catch { /* ignore */ }
          }
        }
      } else {
        const data = (await res.json()) as { reply?: string };
        const reply = data?.reply ?? 'Hubo un problema. Intenta de nuevo.';
        await typewriterEmit(reply, getAcc, setAcc, botId);
      }

      const botCount = messages.filter((m) => m.sender === 'bot').length;
      if (!hasProfile && botCount >= 1) setShowSuggest(true);

    } catch {
      setMessages((prev) =>
        prev.map((m) => m.id === botId
          ? { ...m, text: 'Ha ocurrido un problema. Revisa tu conexión e intenta de nuevo.' }
          : m
        )
      );
    } finally { setIsSending(false); }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || isSending) return;
    let profile: StoredProfile | null = null;
    try { const r = localStorage.getItem(PROFILE_KEY); if (r) profile = JSON.parse(r); } catch { /* ignore */ }
    setInput('');
    await sendMessage(trimmed, profile, Date.now());
  };

  const isPersonalized = hasProfile && mode !== 'quick';

  const copyText = useCallback(async (msg: ChatMessage) => {
    try {
      await navigator.clipboard.writeText(msg.text);
      setCopiedId(msg.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch { /* ignore */ }
  }, []);

  const shareNative = useCallback(async (msg: ChatMessage) => {
    const shareData = {
      title: 'Dr. BeautyBot — Medicina Estética',
      text: '💬 "Mira la respuesta que me dio mi Dr. BeautyBot"\n\n' + msg.text + '\n\n💜 Información orientativa, no diagnóstico médico.\n📸 @drbeautybot · drbeautybot.app\n🤖 Disponible en Google Play',
    };
    try {
      if (navigator.share && navigator.canShare?.(shareData)) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(shareData.text);
        setCopiedId(msg.id);
        setTimeout(() => setCopiedId(null), 2000);
      }
    } catch { /* usuario canceló */ }
  }, []);

  return (
    <div className="drb-home-bg" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>

      {/* ── HEADER DESKTOP (solo fuera del marco Android) ── */}
      <header className="hidden sm:flex" style={{
        padding: '12px 16px', justifyContent: 'space-between', alignItems: 'center',
        maxWidth: '768px', width: '100%', margin: '0 auto',
      }}>
        <button onClick={() => router.push('/')} style={{
          padding: '8px 16px', borderRadius: '999px',
          background: 'var(--drb-surface-card)', border: '1px solid var(--drb-border-soft)',
          fontSize: '14px', fontWeight: 500, color: 'var(--drb-text-secondary)', cursor: 'pointer',
        }}>‹ Inicio</button>
        <button onClick={startNew} style={{
          padding: '8px 20px', borderRadius: '999px',
          background: 'var(--drb-surface-card)', border: '1px solid var(--drb-border-soft)',
          fontSize: '14px', fontWeight: 600, color: 'var(--drb-text-secondary)', cursor: 'pointer',
        }}>Nueva conversación</button>
      </header>

      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        width: '100%', maxWidth: '768px', margin: '0 auto', minHeight: 0,
      }} className="sm:px-3 sm:pb-3 sm:pt-1">

        <div style={{
          flex: 1, display: 'flex', flexDirection: 'column',
          background: 'white', overflow: 'hidden', minHeight: 0,
          position: 'relative',
        }} className="sm:rounded-[28px] sm:shadow-[0_18px_48px_rgba(130,80,200,0.18)] sm:border sm:border-[rgba(180,140,220,0.2)]">

          {/* ── HEADER DEL CHAT v2.3 — compacto ── */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            padding: '8px 12px',
            background: 'var(--drb-surface-strong)',
            borderBottom: '1px solid var(--drb-border-soft)',
            flexShrink: 0,
            minHeight: 0,
          }}>
            {/* Botón atrás — solo mobile nativo */}
            <button onClick={() => router.push('/')} className="sm:hidden" style={{
              fontSize: '20px', color: 'var(--drb-text-muted)', background: 'none',
              border: 'none', cursor: 'pointer', lineHeight: 1, flexShrink: 0,
              padding: '0 2px',
            }}>‹</button>

            {/* Avatar — reducido a 40px */}
            <div style={{
              width: '40px', height: '40px', borderRadius: '50%',
              overflow: 'hidden', flexShrink: 0,
              border: '2px solid rgba(180,140,220,0.35)',
              background: '#e8f5ee',
              boxShadow: '0 2px 8px rgba(130,80,200,0.12)',
            }}>
              <img
                src={BOT_AVATAR} alt="Dr. BeautyBot" draggable={false}
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              />
            </div>

            {/* Nombre + estado + badge en columna compacta */}
            <div style={{ flex: 1, minWidth: 0 }}>
              {/* Fila 1: nombre + badge */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'nowrap' }}>
                <p style={{
                  fontSize: '13px', fontWeight: 600,
                  color: 'var(--drb-text-primary)', margin: 0,
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                }}>Dr. BeautyBot</p>
                <span style={{
                  fontSize: '9px', fontWeight: 500, padding: '2px 7px',
                  borderRadius: '999px', flexShrink: 0, whiteSpace: 'nowrap',
                  background: isPersonalized ? 'rgba(183,148,244,0.2)' : 'rgba(183,148,244,0.12)',
                  color: isPersonalized ? 'var(--drb-text-secondary)' : 'var(--drb-text-muted)',
                }}>{isPersonalized ? 'personalizado' : 'rápido'}</span>
              </div>
              {/* Fila 2: estado */}
              <p style={{
                fontSize: '11px', color: '#48bb78', fontWeight: 500, margin: 0,
                display: 'flex', alignItems: 'center', gap: '4px',
              }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#68d391', display: 'inline-block', flexShrink: 0 }} />
                {isSending ? 'Escribiendo…' : 'En línea'}
              </p>
            </div>

            {/* Botón nueva — icono + texto corto */}
            <button onClick={startNew} style={{
              padding: '5px 10px', borderRadius: '999px', flexShrink: 0,
              background: 'rgba(183,148,244,0.12)', color: 'var(--drb-text-muted)',
              fontSize: '11px', fontWeight: 600, border: 'none', cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}>+ Nueva</button>
          </div>

          {/* ── DISCLAIMER con X ── */}
          {showDisclaimer && (
            <div style={{
              display: 'flex', alignItems: 'flex-start', gap: '8px',
              padding: '7px 12px',
              background: 'var(--drb-surface-strong)',
              borderBottom: '1px solid var(--drb-border-soft)',
              flexShrink: 0,
            }}>
              <span style={{ fontSize: '12px', flexShrink: 0, marginTop: '1px' }}>ℹ️</span>
              <p style={{ flex: 1, fontSize: '11px', color: 'var(--drb-text-secondary)', lineHeight: 1.45, margin: 0 }}>
                {DISCLAIMER}
              </p>
              <button
                onClick={() => setShowDisclaimer(false)}
                aria-label="Cerrar aviso"
                style={{
                  flexShrink: 0, background: 'none', border: 'none', cursor: 'pointer',
                  fontSize: '16px', color: 'var(--drb-text-muted)', lineHeight: 1,
                  padding: '0 0 0 4px',
                }}
              >×</button>
            </div>
          )}

          {/* ── ZONA DE MENSAJES ── */}
          <div
            ref={messagesScrollRef}
            className="drb-scroll-hide"
            style={{
              flex: 1, overflowY: 'auto', padding: '12px', minHeight: 0,
              backgroundImage: 'url(/images/IMG_7139.JPG)',
              backgroundRepeat: 'repeat',
              backgroundSize: '380px auto',
              animation: 'drb-tapiz-scroll 140s linear infinite',
              backgroundColor: '#f0e6ff',
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>

              {messages.map((msg) => (
                <div key={msg.id} style={{
                  display: 'flex', flexDirection: 'column',
                  alignItems: msg.sender === 'user' ? 'flex-end' : 'flex-start',
                  gap: '4px',
                }}>
                  <div style={{
                    maxWidth: '80%', padding: '9px 13px',
                    fontSize: '13px', lineHeight: 1.55, whiteSpace: 'pre-line',
                    borderRadius: msg.sender === 'user' ? '18px 18px 4px 18px' : '4px 18px 18px 18px',
                    background: msg.sender === 'user' ? 'var(--drb-gradient-bubble)' : 'var(--drb-bubble-bot-bg)',
                    border: msg.sender === 'bot' ? '0.5px solid var(--drb-bubble-bot-border)' : 'none',
                    color: 'var(--drb-text-primary)',
                    boxShadow: '0 1px 4px rgba(130,80,200,0.1)',
                  }}>
                    {msg.text}
                    {isSending && msg.sender === 'bot' && msg === messages[messages.length - 1] && msg.text.length > 0 && (
                      <span style={{
                        display: 'inline-block', width: '2px', height: '13px',
                        background: '#b794f4', marginLeft: '2px', verticalAlign: 'middle',
                        animation: 'drb-pulse 0.8s ease-in-out infinite',
                      }} />
                    )}
                  </div>

                  {msg.sender === 'bot' && !isSending && (
                    <div style={{ display: 'flex', gap: '5px', paddingLeft: '4px' }}>
                      <button onClick={() => copyText(msg)} style={{
                        display: 'flex', alignItems: 'center', gap: '3px',
                        padding: '3px 8px', borderRadius: '999px',
                        fontSize: '10px', fontWeight: 500, cursor: 'pointer',
                        background: copiedId === msg.id ? 'rgba(72,187,120,0.15)' : 'var(--drb-surface-card)',
                        border: copiedId === msg.id ? '1px solid rgba(72,187,120,0.3)' : '1px solid var(--drb-border-soft)',
                        color: copiedId === msg.id ? '#38a169' : 'var(--drb-text-muted)',
                        transition: 'all 0.2s',
                      }}>{copiedId === msg.id ? '✓ Copiado' : '📋 Copiar'}</button>
                      <button onClick={() => setShareMsg(msg)} style={{
                        display: 'flex', alignItems: 'center', gap: '3px',
                        padding: '3px 8px', borderRadius: '999px',
                        fontSize: '10px', fontWeight: 500, cursor: 'pointer',
                        background: 'var(--drb-surface-card)',
                        border: '1px solid var(--drb-border-soft)',
                        color: 'var(--drb-text-muted)',
                      }}>📤 Compartir</button>
                    </div>
                  )}
                </div>
              ))}

              {/* Typing indicator */}
              {isSending && (() => {
                const lastMsg = messages[messages.length - 1];
                if (lastMsg?.sender === 'bot' && lastMsg.text.length > 0) return null;
                return (
                  <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                    <div style={{
                      padding: '10px 16px', borderRadius: '4px 18px 18px 18px',
                      background: 'var(--drb-bubble-bot-bg)', border: '0.5px solid var(--drb-bubble-bot-border)',
                      display: 'flex', gap: '5px', alignItems: 'center',
                    }}>
                      {[0, 150, 300].map((delay) => (
                        <span key={delay} className="animate-bounce" style={{
                          width: '7px', height: '7px', borderRadius: '50%',
                          background: '#b794f4', animationDelay: delay + 'ms', display: 'inline-block',
                        }} />
                      ))}
                    </div>
                  </div>
                );
              })()}

              {/* Sugerencia perfil */}
              {showSuggest && !hasProfile && (
                <div style={{
                  alignSelf: 'center', textAlign: 'center',
                  padding: '14px 18px', borderRadius: '18px', maxWidth: '260px',
                  background: 'var(--drb-surface-card)', border: '0.5px solid var(--drb-border)',
                  marginTop: '6px', boxShadow: '0 4px 16px rgba(130,80,200,0.1)',
                }}>
                  <p style={{ fontSize: '12px', color: 'var(--drb-text-secondary)', lineHeight: 1.5, margin: '0 0 10px' }}>
                    ¿Quieres que recuerde tus datos para respuestas más precisas?
                  </p>
                  <button onClick={() => router.push('/profile')} style={{
                    padding: '7px 18px', borderRadius: '999px',
                    background: 'linear-gradient(135deg, #b794f4, #ed64a6)',
                    color: 'white', fontSize: '12px', fontWeight: 600,
                    border: 'none', cursor: 'pointer',
                    boxShadow: '0 4px 14px rgba(183,148,244,0.4)',
                  }}>✨ Completar Mis Datos</button>
                </div>
              )}

              {/* ── HINT ESCRITURA — sticky en desktop, invisible en mobile ── */}
              <div style={{
                position: 'sticky',
                bottom: '8px',
                display: 'flex',
                justifyContent: 'center',
                zIndex: 10,
                pointerEvents: 'none',
              }}>
                <div
                  onClick={(e) => {
                    e.stopPropagation();
                    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
                  }}
                  style={{
                    display: 'none', // override via media query in globals o inline below
                    cursor: 'pointer',
                    pointerEvents: 'auto',
                    alignItems: 'center', gap: '6px',
                    padding: '6px 14px', borderRadius: '999px',
                    background: 'linear-gradient(135deg, rgba(183,148,244,0.95), rgba(237,100,166,0.95))',
                    color: 'white', fontSize: '11px', fontWeight: 600,
                    boxShadow: '0 4px 16px rgba(183,148,244,0.5)',
                    whiteSpace: 'nowrap',
                    border: '1px solid rgba(255,255,255,0.25)',
                    animation: 'drb-pulse 2.5s ease-in-out infinite',
                  }}
                  className="drb-write-hint"
                >
                  ✏️ Escribe tu pregunta abajo ↓
                </div>
              </div>

              <div ref={messagesEndRef} />
            </div>
          </div>



          {/* ── BARRA DE ENTRADA ── */}
          <form ref={formRef} onSubmit={handleSubmit} style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            padding: '10px 12px',
            background: 'var(--drb-surface-strong)',
            borderTop: '1px solid var(--drb-border-soft)',
            flexShrink: 0,
          }}>
            <input
              type="text" value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Escribe un mensaje…"
              disabled={isSending}
              className="drb-input"
              style={{
                flex: 1, padding: '9px 14px', borderRadius: '999px',
                border: '1px solid rgba(180,140,220,0.35)',
                background: 'var(--drb-input-bg)',
                fontSize: '13px', color: 'var(--drb-text-primary)', outline: 'none',
              }}
            />
            <button type="submit" disabled={isSending || !input.trim()} aria-label="Enviar" style={{
              width: '38px', height: '38px', borderRadius: '50%', flexShrink: 0,
              background: 'linear-gradient(135deg, #b794f4, #ed64a6)',
              color: 'white', fontSize: '13px', border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(183,148,244,0.4)',
              opacity: (isSending || !input.trim()) ? 0.5 : 1,
            }}>➤</button>
          </form>

        </div>
      </div>

      {/* ── MODAL COMPARTIR ── */}
      {shareMsg && (
        <div
          onClick={() => setShareMsg(null)}
          style={{
            position: 'fixed', inset: 0, zIndex: 500,
            background: 'rgba(15,5,30,0.82)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '24px 16px',
          }}
        >
          <div onClick={(e) => e.stopPropagation()} style={{
            width: '100%', maxWidth: '340px',
            animation: 'drb-fade-up 0.3s ease both',
            display: 'flex', flexDirection: 'column', gap: '12px',
          }}>
            <div ref={shareCardRef} style={{
              borderRadius: '24px', overflow: 'hidden',
              background: 'linear-gradient(135deg, #f0e6ff, #fce4f0, #e8f0ff)',
              boxShadow: '0 12px 40px rgba(130,80,200,0.3)',
            }}>
              <div style={{
                background: 'linear-gradient(135deg, #b794f4, #ed64a6)',
                padding: '14px 18px', display: 'flex', alignItems: 'center', gap: '10px',
              }}>
                <div style={{
                  width: '36px', height: '36px', borderRadius: '50%',
                  overflow: 'hidden', border: '2px solid rgba(255,255,255,0.4)',
                  background: '#e8f5ee', flexShrink: 0,
                }}>
                  <img src={BOT_AVATAR} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
                <div>
                  <p style={{ fontSize: '13px', fontWeight: 700, color: 'white', margin: 0 }}>Dr. BeautyBot</p>
                  <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.8)', margin: 0 }}>drbeautybot.app · Medicina Estética</p>
                </div>
              </div>
              <div style={{ padding: '12px 18px 0', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '13px' }}>💬</span>
                <p style={{ fontSize: '12px', fontWeight: 600, color: '#8b6fa8', margin: 0, fontStyle: 'italic' }}>
                  "Mira la respuesta que me dio mi Dr. BeautyBot"
                </p>
              </div>
              <div style={{ padding: '12px 18px 14px' }}>
                <p style={{
                  fontSize: '14px', lineHeight: 1.6, color: '#2d1a4a',
                  margin: '0 0 14px', whiteSpace: 'pre-line',
                  display: '-webkit-box', WebkitLineClamp: 7,
                  WebkitBoxOrient: 'vertical', overflow: 'hidden',
                }}>{shareMsg.text}</p>
                <div style={{ paddingTop: '12px', borderTop: '1px solid rgba(183,148,244,0.2)', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <p style={{ fontSize: '10.5px', color: '#9b82b8', margin: 0 }}>💜 Información orientativa, no diagnóstico médico.</p>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '11px', color: '#b794f4', fontWeight: 600 }}>📸 @drbeautybot</span>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
                      <span style={{ fontSize: '11px', fontWeight: 700, color: '#b794f4' }}>drbeautybot.app</span>
                      <span style={{ fontSize: '9.5px', color: '#9b82b8' }}>🤖 Disponible en Google Play</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => copyText(shareMsg)} style={{
                flex: 1, padding: '12px', borderRadius: '999px',
                background: copiedId === shareMsg.id ? 'rgba(72,187,120,0.15)' : 'rgba(255,255,255,0.12)',
                border: copiedId === shareMsg.id ? '1px solid rgba(72,187,120,0.3)' : '1px solid rgba(255,255,255,0.2)',
                color: copiedId === shareMsg.id ? '#68d391' : 'white',
                fontSize: '13px', fontWeight: 500, cursor: 'pointer', transition: 'all 0.2s',
              }}>{copiedId === shareMsg.id ? '✓ ¡Copiado!' : '📋 Copiar texto'}</button>
              <button onClick={() => shareNative(shareMsg)} style={{
                flex: 1, padding: '12px', borderRadius: '999px',
                background: 'linear-gradient(135deg, #b794f4, #ed64a6)',
                border: 'none', color: 'white',
                fontSize: '13px', fontWeight: 600, cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(183,148,244,0.45)',
              }}>📤 Compartir</button>
            </div>
            <button onClick={() => setShareMsg(null)} style={{
              padding: '10px', borderRadius: '999px',
              background: 'transparent', border: '1px solid rgba(255,255,255,0.15)',
              color: 'rgba(255,255,255,0.6)', fontSize: '13px', cursor: 'pointer',
            }}>Cancelar</button>
          </div>
        </div>
      )}

    </div>
  );
}

export default function ChatPage() {
  return (
    <Suspense fallback={
      <div className="drb-home-bg" style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: 'var(--drb-text-secondary)', fontSize: '14px' }}>Cargando chat…</p>
      </div>
    }>
      <ChatPageInner />
    </Suspense>
  );
}