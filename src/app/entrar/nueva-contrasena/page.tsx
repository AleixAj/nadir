"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { IconLoader2 } from "@tabler/icons-react";
import { btn } from "@/components/ui";
import { authClient } from "@/lib/auth-client";
import { AUTH_INPUT, AuthFrame } from "../auth-frame";

// The link in the "forgot password" email lands here with ?token=...
// (or with ?error=INVALID_TOKEN if it's wrong or expired)
export default function NuevaContrasenaPage() {
  return (
    <AuthFrame title="Elige una contraseña nueva" subtitle="Mínimo 8 caracteres.">
      {/* useSearchParams needs a Suspense boundary */}
      <Suspense>
        <NewPasswordForm />
      </Suspense>
    </AuthFrame>
  );
}

function NewPasswordForm() {
  const params = useSearchParams();
  const token = params.get("token");
  const [password, setPassword] = useState("");
  const [repeat, setRepeat] = useState("");
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  if (!token || params.get("error")) {
    return (
      <p role="alert" className="m-0 text-center text-sm leading-relaxed text-text-2">
        El enlace no es válido o ha caducado.{" "}
        <Link href="/entrar/recuperar" className="font-medium text-brand-text underline-offset-2 hover:underline">
          Pide uno nuevo
        </Link>
        .
      </p>
    );
  }

  if (done) {
    return (
      <div className="flex flex-col gap-3 text-center">
        <p role="status" className="m-0 text-sm text-text-2">
          Contraseña cambiada. Ya puedes entrar con ella.
        </p>
        <Link href="/entrar" className={btn("primary", "lg", "h-11 w-full text-sm")}>
          Entrar
        </Link>
      </div>
    );
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (password !== repeat) {
      setError("Las dos contraseñas no coinciden.");
      return;
    }
    setSaving(true);
    const { error } = await authClient.resetPassword({ newPassword: password, token });
    setSaving(false);
    if (error?.code === "INVALID_TOKEN") setError("El enlace ha caducado. Pide uno nuevo desde «¿Has olvidado tu contraseña?».");
    else if (error) setError("No se ha podido cambiar la contraseña. Inténtalo de nuevo.");
    else setDone(true);
  };

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3">
      <input
        type="password"
        required
        minLength={8}
        maxLength={128}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Contraseña nueva"
        aria-label="Contraseña nueva"
        autoComplete="new-password"
        className={AUTH_INPUT}
      />
      <input
        type="password"
        required
        minLength={8}
        maxLength={128}
        value={repeat}
        onChange={(e) => setRepeat(e.target.value)}
        placeholder="Repite la contraseña"
        aria-label="Repite la contraseña"
        autoComplete="new-password"
        className={AUTH_INPUT}
      />
      {error && (
        <p role="alert" className="m-0 text-xs text-up">
          {error}
        </p>
      )}
      <button type="submit" disabled={saving} className={btn("primary", "lg", "h-11 w-full text-sm")}>
        {saving && <IconLoader2 size={18} className="animate-spin" aria-hidden />}
        Guardar contraseña
      </button>
    </form>
  );
}
