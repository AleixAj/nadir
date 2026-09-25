import type { Metadata } from "next";

// The page is a client component, so its tab title lives here
export const metadata: Metadata = { title: "Producto" };

export default function ProductLayout({ children }: { children: React.ReactNode }) {
  return children;
}
