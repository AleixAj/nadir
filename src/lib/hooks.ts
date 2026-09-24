"use client";

import { useSyncExternalStore } from "react";

/** True when the media query matches. Returns `fallback` on the server. */
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

/** Mobile layout: narrower than 820px (matches the `desk` breakpoint). */
export const useIsMobile = () => useMediaQuery("(max-width: 819.98px)");
