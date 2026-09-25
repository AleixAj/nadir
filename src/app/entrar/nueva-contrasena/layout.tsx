import type { Metadata } from "next";

// The page is a client component, so its tab title lives here
export const metadata: Metadata = { title: "Nueva contraseña", robots: { index: false } };

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
