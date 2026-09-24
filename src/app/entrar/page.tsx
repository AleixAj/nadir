"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { motion } from "motion/react";
import { IconBrandGoogle, IconPlayerPlay } from "@tabler/icons-react";
import { btn, Logo } from "@/components/ui";

export default function EntrarPage() {
  return (
    <Suspense>
      <Entrar />
    </Suspense>
  );
}

function Entrar() {
  const registro = useSearchParams().get("modo") === "registro";

  return (
    <div className="flex min-h-screen flex-col bg-bg text-text">
      <header className="flex h-[60px] items-center px-4 desk:px-8">
        <Link href="/" aria-label="Volver al inicio" className="text-text">
          <Logo size={24} text={17} />
        </Link>
      </header>
      <main className="flex flex-1 items-start justify-center px-4 pt-6 pb-12 desk:px-8 desk:py-16">
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
              {registro ? "Empieza a seguir precios en menos de un minuto." : "Accede con tu cuenta de Google."}
            </p>
          </div>
          <div className="flex flex-col gap-4 rounded-xl border border-border bg-surface p-6 shadow-sm">
            {/* El inicio de sesión con Google llegará en la siguiente fase */}
            <button type="button" disabled className={btn("secondary", "lg", "h-10 w-full text-sm")} aria-describedby="google-soon">
              <IconBrandGoogle size={17} aria-hidden />
              Continuar con Google
              <span className="ml-1 rounded bg-surface-3 px-1.5 py-px text-[11px] font-semibold text-text-2">Próximamente</span>
            </button>
            <p id="google-soon" className="m-0 -mt-1 text-center text-xs text-text-3">
              Las cuentas de usuario aún no están disponibles.
            </p>
            <div className="flex items-center gap-3 text-xs text-text-3">
              <span className="h-px flex-1 bg-border" />o<span className="h-px flex-1 bg-border" />
            </div>
            <Link href="/app" className={btn("primary", "lg", "h-10 w-full text-sm")}>
              <IconPlayerPlay size={16} aria-hidden />
              Entrar como demo
            </Link>
            <p className="m-0 text-center text-xs text-text-3">Cuenta de ejemplo con 12 productos, alertas e histórico de precios.</p>
          </div>
          <p className="m-0 text-center text-[13px] text-text-2">
            {registro ? "¿Ya tienes cuenta?" : "¿Aún no tienes cuenta?"}{" "}
            <Link href={registro ? "/entrar" : "/entrar?modo=registro"} className="font-medium text-brand-text hover:underline">
              {registro ? "Inicia sesión" : "Crea una"}
            </Link>
          </p>
        </motion.div>
      </main>
    </div>
  );
}
