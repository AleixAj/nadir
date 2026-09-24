import type { Metadata } from "next";
import { Suspense } from "react";
import { AppShell } from "@/components/app/shell";
import { getSession } from "@/lib/auth";
import { getAccountData } from "@/server/account";

export const metadata: Metadata = { title: "Panel" };

// Carga los datos de la cuenta en cada visita (nunca durante el build)
export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  // Con sesión, los datos reales llegan ya cargados desde el servidor; sin ella, demo.
  const session = await getSession();
  const account = session ? await getAccountData(session.user).catch(() => null) : null;

  return (
    <Suspense>
      <AppShell account={account}>{children}</AppShell>
    </Suspense>
  );
}
