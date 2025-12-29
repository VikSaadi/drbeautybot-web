/*
  CHANGELOG — 2025-12-16
  - Actualiza el título y la descripción para el branding "Aesthetica AI - Dr. BeautyBot".
  - Cambia el atributo lang del documento a "es" (contenido principal en español).
  - Mantiene la configuración de fuentes Geist (sans y mono) aplicada a todo el body.
*/

/*
  CHANGELOG — 2025-12-26
  - Actualiza el branding principal a "Dr. BeautyBot – Medicina Estética".
  - Se añade el enlace global a Font Awesome (iconos usados en la landing).
  - Se añade la clase `drb-body` al <body> para aplicar el fondo tipo tapiz animado definido en globals.css.
*/

import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <head>
        {/* Iconos Font Awesome para los botones del front */}
        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css"
          integrity="sha512-pVnHdE6r5H3T8D3YcA5mOQnO2lciqP0aYV5CwP0P8xjI3GCG9w2jQ6vZl0p5y12fqVHx5fCFB5r3L2k5xY6LKw=="
          crossOrigin="anonymous"
          referrerPolicy="no-referrer"
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased drb-body`}
      >
        {children}
      </body>
    </html>
  );
}
