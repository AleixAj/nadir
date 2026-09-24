"use client";

import { useCallback, useSyncExternalStore } from "react";

export type Theme = "light" | "dark";
const KEY = "nadir-theme";

/**
 * Se ejecuta en <head> antes de pintar, para que no parpadee el tema equivocado.
 * Prioridad: ?theme= en la URL (lo usa la vista previa de la landing) → localStorage → oscuro.
 */
export const themeScript = `(function(){try{var q=new URLSearchParams(location.search).get('theme');var t=q||localStorage.getItem('${KEY}')||'dark';document.documentElement.setAttribute('data-theme',t)}catch(e){document.documentElement.setAttribute('data-theme','dark')}})()`;

const listeners = new Set<() => void>();

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

const getTheme = (): Theme => (document.documentElement.getAttribute("data-theme") === "light" ? "light" : "dark");

export function useTheme() {
  const theme = useSyncExternalStore(subscribe, getTheme, () => "dark" as Theme);

  const setTheme = useCallback((t: Theme) => {
    const root = document.documentElement;
    // Transición de color solo durante el cambio de tema
    root.classList.add("theme-transition");
    root.setAttribute("data-theme", t);
    try {
      localStorage.setItem(KEY, t);
    } catch {}
    listeners.forEach((l) => l());
    window.setTimeout(() => root.classList.remove("theme-transition"), 250);
  }, []);

  return { theme, setTheme, toggle: () => setTheme(theme === "dark" ? "light" : "dark") };
}
