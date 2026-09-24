import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { themeScript } from "@/components/theme";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });

const description =
  "Nadir vigila el precio de los productos que te interesan en varias tiendas, guarda su histórico y te avisa cuando bajan del precio que tú eliges.";

export const metadata: Metadata = {
  metadataBase: new URL("https://nadir.aleixaj.com"),
  title: { default: "Nadir · Compra en el punto más bajo", template: "%s · Nadir" },
  description,
  applicationName: "Nadir",
  authors: [{ name: "Aleix", url: "https://github.com/AleixAj" }],
  keywords: ["monitor de precios", "comparador", "alertas de precio", "histórico de precios", "Next.js"],
  openGraph: {
    type: "website",
    locale: "es_ES",
    url: "/",
    siteName: "Nadir",
    title: "Nadir · Compra en el punto más bajo",
    description,
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "Nadir, monitor de precios" }],
  },
  twitter: { card: "summary_large_image", title: "Nadir · Compra en el punto más bajo", description, images: ["/og.png"] },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fafaf9" },
    { media: "(prefers-color-scheme: dark)", color: "#0e0d0c" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" data-theme="dark" className={inter.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-screen font-sans">{children}</body>
    </html>
  );
}
