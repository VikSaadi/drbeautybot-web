/*
  CHANGELOG — layout.tsx
  - 2025-12-16: Branding "Dr. BeautyBot".
  - 2025-12-26: Font Awesome + clase drb-body.
  - 2026-03-24: PWA manifest + theme-color.
  - 2026-04-05: AndroidFrame wrapper.
  - 2026-04-15 v2.2.1:
    · viewport-fit=cover para safe area en Android (status bar).
    · Fix integrity hash de Font Awesome (causaba bloqueo del CSS).
*/

import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AndroidFrame } from "@/components/AndroidFrame";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Dr. BeautyBot – Medicina Estética",
  description:
    "Dr. BeautyBot es tu guía amigable en medicina estética: resuelve dudas, explica tratamientos y te orienta antes de la consulta, siempre con enfoque en seguridad.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#a8d5b5",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <head>
        {/* Iconos Font Awesome — sin integrity para evitar bloqueos por hash mismatch */}
        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css"
          crossOrigin="anonymous"
          referrerPolicy="no-referrer"
        />
        {/* PWA */}
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased drb-body`}
      >
        <AndroidFrame>{children}</AndroidFrame>
      </body>
    </html>
  );
}