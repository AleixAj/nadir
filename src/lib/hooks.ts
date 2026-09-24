"use client";

import { useSyncExternalStore } from "react";

/** true si la media query se cumple. En el servidor devuelve `fallback`. */
export function useMediaQuery(query: string, fallback = false) {
  return useSyncExternalStore(
    (cb) => {
      const m = window.matchMedia(query);
      m.addEventListener("change", cb);
      return () => m.removeEventListener("change", cb);
    },
    () => window.matchMedia(query).matches,
    () => fallback,
  );
}

/** Móvil según el diseño: menos de 820 px de ancho. */
export const useIsMobile = () => useMediaQuery("(max-width: 819.98px)");
