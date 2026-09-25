"use client";

import Link from "next/link";
import "./globals.css";

// Last resort when the root layout itself fails. It replaces the whole document,
// so it needs its own <html> and <body> and always uses the dark theme.
export default function GlobalError({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <html lang="es" data-theme="dark">
      <body className="grid min-h-screen place-items-center px-4 font-sans">
        <title>Error · Nadir</title>
        <main className="flex flex-col items-center gap-3 text-center">
          <h1 className="m-0 text-2xl font-semibold tracking-[-0.02em]">Algo ha fallado</h1>
          <p className="m-0 max-w-[400px] text-sm text-text-2">No hemos podido cargar Nadir. Prueba otra vez en unos segundos.</p>
          <div className="mt-2 flex gap-2.5">
            <button
              type="button"
              onClick={() => retry()}
              className="h-10 cursor-pointer rounded-lg border-none bg-brand-solid px-4 font-medium text-on-brand hover:bg-brand-solid-hover"
            >
              Reintentar
            </button>
            <Link href="/" className="grid h-10 place-items-center rounded-lg border border-border-strong px-4 font-medium text-text no-underline">
              Ir al inicio
            </Link>
          </div>
        </main>
      </body>
    </html>
  );
}
