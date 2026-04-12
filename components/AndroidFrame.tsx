'use client';

/**
 * components/AndroidFrame.tsx
 * CHANGELOG
 * - 2026-04-05 v1.0: Marco Android inicial.
 * - 2026-04-05 v1.1: Barra de navegación mejorada + badge Google Play oficial.
 * - 2026-04-05 v1.2:
 *   · Botones de navegación funcionales:
 *     - Atrás → router.back() (siempre visible)
 *     - Inicio → router.push('/') (oculto en home, visible en otras rutas)
 *     - Recientes → mini overlay con últimos chats de localStorage
 *   · usePathname() para detectar ruta actual
 *   · Overlay de recientes con animación fade-up, cierra al hacer click fuera
 */

import React, { useState, useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';

// ── CONSTANTES ─────────────────────────────────────────────────────────────
const GOOGLE_PLAY_URL = 'https://play.google.com/store/apps/details?id=app.drbeautybot';
const INSTAGRAM_DRB   = 'https://instagram.com/drbeautybot';
const INSTAGRAM_DJIIN = 'https://instagram.com/djiin.devhouse';
const PLAY_BADGE_SRC  = '/images/google-play-app-store-android-wallets-b4ba278fac7b94c31b4e817ee72c8b63.png';
const HISTORY_KEY     = 'drb_chat_history';

interface ChatHistoryItem {
  id: string;
  title: string;
  meta: string;
}

// ── ESTILOS ────────────────────────────────────────────────────────────────
const FRAME_STYLES = `
  @media (min-width: 768px) {

    body.drb-body {
      background: linear-gradient(160deg, #f5f0ff 0%, #fce4f0 50%, #f0e8ff 100%);
      min-height: 100dvh;
      overflow-x: hidden;
    }

    .android-scene {
      min-height: 100dvh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 0.75rem 1rem 1rem;
      gap: 0;
    }

    .android-brand { text-align: center; animation: drb-fade-up 0.4s ease both; margin-bottom: 0.5rem; }
    .android-brand-title {
      font-size: 32px;
      font-weight: 700;
      background: linear-gradient(135deg, #b794f4, #ed64a6);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      letter-spacing: -0.5px;
    }
    .android-brand-sub { font-size: 14px; color: #9b82b8; margin-top: 3px; }

    .android-phone { margin-bottom: 0.3rem;
      position: relative;
      width: 320px;
      z-index: 2;
      animation: drb-fade-up 0.5s ease 0.1s both;
    }

    .android-shell {
      width: 320px;
      height: 640px;
      background: #111124;
      border-radius: 40px;
      border: 3px solid #1e1e3a;
      position: relative;
      overflow: hidden;
      box-shadow:
        0 0 0 1px #2e2e50,
        0 32px 64px rgba(10,5,30,0.5),
        inset 0 0 0 1.5px #0a0a18;
    }

    .android-shell::before {
      content: '';
      position: absolute;
      top: 0; left: 50%;
      transform: translateX(-50%);
      width: 90px; height: 24px;
      background: #111124;
      border-radius: 0 0 16px 16px;
      z-index: 10;
    }

    .android-camera {
      position: absolute;
      top: 10px; left: 50%;
      transform: translateX(-50%);
      width: 12px; height: 12px;
      background: #1e1e3a;
      border-radius: 50%;
      z-index: 11;
      box-shadow: inset 0 0 0 2px #0a0a18;
    }

    .android-screen {
      position: absolute;
      inset: 0;
      border-radius: 37px;
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }

    .android-status {
      height: 32px;
      background: rgba(248,243,255,0.98);
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 22px 0 26px;
      font-size: 10px;
      color: #555;
      flex-shrink: 0;
      z-index: 5;
    }

    .android-app-viewport {
      flex: 1;
      overflow-y: auto;
      overflow-x: hidden;
      -webkit-overflow-scrolling: touch;
      touch-action: pan-y;
      position: relative;
    }
    .android-app-viewport::-webkit-scrollbar { display: none; }

    .android-app-viewport a,
    .android-app-viewport button,
    .android-app-viewport [role="button"] { cursor: pointer; }
    .android-app-viewport a:active,
    .android-app-viewport button:active { opacity: 0.75; transition: opacity 0.1s; }

    /* ── NAVBAR ── */
    .android-navbar {
      height: 58px;
      background: rgba(248,243,255,0.98);
      border-top: 0.5px solid rgba(183,148,244,0.2);
      display: flex;
      align-items: center;
      justify-content: space-around;
      padding: 0 8px 6px;
      flex-shrink: 0;
      z-index: 5;
      position: relative;
    }

    .android-nav-btn {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 3px;
      cursor: pointer;
      padding: 6px 16px;
      border-radius: 14px;
      transition: background 0.15s, transform 0.12s;
      min-width: 72px;
      user-select: none;
      border: none;
      background: transparent;
    }
    .android-nav-btn:hover  { background: rgba(183,148,244,0.12); }
    .android-nav-btn:active { background: rgba(183,148,244,0.22); transform: scale(0.92); }

    .android-nav-icon {
      width: 36px; height: 36px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .nav-icon-back   { background: rgba(0,0,0,0.06); }
    .nav-icon-home   { background: linear-gradient(135deg, #b794f4, #ed64a6); box-shadow: 0 3px 10px rgba(183,148,244,0.4); }
    .nav-icon-recent { background: rgba(0,0,0,0.06); }
    .nav-icon-recent.active { background: rgba(183,148,244,0.15); }

    .android-nav-label { font-size: 9px; font-weight: 500; color: #aaa; }
    .android-nav-label.home-label { color: #b794f4; }
    .android-nav-label.recent-active { color: #b794f4; }

    /* ── OVERLAY RECIENTES ── */
    .android-recents-overlay {
      position: absolute;
      bottom: 62px;
      left: 12px; right: 12px;
      background: white;
      border-radius: 18px;
      box-shadow: 0 -4px 24px rgba(130,80,200,0.18);
      border: 0.5px solid rgba(183,148,244,0.25);
      z-index: 20;
      overflow: hidden;
      animation: drb-fade-up 0.2s ease both;
    }
    .android-recents-header {
      padding: 12px 16px 8px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 0.5px solid rgba(183,148,244,0.1);
    }
    .android-recents-title { font-size: 11px; font-weight: 600; color: #6b46a0; }
    .android-recents-close { font-size: 16px; color: #bbb; cursor: pointer; background: none; border: none; padding: 0 4px; }
    .android-recent-item {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px 16px;
      cursor: pointer;
      border-bottom: 0.5px solid rgba(183,148,244,0.08);
      transition: background 0.12s;
    }
    .android-recent-item:last-child { border-bottom: none; }
    .android-recent-item:hover { background: rgba(183,148,244,0.06); }
    .android-recent-dot {
      width: 8px; height: 8px;
      border-radius: 50%;
      background: linear-gradient(135deg, #b794f4, #ed64a6);
      flex-shrink: 0;
    }
    .android-recent-text { font-size: 11px; color: #333; font-weight: 500; }
    .android-recent-meta { font-size: 9px; color: #bbb; margin-top: 1px; }
    .android-recents-empty { padding: 16px; text-align: center; font-size: 11px; color: #bbb; }

    /* Botones físicos */
    .android-btn-power  { position: absolute; right: -5px; top: 90px; width: 4px; height: 34px; background: #1e1e3a; border-radius: 0 4px 4px 0; }
    .android-btn-vol-up { position: absolute; left: -5px; top: 100px; width: 4px; height: 22px; background: #1e1e3a; border-radius: 4px 0 0 4px; }
    .android-btn-vol-dn { position: absolute; left: -5px; top: 130px; width: 4px; height: 22px; background: #1e1e3a; border-radius: 4px 0 0 4px; }

    /* CTA section */
    .android-cta-section { margin-bottom: 0.3rem;
      position: relative;
      z-index: 1;
      pointer-events: none;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
      animation: drb-fade-up 0.5s ease 0.2s both;
    }

    .android-cta-section a, .android-ios-badge { pointer-events: auto; }

    .android-play-badge {
      width: 300px;
      height: auto;
      cursor: pointer;
      transition: transform 0.15s, filter 0.15s;
      filter: drop-shadow(0 6px 18px rgba(0,0,0,0.28));
    }
    .android-play-badge:hover {
      transform: translateY(-3px);
      filter: drop-shadow(0 10px 24px rgba(0,0,0,0.38));
    }
    .android-play-badge:active { transform: translateY(0); }

    .android-ios-badge {
      display: flex; align-items: center; gap: 8px;
      font-size: 12px; color: #c4aee0;
      background: rgba(183,148,244,0.08);
      padding: 8px 18px; border-radius: 999px;
      border: 0.5px solid rgba(183,148,244,0.2);
    }
    .android-ios-dot { width: 7px; height: 7px; border-radius: 50%; background: rgba(183,148,244,0.35); flex-shrink: 0; }

    /* Social */
    .android-social-row { margin-bottom: 0.2rem;
      display: flex; align-items: center; gap: 10px;
      animation: drb-fade-up 0.5s ease 0.3s both;
    }
    .android-social-btn {
      display: flex; align-items: center; gap: 7px;
      font-size: 13px; color: #9b82b8;
      padding: 8px 18px; border-radius: 999px;
      border: 0.5px solid rgba(183,148,244,0.25);
      background: rgba(255,255,255,0.6);
      cursor: pointer; text-decoration: none;
      transition: background 0.15s, transform 0.15s;
    }
    .android-social-btn:hover { background: rgba(255,255,255,0.9); transform: translateY(-1px); }
    .android-sep { width: 1px; height: 18px; background: rgba(183,148,244,0.25); }

    .android-footer-copy {
      font-size: 11px; color: #c4aee0; text-align: center;
      animation: drb-fade-up 0.5s ease 0.35s both;
    }
  }

  /* ── MOBILE: wrapper invisible ── */
  @media (max-width: 767px) {
    .android-scene         { display: contents; }
    .android-brand         { display: none; }
    .android-phone         { display: contents; }
    .android-shell         { all: unset; display: contents; }
    .android-camera        { display: none; }
    .android-screen        { all: unset; display: contents; }
    .android-status        { display: none; }
    .android-app-viewport  { all: unset; display: contents; }
    .android-navbar        { display: none; }
    .android-btn-power     { display: none; }
    .android-btn-vol-up    { display: none; }
    .android-btn-vol-dn    { display: none; }
    .android-cta-section   { display: none; }
    .android-social-row    { display: none; }
    .android-footer-copy   { display: none; }
  }
`;

// ── ICONOS ─────────────────────────────────────────────────────────────────
const IconBack = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="15 18 9 12 15 6"/>
  </svg>
);
const IconHome = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
    <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/>
  </svg>
);
const IconRecents = ({ active }: { active: boolean }) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={active ? '#b794f4' : '#666'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="7" rx="1.5"/>
    <rect x="14" y="3" width="7" height="7" rx="1.5"/>
    <rect x="3" y="14" width="7" height="7" rx="1.5"/>
    <rect x="14" y="14" width="7" height="7" rx="1.5"/>
  </svg>
);
const InstagramIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="2" y="2" width="20" height="20" rx="5"/>
    <circle cx="12" cy="12" r="4"/>
    <circle cx="17.5" cy="6.5" r="1.2" fill="currentColor" stroke="none"/>
  </svg>
);

// ── COMPONENTE ─────────────────────────────────────────────────────────────
export function AndroidFrame({ children }: { children: React.ReactNode }) {
  const router   = useRouter();
  const pathname = usePathname();

  const isHome = pathname === '/';

  const [showRecents, setShowRecents]   = useState(false);
  const [chatHistory, setChatHistory]   = useState<ChatHistoryItem[]>([]);
  const overlayRef = useRef<HTMLDivElement>(null);

  // Cargar historial de chats desde localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(HISTORY_KEY);
      if (raw) setChatHistory(JSON.parse(raw).slice(0, 5));
    } catch { /* ignore */ }
  }, [showRecents]); // recarga cada vez que se abre el overlay

  // Cerrar overlay al hacer click fuera
  useEffect(() => {
    if (!showRecents) return;
    const handler = (e: MouseEvent) => {
      if (overlayRef.current && !overlayRef.current.contains(e.target as Node)) {
        setShowRecents(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showRecents]);

  const handleBack = () => {
    if (window.history.length > 1) router.back();
    else router.push('/');
  };

  const handleGoHome = () => {
    router.push('/');
    setShowRecents(false);
  };

  const handleOpenChat = (sessionId: string) => {
    router.push('/chat?mode=profile');
    setShowRecents(false);
  };

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: FRAME_STYLES }} />

      <div className="android-scene">

        {/* ── Branding ─────────────────────────────────────────── */}
        <div className="android-brand">
          <div className="android-brand-title">Dr. BeautyBot</div>
          <div className="android-brand-sub">Tu experto en medicina estética</div>
        </div>

        {/* ── Marco Android ────────────────────────────────────── */}
        <div className="android-phone">
          <div className="android-shell">
            <div className="android-camera" />

            <div className="android-screen">

              {/* Status bar */}
              <div className="android-status">
                <span>9:41</span>
                <span style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
                  <svg width="12" height="9" viewBox="0 0 12 9">
                    <rect x="0" y="6" width="2" height="3" rx="0.5" fill="#666"/>
                    <rect x="3.3" y="4" width="2" height="5" rx="0.5" fill="#666"/>
                    <rect x="6.6" y="2" width="2" height="7" rx="0.5" fill="#666"/>
                    <rect x="9.9" y="0" width="2" height="9" rx="0.5" fill="#444"/>
                  </svg>
                  <svg width="14" height="9" viewBox="0 0 14 9">
                    <rect x="0" y="1" width="12" height="7" rx="1.5" fill="none" stroke="#555" strokeWidth="1"/>
                    <rect x="12.5" y="3" width="1.5" height="3" rx="0.5" fill="#555"/>
                    <rect x="1" y="2" width="9" height="5" rx="1" fill="#555"/>
                  </svg>
                </span>
              </div>

              {/* App — children Next.js */}
              <div className="android-app-viewport">
                {children}
              </div>

              {/* ── NAVBAR FUNCIONAL ── */}
              <div className="android-navbar">

                {/* Overlay recientes */}
                {showRecents && (
                  <div className="android-recents-overlay" ref={overlayRef}>
                    <div className="android-recents-header">
                      <span className="android-recents-title">💬 Chats recientes</span>
                      <button className="android-recents-close" onClick={() => setShowRecents(false)}>×</button>
                    </div>
                    {chatHistory.length > 0 ? (
                      chatHistory.map((item) => (
                        <div
                          key={item.id}
                          className="android-recent-item"
                          onClick={() => handleOpenChat(item.id)}
                        >
                          <div className="android-recent-dot" />
                          <div>
                            <div className="android-recent-text">{item.title}</div>
                            <div className="android-recent-meta">{item.meta}</div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="android-recents-empty">Aún no hay chats recientes</div>
                    )}
                  </div>
                )}

                {/* Botón Atrás — siempre visible */}
                <button className="android-nav-btn" onClick={handleBack} aria-label="Atrás">
                  <div className="android-nav-icon nav-icon-back">
                    <IconBack />
                  </div>
                  <span className="android-nav-label">Atrás</span>
                </button>

                {/* Botón Inicio — solo visible fuera del home */}
                {!isHome && (
                  <button className="android-nav-btn" onClick={handleGoHome} aria-label="Inicio">
                    <div className="android-nav-icon nav-icon-home">
                      <IconHome />
                    </div>
                    <span className="android-nav-label home-label">Inicio</span>
                  </button>
                )}

                {/* Botón Recientes — siempre visible */}
                <button
                  className="android-nav-btn"
                  onClick={() => setShowRecents((v) => !v)}
                  aria-label="Recientes"
                >
                  <div className={`android-nav-icon nav-icon-recent ${showRecents ? 'active' : ''}`}>
                    <IconRecents active={showRecents} />
                  </div>
                  <span className={`android-nav-label ${showRecents ? 'recent-active' : ''}`}>Recientes</span>
                </button>

              </div>
            </div>

            {/* Botones físicos */}
            <div className="android-btn-power" />
            <div className="android-btn-vol-up" />
            <div className="android-btn-vol-dn" />
          </div>
        </div>

        {/* ── Badge Google Play ─────────────────────────────────── */}
        <div className="android-cta-section">
          <a href={GOOGLE_PLAY_URL} target="_blank" rel="noopener noreferrer" style={{ display: "block", lineHeight: 0 }}>
            <img
              src={PLAY_BADGE_SRC}
              alt="Descargar en Google Play"
              className="android-play-badge"
            />
          </a>
          <div className="android-ios-badge">
            <div className="android-ios-dot" />
            Próximamente en iOS
          </div>
        </div>

        {/* ── Social ───────────────────────────────────────────── */}
        <div className="android-social-row">
          <a href={INSTAGRAM_DRB} target="_blank" rel="noopener noreferrer" className="android-social-btn">
            <InstagramIcon />
            @drbeautybot
          </a>
          <div className="android-sep" />
          <a href={INSTAGRAM_DJIIN} target="_blank" rel="noopener noreferrer" className="android-social-btn">
            <InstagramIcon />
            Djiin DevHouse
          </a>
        </div>

        <div className="android-footer-copy">
          Dr. BeautyBot · drbeautybot.app · 2026
        </div>

      </div>
    </>
  );
}