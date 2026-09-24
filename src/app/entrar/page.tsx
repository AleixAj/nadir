import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { getSession, isGoogleConfigured } from "@/lib/auth";
import { EntrarClient } from "./entrar-client";

export const metadata: Metadata = { title: "Entrar" };

// Depende de la sesión y de las claves de Cloudflare: se genera en cada visita
export const dynamic = "force-dynamic";

export default async function EntrarPage() {
  // Si ya hay sesión, directo al panel
  if (await getSession()) redirect("/app");
  return (
    <Suspense>
      <EntrarClient googleReady={isGoogleConfigured()} />
    </Suspense>
  );
}
