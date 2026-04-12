'use client';

/**
 * CHANGELOG app/page.tsx
 * - 2026-03-25 v2.0: Rediseño completo — paleta lavanda/rosa.
 * - 2026-03-26 v2.1: Dark mode toggle + onboarding + redes sociales + búsqueda historial.
 * - 2026-03-28 v2.1.1:
 *   - Carousel: active state dinámico via usePathname (no hardcodeado).
 *   - Hot Topics pills: gradiente solo al hacer tap (activeTopicId).
 *   - Select dark mode: manejado via globals.css (color-scheme: dark).
 */

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import Onboarding, { useOnboarding } from '@/components/Onboarding';

// ── TIPOS ─────────────────────────────────────────────────────
interface RecentChat { id: string; title: string; meta: string; }

// ── CONSTANTES ────────────────────────────────────────────────
// Sin 'active' hardcodeado — se calcula dinámicamente con usePathname
const CAROUSEL_ITEMS = [
  { icon: '🗂️', label: 'Mis Datos',   href: '/profile'    },
  { icon: '📔', label: 'Mi Diario',   href: '/diario'     },
  { icon: '⚖️', label: 'Comparador',  href: '/comparador' },
  { icon: '✅', label: 'Mi Cita',     href: '/cita'       },
  { icon: '🚩', label: 'Precios',     href: '/precios'    },
  { icon: '❓', label: 'FAQ',          href: '/faq'        },
  { icon: '💌', label: 'Contacto',    href: '/contact'    },
];

const HOT_TOPICS = [
  { emoji: '🔥', label: 'Botox'             },
  { emoji: '💉', label: 'Ácido hialurónico' },
  { emoji: '👄', label: 'Labios'            },
  { emoji: '✨', label: 'Rellenos'          },
  { emoji: '🌿', label: 'Bioestimulación'   },
  { emoji: '🔬', label: 'Hilos tensores'    },
  { emoji: '☀️', label: 'Manchas / láser'   },
  { emoji: '💆', label: 'Cicatrices de acné'},
];

const PROFILE_KEY = 'drbeautybot_profile';
const HISTORY_KEY = 'drb_chat_history';
const THEME_KEY   = 'drb_theme';

// ── COMPONENTE ────────────────────────────────────────────────
export default function HomePage() {
  const router   = useRouter();
  const pathname = usePathname(); // para carousel dinámico

  // Dark mode
  const [isDark, setIsDark] = useState(false);

  // Onboarding
  const { show: showOnboarding, dismiss: dismissOnboarding } = useOnboarding();

  // Datos
  const [hasProfile,   setHasProfile]   = useState<boolean | null>(null);
  const [recentChats,  setRecentChats]  = useState<RecentChat[]>([]);
  const [searchQuery,  setSearchQuery]  = useState('');
  const [showAllChats, setShowAllChats] = useState(false);

  // Feedback tap en Hot Topics — solo activo 600ms tras el tap
  const [activeTopicLabel, setActiveTopicLabel] = useState<string | null>(null);

  const carouselRef = useRef<HTMLDivElement>(null);

  // ── Init ──────────────────────────────────────────────────
  useEffect(() => {
    // Tema guardado
    try {
      const saved = localStorage.getItem(THEME_KEY) ?? 'light';
      const dark  = saved === 'dark';
      setIsDark(dark);
      document.documentElement.setAttribute('data-theme', saved);
    } catch { /* ignore */ }

    // Perfil
    try { setHasProfile(!!localStorage.getItem(PROFILE_KEY)); }
    catch { setHasProfile(false); }

    // Historial
    try {
      const raw = localStorage.getItem(HISTORY_KEY);
      if (raw) setRecentChats(JSON.parse(raw) as RecentChat[]);
    } catch { /* ignore */ }
  }, []);

  // ── Toggle dark mode ──────────────────────────────────────
  const toggleTheme = () => {
    const next = isDark ? 'light' : 'dark';
    setIsDark(!isDark);
    try {
      document.documentElement.setAttribute('data-theme', next);
      localStorage.setItem(THEME_KEY, next);
    } catch { /* ignore */ }
  };

  // ── Iniciar chat ──────────────────────────────────────────
  const startChat = (topic?: string) => {
    if (topic) {
      setActiveTopicLabel(topic);
      setTimeout(() => setActiveTopicLabel(null), 600);
    }
    const mode  = hasProfile ? 'profile' : 'quick';
    const query = topic
      ? `/chat?mode=${mode}&topic=${encodeURIComponent(topic)}`
      : `/chat?mode=${mode}`;
    router.push(query);
  };

  return (
    <>
      {/* ── ONBOARDING — se monta encima de todo ───────────── */}
      {showOnboarding && <Onboarding onDismiss={dismissOnboarding} />}

      {/* ── APP ────────────────────────────────────────────── */}
      <div
        className="drb-home-bg"
        style={{ height: '100dvh', display: 'flex', flexDirection: 'column' }}
      >
        {/* ── ÁREA SCROLLABLE ─────────────────────────────── */}
        <div
          className="flex-1 overflow-y-auto drb-scroll-hide"
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          <div style={{
            width: '100%', maxWidth: '420px', margin: '0 auto',
            padding: '20px 18px 120px',
            display: 'flex', flexDirection: 'column', alignItems: 'center',
          }}>

            {/* ── HEADER: Logo + Toggle ───────────────────── */}
            <div style={{
              width: '100%', display: 'flex',
              alignItems: 'center', marginBottom: '4px',
            }}>
              <img
                src="/images/TIPOGRAFIA-SOLA-doctorbeautybot-logo-rekorte.png"
                alt="Dr. BeautyBot"
                style={{
                  flex: 1, maxWidth: '260px', margin: '0 auto',
                  mixBlendMode: isDark ? 'screen' : 'multiply',
                  filter: isDark
                    ? 'drop-shadow(0 2px 12px rgba(183,148,244,0.4))'
                    : 'drop-shadow(0 4px 20px rgba(100,60,180,0.25))',
                }}
              />
              {/* Toggle dark mode */}
              <button
                onClick={toggleTheme}
                className="drb-theme-toggle"
                aria-label={isDark ? 'Modo claro' : 'Modo oscuro'}
                title={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
                style={{ position: 'absolute', right: '18px' }}
              >
                {isDark ? '☀️' : '🌙'}
              </button>
            </div>

            {/* ── ROBOT ──────────────────────────────────── */}
            <div style={{
              width: '100%', display: 'flex', justifyContent: 'center',
              marginBottom: '28px',
              animation: 'drb-fade-up 0.5s ease both',
            }}>
              <img
                src="/images/monito-rekorte-3-OK.png"
                alt="Dr. BeautyBot robot"
                style={{
                  maxWidth: '280px', width: '100%',
                  filter: 'drop-shadow(0 8px 24px rgba(130,80,200,0.2))',
                }}
              />
            </div>

            {/* ── CARRUSEL ───────────────────────────────── */}
            <div
              ref={carouselRef}
              className="drb-scroll-hide"
              style={{
                width: '100%', display: 'flex', gap: '10px',
                overflowX: 'auto', paddingBottom: '4px', marginBottom: '20px',
              }}
            >
              {CAROUSEL_ITEMS.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.label}
                    href={item.href}
                    className="btn-scale"
                    style={{
                      flexShrink: 0, flexGrow: 1,
                      display: 'flex', flexDirection: 'column',
                      alignItems: 'center', justifyContent: 'center',
                      gap: '8px', minWidth: '76px', padding: '18px 8px 14px',
                      borderRadius: '22px', textDecoration: 'none',
                      background: isActive
                        ? 'linear-gradient(135deg, rgba(183,148,244,0.28), rgba(237,100,166,0.18))'
                        : 'var(--drb-surface-card)',
                      border: isActive
                        ? '1.5px solid rgba(183,148,244,0.45)'
                        : '1px solid var(--drb-border-soft)',
                      boxShadow: '0 2px 12px rgba(130,80,200,0.09)',
                      transition: 'background 0.2s, border-color 0.2s',
                    }}
                  >
                    <span style={{ fontSize: '26px', lineHeight: 1 }}>{item.icon}</span>
                    <span style={{
                      fontSize: '11.5px',
                      fontWeight: isActive ? 600 : 500,
                      color: isActive ? 'var(--drb-accent)' : 'var(--drb-text-primary)',
                      textAlign: 'center', lineHeight: 1.2,
                    }}>
                      {item.label}
                    </span>
                  </Link>
                );
              })}
            </div>

            {/* ── BANNER PERFIL ──────────────────────────── */}
            {hasProfile === false && (
              <Link
                href="/profile"
                className="btn-scale"
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: '14px',
                  padding: '16px 18px', borderRadius: '20px', marginBottom: '24px',
                  background: 'rgba(183,148,244,0.13)',
                  border: '1px solid rgba(183,148,244,0.3)',
                  textDecoration: 'none',
                }}
              >
                <span style={{ fontSize: '26px', flexShrink: 0 }}>✨</span>
                <div>
                  <p style={{ fontSize: '13.5px', color: 'var(--drb-text-secondary)', fontWeight: 500, lineHeight: 1.45, margin: 0 }}>
                    Completa tu perfil para respuestas más personalizadas.
                  </p>
                  <p style={{ fontSize: '12px', color: 'var(--drb-accent)', fontWeight: 600, marginTop: '5px', marginBottom: 0 }}>
                    Completar Mis Datos →
                  </p>
                </div>
              </Link>
            )}

            {/* ── HOT TOPICS ─────────────────────────────── */}
            <div style={{ width: '100%', marginBottom: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--drb-text-muted)', letterSpacing: '0.01em' }}>Hot topics</span>
                <span style={{ fontSize: '12px', color: 'var(--drb-accent)', fontWeight: 500 }}>Ver todos</span>
              </div>
              <div className="drb-scroll-hide" style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
                {HOT_TOPICS.map((t) => {
                  const isTapped = activeTopicLabel === t.label;
                  return (
                    <button
                      key={t.label}
                      onClick={() => startChat(t.label)}
                      className="btn-scale"
                      style={{
                        flexShrink: 0, display: 'flex', alignItems: 'center', gap: '5px',
                        padding: '9px 16px', borderRadius: '999px',
                        fontSize: '13px', fontWeight: 500, whiteSpace: 'nowrap',
                        cursor: 'pointer', border: 'none',
                        /* Gradiente solo durante el tap — nunca permanente */
                        background: isTapped
                          ? 'linear-gradient(135deg, rgba(183,148,244,0.55), rgba(237,100,166,0.4))'
                          : 'var(--drb-surface-card)',
                        outline: isTapped
                          ? '1px solid rgba(183,148,244,0.55)'
                          : '1px solid var(--drb-border-soft)',
                        color: isTapped ? 'var(--drb-accent)' : 'var(--drb-text-secondary)',
                        boxShadow: '0 1px 6px rgba(130,80,200,0.08)',
                        transform: isTapped ? 'scale(0.96)' : 'scale(1)',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <span style={{ fontSize: '14px' }}>{t.emoji}</span>
                      {t.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ── CHATS RECIENTES ────────────────────────── */}
            <div style={{ width: '100%' }}>

              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--drb-text-muted)', letterSpacing: '0.01em' }}>
                  Chats recientes
                </span>
                {recentChats.length > 3 && !searchQuery && (
                  <button
                    onClick={() => setShowAllChats(!showAllChats)}
                    style={{ fontSize: '12px', color: 'var(--drb-accent)', fontWeight: 500, background: 'none', border: 'none', cursor: 'pointer' }}
                  >
                    {showAllChats ? 'Ver menos' : `Ver todos (${recentChats.length})`}
                  </button>
                )}
              </div>

              {/* Buscador — solo visible si hay chats */}
              {recentChats.length > 0 && (
                <div style={{ position: 'relative', marginBottom: '12px' }}>
                  <span style={{
                    position: 'absolute', left: '14px', top: '50%',
                    transform: 'translateY(-50%)',
                    fontSize: '14px', pointerEvents: 'none',
                  }}>🔍</span>
                  <input
                    type="text"
                    placeholder="Buscar en tus consultas…"
                    value={searchQuery}
                    onChange={(e) => { setSearchQuery(e.target.value); setShowAllChats(true); }}
                    className="drb-input"
                    style={{
                      width: '100%', padding: '10px 14px 10px 40px',
                      borderRadius: '14px', fontSize: '13px',
                      border: searchQuery
                        ? '1px solid rgba(183,148,244,0.5)'
                        : '1px solid var(--drb-border-soft)',
                      background: 'var(--drb-input-bg)',
                      color: 'var(--drb-text-primary)',
                      outline: 'none',
                      transition: 'border-color 0.2s',
                    }}
                  />
                  {/* Botón limpiar búsqueda */}
                  {searchQuery && (
                    <button
                      onClick={() => { setSearchQuery(''); setShowAllChats(false); }}
                      style={{
                        position: 'absolute', right: '12px', top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'none', border: 'none', cursor: 'pointer',
                        fontSize: '14px', color: 'var(--drb-text-muted)',
                        lineHeight: 1, padding: '2px',
                      }}
                    >✕</button>
                  )}
                </div>
              )}

              {/* Lista filtrada */}
              {recentChats.length > 0 ? (() => {
                const filtered = searchQuery
                  ? recentChats.filter((c) =>
                      c.title.toLowerCase().includes(searchQuery.toLowerCase())
                    )
                  : showAllChats ? recentChats : recentChats.slice(0, 3);

                if (filtered.length === 0) return (
                  <div style={{
                    padding: '20px 16px', borderRadius: '18px', textAlign: 'center',
                    background: 'var(--drb-surface-card)', border: '1px solid var(--drb-border-soft)',
                  }}>
                    <p style={{ fontSize: '13px', color: 'var(--drb-text-muted)', margin: 0 }}>
                      Sin resultados para "{searchQuery}" 🔍
                    </p>
                    <button
                      onClick={() => setSearchQuery('')}
                      style={{
                        marginTop: '8px', fontSize: '12px', color: 'var(--drb-accent)',
                        background: 'none', border: 'none', cursor: 'pointer', fontWeight: 500,
                      }}
                    >Limpiar búsqueda</button>
                  </div>
                );

                return (
                  <>
                    {filtered.map((chat) => (
                      <button
                        key={chat.id}
                        onClick={() => router.push(`/chat?session=${chat.id}`)}
                        className="btn-scale"
                        style={{
                          width: '100%', display: 'flex', alignItems: 'center', gap: '12px',
                          padding: '13px 16px', borderRadius: '18px', marginBottom: '8px',
                          background: 'var(--drb-surface-card)',
                          border: '1px solid var(--drb-border-soft)',
                          boxShadow: '0 2px 10px rgba(130,80,200,0.07)',
                          cursor: 'pointer', textAlign: 'left', transition: 'background 0.3s',
                        }}
                      >
                        <span style={{
                          width: '9px', height: '9px', borderRadius: '50%',
                          background: 'var(--drb-gradient-cta)', flexShrink: 0,
                        }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          {/* Título con highlight de búsqueda */}
                          <p style={{ fontSize: '13.5px', fontWeight: 500, color: 'var(--drb-text-primary)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {searchQuery ? (
                              (() => {
                                const idx = chat.title.toLowerCase().indexOf(searchQuery.toLowerCase());
                                if (idx === -1) return chat.title;
                                return (
                                  <>
                                    {chat.title.slice(0, idx)}
                                    <mark style={{ background: 'rgba(183,148,244,0.3)', color: 'var(--drb-text-secondary)', borderRadius: '3px', padding: '0 2px' }}>
                                      {chat.title.slice(idx, idx + searchQuery.length)}
                                    </mark>
                                    {chat.title.slice(idx + searchQuery.length)}
                                  </>
                                );
                              })()
                            ) : chat.title}
                          </p>
                          <p style={{ fontSize: '11.5px', color: 'var(--drb-text-muted)', marginTop: '2px', marginBottom: 0 }}>{chat.meta}</p>
                        </div>
                        <span style={{ fontSize: '12px', color: 'var(--drb-border)', flexShrink: 0 }}>›</span>
                      </button>
                    ))}
                    {/* Contador de resultados al buscar */}
                    {searchQuery && (
                      <p style={{ fontSize: '11px', color: 'var(--drb-text-hint)', textAlign: 'center', marginTop: '4px' }}>
                        {filtered.length} resultado{filtered.length !== 1 ? 's' : ''} para "{searchQuery}"
                      </p>
                    )}
                  </>
                );
              })() : (
                <div style={{
                  padding: '22px 16px', borderRadius: '18px', textAlign: 'center',
                  background: 'var(--drb-surface-card)',
                  border: '1px solid var(--drb-border-soft)',
                  transition: 'background 0.3s',
                }}>
                  <p style={{ fontSize: '13px', color: 'var(--drb-text-muted)', margin: 0 }}>
                    Aquí aparecerán tus consultas recientes 💬
                  </p>
                </div>
              )}
            </div>

            {/* ── REDES SOCIALES ─────────────────────────────── */}
            <div style={{
              width: '100%', display: 'flex', flexDirection: 'column',
              alignItems: 'center', gap: '10px', paddingTop: '8px',
            }}>
              {/* Fila: Instagram + Compartir app */}
              <div style={{ display: 'flex', gap: '10px', width: '100%' }}>

                {/* Instagram */}
                <a
                  href="https://instagram.com/drbeautybot"
                  target="_blank" rel="noopener noreferrer"
                  className="btn-scale"
                  style={{
                    display: 'flex', alignItems: 'center', gap: '8px',
                    padding: '10px 16px', borderRadius: '999px',
                    background: 'var(--drb-surface-card)',
                    border: '1px solid var(--drb-border-soft)',
                    textDecoration: 'none', flexShrink: 0,
                  }}
                >
                  <img
                    src="/images/icons8-instagram-60.png"
                    alt="Instagram"
                    style={{ width: '22px', height: '22px', borderRadius: '6px' }}
                  />
                  <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--drb-text-primary)', whiteSpace: 'nowrap' }}>
                    @drbeautybot
                  </span>
                </a>

                {/* Compartir app */}
                <button
                  onClick={() => {
                    const text = '💜 Descubrí Dr. BeautyBot, tu asistente de medicina estética disponible 24/7.\n\n🤖 Descárgala gratis:\ndrbeautybot.app\n\n📸 @drbeautybot';
                    if (navigator.share) {
                      navigator.share({ title: 'Dr. BeautyBot', text }).catch(() => {});
                    } else {
                      navigator.clipboard.writeText(text);
                    }
                  }}
                  className="btn-scale"
                  style={{
                    flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    gap: '7px', padding: '10px 16px', borderRadius: '999px',
                    background: 'linear-gradient(135deg, rgba(183,148,244,0.2), rgba(237,100,166,0.12))',
                    border: '1px solid rgba(183,148,244,0.3)',
                    cursor: 'pointer',
                  }}
                >
                  <span style={{ fontSize: '15px' }}>📤</span>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--drb-text-secondary)', whiteSpace: 'nowrap' }}>
                    Compartir app
                  </span>
                </button>
              </div>

              {/* Footer mínimo */}
              <p style={{
                fontSize: '10.5px', color: 'var(--drb-text-hint)',
                textAlign: 'center', marginTop: '2px',
              }}>
                Dr. BeautyBot · drbeautybot.app · 2026
                <br />
                <span style={{ opacity: 0.7 }}>Desarrollado por Djiin DevHouse</span>
              </p>
            </div>

          </div>
        </div>

        {/* ── FAB (+) ─────────────────────────────────────── */}
        <div style={{
          position: 'fixed', bottom: '32px', left: 0, right: 0,
          display: 'flex', justifyContent: 'center', zIndex: 50, pointerEvents: 'none',
        }}>
          <button
            onClick={() => startChat()}
            aria-label="Nueva consulta"
            className="drb-pulse active:scale-95"
            style={{
              pointerEvents: 'auto', width: '64px', height: '64px',
              borderRadius: '50%', background: 'var(--drb-gradient-cta)',
              color: 'white', fontSize: '34px', fontWeight: 300, lineHeight: 1,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 6px 28px rgba(183,148,244,0.6)',
              border: 'none', cursor: 'pointer',
            }}
          >+</button>
        </div>
      </div>
    </>
  );
}