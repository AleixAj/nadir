"use client";

import { useEffect, useRef } from "react";

// Cloudflare Turnstile: a free, mostly invisible check that the visitor is a person.
// It gives a one-time token that the server checks before sign-up, login, etc.
// https://developers.cloudflare.com/turnstile/

type TurnstileApi = {
  render: (el: HTMLElement, options: Record<string, unknown>) => string;
  remove: (id: string) => void;
};
declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

const SCRIPT = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

// Loads Cloudflare's script once for the whole page
let loading: Promise<void> | null = null;
function loadScript() {
  loading ??= new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = SCRIPT;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => {
      loading = null;
      reject(new Error("Turnstile failed to load"));
    };
    document.head.appendChild(s);
  });
  return loading;
}

// Renders the widget and sends each new token to onToken (null when it expires).
// Change the `key` of this component to get a fresh token after using one.
export function Turnstile({ siteKey, onToken }: { siteKey: string; onToken: (token: string | null) => void }) {
  const box = useRef<HTMLDivElement>(null);
  const callback = useRef(onToken);
  useEffect(() => {
    callback.current = onToken;
  });

  useEffect(() => {
    let id: string | null = null;
    let cancelled = false;
    loadScript()
      .then(() => {
        if (cancelled || !box.current || !window.turnstile) return;
        id = window.turnstile.render(box.current, {
          sitekey: siteKey,
          theme: "dark",
          // Only shows something if Cloudflare really needs the person to click
          appearance: "interaction-only",
          callback: (token: string) => callback.current(token),
          "expired-callback": () => callback.current(null),
          "error-callback": () => callback.current(null),
        });
      })
      .catch(() => callback.current(null));
    return () => {
      cancelled = true;
      if (id && window.turnstile) window.turnstile.remove(id);
    };
  }, [siteKey]);

  return <div ref={box} className="flex justify-center empty:hidden" />;
}

// Header the server expects with the token
export const captchaHeaders = (token: string | null) => (token ? { headers: { "x-captcha-response": token } } : undefined);
