import type { Metadata } from "next";
import { Suspense } from "react";
import { AppShell } from "@/components/app/shell";

export const metadata: Metadata = { title: "Demo" };

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense>
      <AppShell>{children}</AppShell>
    </Suspense>
  );
}
