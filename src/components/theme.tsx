"use client";

import { useCallback, useSyncExternalStore } from "react";

export type Theme = "light" | "dark";
const KEY = "nadir-theme";

/**
 * Inline script that runs in <head> before the first paint, so the wrong theme never flashes.
 * Order: ?theme= in the URL (used by the landing preview), then localStorage, then dark.
 */
export const themeScript = `(function () {
  var root = document.documentElement;
  try {
    var fromUrl = new URLSearchParams(location.search).get('theme');
    var theme = fromUrl || localStorage.getItem('${KEY}');
    // Only accept the two known themes, anything else falls back to dark
    root.setAttribute('data-theme', theme === 'light' ? 'light' : 'dark');
  } catch (e) {
    root.setAttribute('data-theme', 'dark');
  }
})()`;

// Components using useTheme() re-render when these listeners are called
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
    // Enable colour transitions only while switching themes
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
