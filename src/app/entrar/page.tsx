import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { getSession, isGoogleConfigured, turnstileSiteKey } from "@/lib/auth";
import { EntrarClient } from "./entrar-client";

export const metadata: Metadata = { title: "Entrar" };

// Depends on the session and on Cloudflare env vars, so render on every request
export const dynamic = "force-dynamic";

export default async function EntrarPage() {
  // Already logged in: go straight to the dashboard
  if (await getSession()) redirect("/app");
  return (
    <Suspense>
      <EntrarClient googleReady={isGoogleConfigured()} turnstileKey={turnstileSiteKey()} />
    </Suspense>
  );
}
