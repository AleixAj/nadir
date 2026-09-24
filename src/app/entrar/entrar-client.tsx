"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { motion } from "motion/react";
import { IconAlertCircle, IconLoader2, IconPlayerPlay } from "@tabler/icons-react";
import { btn, Logo } from "@/components/ui";
import { authClient } from "@/lib/auth-client";

/** Official four-colour Google "G", as required by their brand guidelines. */
function GoogleG() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  );
}

export function EntrarClient({ googleReady }: { googleReady: boolean }) {
  const params = useSearchParams();
  const registro = params.get("modo") === "registro";
  const [loading, setLoading] = useState(false);
  // "?error=1" means Google sent the user back after a failed login
  const initialError = params.get("error") ? "No se ha podido iniciar sesión con Google. Inténtalo de nuevo." : "";
  const [error, setError] = useState(initialError);

  const signIn = async () => {
    setError("");
    setLoading(true);
    // Redirects to Google; on return Better Auth creates the session and opens the dashboard
    const { error } = await authClient.signIn.social({
      provider: "google",
      callbackURL: "/app",
      errorCallbackURL: "/entrar?error=1",
    });
    if (error) {
      setLoading(false);
      setError("No se ha podido conectar con Google. Inténtalo de nuevo.");
    }
  };

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-bg text-text">
      <div
        aria-hidden
        className="pointer-events-none absolute top-[-200px] left-1/2 h-[460px] w-[760px] -translate-x-1/2 rounded-full blur-3xl"
        style={{ background: "radial-gradient(closest-side, color-mix(in oklab, var(--brand) 18%, transparent), transparent)" }}
      />
      <header className="relative flex h-[60px] items-center px-4 desk:px-8">
        <Link href="/" aria-label="Volver al inicio" className="text-text">
          <Logo size={24} text={17} />
        </Link>
      </header>
      <main className="relative flex flex-1 items-start justify-center px-4 pt-6 pb-12 desk:px-8 desk:py-16">
        <motion.div
          key={String(registro)}
          initial={{ opacity: 0, transform: "translateY(8px)" }}
          animate={{ opacity: 1, transform: "translateY(0px)" }}
          transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
          className="flex w-full max-w-[400px] flex-col gap-5"
        >
          <div className="flex flex-col gap-1.5 text-center">
            <h1 className="m-0 text-2xl font-semibold tracking-[-0.025em]">{registro ? "Crea tu cuenta" : "Entra en Nadir"}</h1>
            <p className="m-0 text-sm text-text-2">
              {registro ? "Con tu cuenta de Google, en un clic. Sin contraseñas." : "Accede con tu cuenta de Google."}
            </p>
          </div>
          <div className="surface-grad flex flex-col gap-4 rounded-xl border border-border bg-surface/90 p-6 shadow-[0_24px_60px_-30px_var(--glow)] backdrop-blur-sm">
            <button
              type="button"
              onClick={signIn}
              disabled={!googleReady || loading}
              className={btn("secondary", "lg", "h-11 w-full text-sm")}
            >
              {loading ? <IconLoader2 size={18} className="animate-spin" aria-hidden /> : <GoogleG />}
              {loading ? "Conectando con Google…" : "Continuar con Google"}
            </button>
            {!googleReady && (
              <p className="m-0 -mt-1 text-center text-xs text-text-3">El inicio de sesión con Google aún no está configurado.</p>
            )}
            {error && (
              <p role="alert" className="m-0 -mt-1 flex items-center justify-center gap-1.5 text-center text-xs text-up">
                <IconAlertCircle size={14} aria-hidden />
                {error}
              </p>
            )}
            <div className="flex items-center gap-3 text-xs text-text-3">
              <span className="h-px flex-1 bg-border" />o<span className="h-px flex-1 bg-border" />
            </div>
            <Link href="/app?demo=1" className={btn("primary", "lg", "h-11 w-full text-sm")}>
              <IconPlayerPlay size={16} aria-hidden />
              Entrar como demo
            </Link>
            <p className="m-0 text-center text-xs text-text-3">Cuenta de ejemplo con 12 productos, alertas e histórico de precios.</p>
          </div>
          <p className="m-0 text-center text-xs text-text-3">
            Al continuar aceptas las <Link href="/condiciones" className="text-text-2 underline">Condiciones</Link> y la{" "}
            <Link href="/privacidad" className="text-text-2 underline">
              Política de privacidad
            </Link>
            .
          </p>
        </motion.div>
      </main>
    </div>
  );
}
