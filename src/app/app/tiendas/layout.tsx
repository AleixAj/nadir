import type { Metadata } from "next";

// The page is a client component, so its tab title lives here
export const metadata: Metadata = { title: "Tiendas" };

export default function TiendasLayout({ children }: { children: React.ReactNode }) {
  return children;
}
