import type { Metadata } from "next";
import { Suspense } from "react";
import { AppShell } from "@/components/app/shell";
import { getSession } from "@/lib/auth";
import { getAccountData } from "@/server/account";

export const metadata: Metadata = { title: "Panel" };

// Load account data on every request (never at build time)
export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  // Logged in: real data comes preloaded from the server. Logged out: demo mode.
  const session = await getSession();
  const account = session ? await getAccountData(session.user).catch(() => null) : null;

  return (
    <Suspense>
      <AppShell account={account}>{children}</AppShell>
    </Suspense>
  );
}
