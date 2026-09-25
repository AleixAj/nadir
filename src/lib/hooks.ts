"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";

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

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Keyboard focus for a modal dialog while `open` is true:
 * - Tab and Shift+Tab stay inside the dialog
 * - when it closes, focus goes back to the button that opened it
 */
export function useDialogFocus(open: boolean, ref: React.RefObject<HTMLElement | null>) {
  // While closed, remember what had focus. It has to be tracked before opening,
  // because an autoFocus input inside the dialog takes the focus straight away.
  const opener = useRef<HTMLElement | null>(null);
  useEffect(() => {
    if (open) return;
    const remember = () => {
      const el = document.activeElement as HTMLElement | null;
      // Ignore focus inside a dialog (an autoFocus input gets it before this effect is cleaned up)
      if (el && !el.closest("[role=dialog]")) opener.current = el;
    };
    remember();
    document.addEventListener("focusin", remember);
    return () => document.removeEventListener("focusin", remember);
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Tab" || !ref.current) return;
      const items = [...ref.current.querySelectorAll<HTMLElement>(FOCUSABLE)];
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      const inside = ref.current.contains(document.activeElement);
      // Wrap around at both ends (and pull focus back in if it escaped)
      if (e.shiftKey && (document.activeElement === first || !inside)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && (document.activeElement === last || !inside)) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    const toRestore = opener.current;
    return () => {
      document.removeEventListener("keydown", onKey);
      toRestore?.focus?.();
    };
  }, [open, ref]);
}
