import type { NextConfig } from "next";
const withPWA = require("next-pwa")({
  dest: "public",
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === "development",
});
const nextConfig: NextConfig = {
  ...(process.env.BUILD_TARGET === 'capacitor' ? { output: 'export' } : {}),
  images: {
    unoptimized: true,
  },
};
export default withPWA(nextConfig);