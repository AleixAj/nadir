"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { motion } from "motion/react";
import { IconAlertCircle, IconEye, IconEyeOff, IconLoader2, IconMailCheck, IconPlayerPlay } from "@tabler/icons-react";
import { btn, Logo } from "@/components/ui";
import { authClient } from "@/lib/auth-client";

/** Official four-colour Google "G", as required by their brand guidelines. */
function GoogleG() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
      <path
        fill="#FFC107"
        d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"
      />
      <path
        fill="#FF3D00"
        d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"
      />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  );
}

// Turns Better Auth error codes into messages for the user
function emailErrorMessage(code: string | undefined): string {
  if (code === "USER_ALREADY_EXISTS" || code === "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL") {
    return "Ya existe una cuenta con este email. Entra con tu contraseña o con Google.";
  }
  if (code === "INVALID_EMAIL_OR_PASSWORD") return "El email o la contraseña no son correctos.";
  if (code === "INVALID_EMAIL") return "Escribe un email válido.";
  if (code === "PASSWORD_TOO_SHORT") return "La contraseña tiene que tener al menos 8 caracteres.";
  if (code === "TOO_MANY_REQUESTS") return "Demasiados intentos. Espera un minuto y vuelve a probar.";
  if (code === "EMAIL_NOT_VERIFIED") return "Aún no has confirmado tu email.";
  return "No se ha podido completar. Inténtalo de nuevo.";
}

// The confirmation link logs the user in and comes back here, which then opens /app
const VERIFIED_URL = "/entrar?verificado=1";

// Error shown when arriving from Google or from a confirmation link that failed
function initialError(params: URLSearchParams) {
  if (!params.get("error")) return "";
  if (params.get("verificado"))
    return "El enlace de confirmación no es válido o ha caducado. Entra con tu email y contraseña y te enviaremos otro.";
  return "No se ha podido iniciar sesión con Google. Inténtalo de nuevo.";
}

const INPUT =
  "h-11 w-full rounded-lg border border-border-strong bg-surface px-3 text-sm outline-none transition-[border-color,box-shadow] duration-200 placeholder:text-text-3 focus:border-brand focus:shadow-[0_0_0_4px_var(--brand-soft)]";

export function EntrarClient({ googleReady }: { googleReady: boolean }) {
  const params = useSearchParams();
  const registro = params.get("modo") === "registro";
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  // Email form
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [sending, setSending] = useState(false);
  // Email where we just sent the confirmation link (shows the "check your email" screen)
  const [sentTo, setSentTo] = useState("");
  const [resent, setResent] = useState(false);
  const [error, setError] = useState(initialError(params));

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

  // Sign up or log in with email and password.
  // callbackURL is where the link in the confirmation email takes the user.
  const submitEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSending(true);
    const address = email.trim();
    const result = registro
      ? await authClient.signUp.email({
          name: name.trim() || address.split("@")[0],
          email: address,
          password,
          callbackURL: VERIFIED_URL,
        })
      : await authClient.signIn.email({
          email: address,
          password,
          callbackURL: VERIFIED_URL,
        });
    setSending(false);

    if (result.error) {
      // Not confirmed yet: the server has just sent a new link, so show the same screen as after signing up
      if (result.error.code === "EMAIL_NOT_VERIFIED") setSentTo(address);
      else setError(emailErrorMessage(result.error.code));
      return;
    }
    if (registro) {
      // New account: no session until the email is confirmed
      setSentTo(address);
      return;
    }
    // Logged in, open the dashboard
    router.push("/app");
    router.refresh();
  };

  const resend = async () => {
    setError("");
    const { error } = await authClient.sendVerificationEmail({
      email: sentTo,
      callbackURL: VERIFIED_URL,
    });
    if (error) setError(emailErrorMessage(error.code));
    else setResent(true);
  };

  const busy = loading || sending;

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-bg text-text">
      <div
        aria-hidden
        className="pointer-events-none absolute top-[-200px] left-1/2 h-[460px] w-[760px] -translate-x-1/2 rounded-full blur-3xl"
        style={{
          background: "radial-gradient(closest-side, color-mix(in oklab, var(--brand) 18%, transparent), transparent)",
        }}
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
              {registro ? "Gratis. Con Google o con tu email." : "Con tu cuenta de Google o con tu email."}
            </p>
          </div>
          {sentTo ? (
            <div className="surface-grad flex flex-col items-center gap-3 rounded-xl border border-border bg-surface/90 p-6 text-center shadow-[0_24px_60px_-30px_var(--glow)] backdrop-blur-sm">
              <span className="grid size-12 place-items-center rounded-full bg-brand-soft text-brand-text">
                <IconMailCheck size={24} aria-hidden />
              </span>
              <h2 className="m-0 text-lg font-semibold">Revisa tu email</h2>
              <p role="status" className="m-0 text-sm leading-relaxed text-text-2">
                Te hemos enviado un enlace a <strong className="text-text">{sentTo}</strong>. Ábrelo para confirmar tu cuenta y entrar. Si
                no lo ves, mira en la carpeta de spam.
              </p>
              {error && (
                <p role="alert" className="m-0 text-xs text-up">
                  {error}
                </p>
              )}
              <button type="button" onClick={resend} disabled={resent} className={btn("primary", "lg", "mt-1 h-11 w-full text-sm")}>
                {resent ? "Enlace reenviado" : "Reenviar el enlace"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setSentTo("");
                  setResent(false);
                }}
                className="text-xs font-medium text-brand-text underline-offset-2 hover:underline"
              >
                Usar otro email
              </button>
            </div>
          ) : (
            <div className="surface-grad flex flex-col gap-4 rounded-xl border border-border bg-surface/90 p-6 shadow-[0_24px_60px_-30px_var(--glow)] backdrop-blur-sm">
              <button
                type="button"
                onClick={signIn}
                disabled={!googleReady || busy}
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
                <span className="h-px flex-1 bg-border" />o con tu email
                <span className="h-px flex-1 bg-border" />
              </div>
              <form onSubmit={submitEmail} className="flex flex-col gap-3">
                {registro && (
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Nombre"
                    aria-label="Nombre"
                    autoComplete="name"
                    maxLength={60}
                    className={INPUT}
                  />
                )}
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email"
                  aria-label="Email"
                  autoComplete="email"
                  className={INPUT}
                />
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    minLength={8}
                    maxLength={128}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={registro ? "Contraseña (mínimo 8 caracteres)" : "Contraseña"}
                    aria-label="Contraseña"
                    autoComplete={registro ? "new-password" : "current-password"}
                    className={INPUT + " pr-11"}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                    className="absolute top-1/2 right-2 grid size-8 -translate-y-1/2 place-items-center rounded-md text-text-3 transition-colors hover:text-text"
                  >
                    {showPassword ? <IconEyeOff size={17} aria-hidden /> : <IconEye size={17} aria-hidden />}
                  </button>
                </div>
                <button type="submit" disabled={busy} className={btn("primary", "lg", "h-11 w-full text-sm")}>
                  {sending && <IconLoader2 size={18} className="animate-spin" aria-hidden />}
                  {registro ? "Crear cuenta" : "Entrar"}
                </button>
                {!registro && (
                  <Link
                    href="/entrar/recuperar"
                    className="-mt-1 self-end text-xs text-text-2 underline-offset-2 hover:text-text hover:underline"
                  >
                    ¿Has olvidado tu contraseña?
                  </Link>
                )}
              </form>
              <p className="m-0 text-center text-xs text-text-3">
                {registro ? "¿Ya tienes cuenta? " : "¿No tienes cuenta? "}
                <Link
                  href={registro ? "/entrar" : "/entrar?modo=registro"}
                  onClick={() => setError("")}
                  className="font-medium text-brand-text underline-offset-2 hover:underline"
                >
                  {registro ? "Entra" : "Crea una gratis"}
                </Link>
              </p>
              <div className="flex items-center gap-3 text-xs text-text-3">
                <span className="h-px flex-1 bg-border" />o
                <span className="h-px flex-1 bg-border" />
              </div>
              <Link href="/app?demo=1" className={btn("primary", "lg", "h-11 w-full text-sm")}>
                <IconPlayerPlay size={16} aria-hidden />
                Entrar como demo
              </Link>
              <p className="m-0 text-center text-xs text-text-3">Cuenta de ejemplo con 12 productos, alertas e histórico de precios.</p>
            </div>
          )}
          <p className="m-0 text-center text-xs text-text-3">
            Al continuar aceptas las{" "}
            <Link href="/condiciones" className="text-text-2 underline">
              Condiciones
            </Link>{" "}
            y la{" "}
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
