"use client";

import { useRouter } from "next/navigation";

export default function BackButton() {
  const router = useRouter();

  return (
    <button
      onClick={() => router.back()}
      className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors duration-200 mb-4"
      aria-label="Regresar"
    >
      <span className="text-lg">←</span>
      <span>Regresar</span>
    </button>
  );
}