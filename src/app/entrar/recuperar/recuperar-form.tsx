"use client";

import { useState } from "react";
import { IconLoader2 } from "@tabler/icons-react";
import { captchaHeaders, Turnstile } from "@/components/turnstile";
import { btn } from "@/components/ui";
import { authClient } from "@/lib/auth-client";
import { AUTH_INPUT, AuthFrame } from "../auth-frame";

// "Forgot your password": asks for the email and sends a link to choose a new one
export function RecuperarForm({ turnstileKey }: { turnstileKey: string | null }) {
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  // Anti-bot token (see components/turnstile.tsx); a new widget after each try
  const [token, setToken] = useState<string | null>(null);
  const [widget, setWidget] = useState(0);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSending(true);
    const { error } = await authClient.requestPasswordReset(
      { email: email.trim(), redirectTo: "/entrar/nueva-contrasena" },
      captchaHeaders(token),
    );
    setSending(false);
    setToken(null);
    setWidget((w) => w + 1);
    if (error?.code === "TOO_MANY_REQUESTS") setError("Demasiados intentos. Espera un minuto y vuelve a probar.");
    else if (error) setError("No se ha podido enviar el email. Inténtalo de nuevo.");
    // Same message whether the account exists or not, so nobody can check which emails are registered
    else setSent(true);
  };

  return (
    <AuthFrame title="¿Has olvidado tu contraseña?" subtitle="Te enviaremos un enlace para elegir una nueva.">
      {sent ? (
        <p role="status" className="m-0 text-center text-sm leading-relaxed text-text-2">
          Si hay una cuenta con <strong className="text-text">{email.trim()}</strong>, te llegará un email con el enlace en unos minutos. Mira también en
          la carpeta de spam.
        </p>
      ) : (
        <form onSubmit={onSubmit} className="flex flex-col gap-3">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            aria-label="Email"
            autoComplete="email"
            className={AUTH_INPUT}
          />
          {error && (
            <p role="alert" className="m-0 text-xs text-up">
              {error}
            </p>
          )}
          {turnstileKey && <Turnstile key={widget} siteKey={turnstileKey} onToken={setToken} />}
          <button type="submit" disabled={sending || (!!turnstileKey && !token)} className={btn("primary", "lg", "h-11 w-full text-sm")}>
            {sending && <IconLoader2 size={18} className="animate-spin" aria-hidden />}
            Enviar enlace
          </button>
        </form>
      )}
    </AuthFrame>
  );
}
