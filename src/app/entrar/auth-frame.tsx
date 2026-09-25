import Link from "next/link";
import { Logo } from "@/components/ui";

// Shared frame for the small account pages (forgot password, new password):
// logo on top, orange glow and a centered card.
export function AuthFrame({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-bg text-text">
      <div
        aria-hidden
        className="pointer-events-none absolute top-[-200px] left-1/2 h-[460px] w-[760px] -translate-x-1/2 rounded-full blur-3xl"
        style={{ background: "radial-gradient(closest-side, color-mix(in oklab, var(--brand) 18%, transparent), transparent)" }}
      />
      <header className="relative flex h-[60px] items-center px-4 desk:px-8">
        <Link href="/" aria-label="Volver al inicio" className="text-text">
          <Logo size={24} text={17} />
        </Link>
      </header>
      <main className="relative flex flex-1 items-start justify-center px-4 pt-6 pb-12 desk:px-8 desk:py-16">
        <div className="enter flex w-full max-w-[400px] flex-col gap-5">
          <div className="flex flex-col gap-1.5 text-center">
            <h1 className="m-0 text-2xl font-semibold tracking-[-0.025em]">{title}</h1>
            <p className="m-0 text-sm text-text-2">{subtitle}</p>
          </div>
          <div className="surface-grad flex flex-col gap-4 rounded-xl border border-border bg-surface/90 p-6 shadow-[0_24px_60px_-30px_var(--glow)] backdrop-blur-sm">
            {children}
          </div>
          <p className="m-0 text-center text-xs text-text-3">
            <Link href="/entrar" className="font-medium text-brand-text underline-offset-2 hover:underline">
              Volver a entrar
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}

// Same input style as the sign-in form
export const AUTH_INPUT =
  "h-11 w-full rounded-lg border border-border-strong bg-surface px-3 text-sm outline-none transition-[border-color,box-shadow] duration-200 placeholder:text-text-3 focus:border-brand focus:shadow-[0_0_0_4px_var(--brand-soft)]";
