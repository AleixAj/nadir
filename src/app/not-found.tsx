import Link from "next/link";
import { IconArrowLeft } from "@tabler/icons-react";
import { ButtonLink, EmptyMark, Logo } from "@/components/ui";

export default function NotFound() {
  return (
    <div className="relative flex min-h-screen flex-col bg-bg text-text">
      <title>Página no encontrada · Nadir</title>
      {/* Orange glow at the top, like the landing */}
      <div
        aria-hidden
        className="pointer-events-none absolute top-[-220px] left-1/2 h-[520px] w-full max-w-[900px] -translate-x-1/2 rounded-full blur-3xl"
        style={{ background: "radial-gradient(closest-side, color-mix(in oklab, var(--brand) 18%, transparent), transparent)" }}
      />
      <header className="relative mx-auto flex h-[60px] w-full max-w-[1200px] items-center px-4 desk:px-8">
        <Link href="/" aria-label="Nadir, inicio" className="text-text">
          <Logo size={24} text={17} />
        </Link>
      </header>

      <main className="relative flex flex-1 flex-col items-center justify-center gap-3 px-4 pb-24 text-center">
        <EmptyMark />
        <p className="m-0 text-sm font-semibold text-brand-text">Error 404</p>
        <h1 className="m-0 text-2xl font-semibold tracking-[-0.02em] desk:text-3xl">No encontramos esta página</h1>
        <p className="m-0 max-w-[420px] text-sm text-text-2">
          Puede que el enlace esté mal escrito o que la página ya no exista.
        </p>
        <div className="mt-3 flex flex-col gap-2.5 desk:flex-row">
          <ButtonLink href="/" size="lg">
            <IconArrowLeft size={16} aria-hidden />
            Volver al inicio
          </ButtonLink>
          <ButtonLink href="/app" variant="secondary" size="lg">
            Ir al panel
          </ButtonLink>
        </div>
      </main>
    </div>
  );
}
