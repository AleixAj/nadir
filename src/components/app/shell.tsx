"use client";

// Frame of the whole app (/app/*): banner, sidebar, headers and the dialogs.
// It also decides if we show the real account or the demo, and loads that data into the store.
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { MotionConfig } from "motion/react";
import { IconEye, IconFlask } from "@tabler/icons-react";
import type { AccountData } from "@/lib/account-types";
import { useDemo, useIsAccount, type LoadState } from "@/lib/store";
import { AddProductModal } from "./add-product";
import { DesktopHeader, MobileHeader } from "./header";
import { ListDialog } from "./list-dialog";
import { MobileNav } from "./mobile-nav";
import { Sidebar } from "./sidebar";
import { Toaster } from "./toaster";

const BANNER_CLASS =
  "relative flex min-h-8 shrink-0 items-center justify-center gap-2 border-b border-brand-soft-border/60 bg-[linear-gradient(90deg,transparent,var(--brand-soft),transparent)] px-3 py-1.5 text-center text-xs text-text-2";

// Boot state lives in a context instead of the store so it never gets saved
const Boot = createContext(false);

export function AppShell({
  children,
  account,
}: {
  children: ReactNode;
  account: AccountData | null;
}) {
  const params = useSearchParams();
  const embed = params.get("embed") === "1";
  const setLoadState = useDemo((s) => s.setLoadState);
  const isAccount = useIsAccount();
  // A signed-in user who opens ?demo=1 stays in the demo while moving around the app
  // (the sidebar links don't carry ?demo=1). "Volver a mi cuenta" reloads the page.
  const [demoChosen, setDemoChosen] = useState(params.get("demo") === "1");
  if (params.get("demo") === "1" && !demoChosen) setDemoChosen(true);
  const wantsAccount = !!account && !demoChosen;
  const [demoBooting, setDemoBooting] = useState(!embed && !wantsAccount);
  // With an account, loading lasts until its data is in the store
  const booting = wantsAccount ? !isAccount : demoBooting;
  const mainRef = useRef<HTMLElement>(null);
  const pathname = usePathname();

  // <main> scrolls, not the window, so reset it on every page change
  useEffect(() => {
    mainRef.current?.scrollTo(0, 0);
  }, [pathname]);

  // First load, and again if a signed-in user opens the demo later.
  // Signed in: real data that already came from the server.
  // Signed out (or ?demo=1): load the saved demo and show skeletons for a moment.
  // ?estado=vacio|cargando|error forces each UI state.
  useEffect(() => {
    if (wantsAccount && account) {
      useDemo.getState().enterAccount(account);
      return;
    }
    useDemo.getState().enterDemo();
    const e = params.get("estado") as LoadState | null;
    if (e) setLoadState(e);
    if (embed) return;
    const t = setTimeout(() => setDemoBooting(false), 650);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wantsAccount]);

  return (
    <Boot.Provider value={booting}>
      {/* reducedMotion="user": Motion animations follow the system "reduce motion" setting */}
      <MotionConfig reducedMotion="user">
        {/* Full-screen layout: banner on top, fixed sidebar, only <main> scrolls */}
        <div className="relative flex h-dvh flex-col overflow-hidden bg-bg text-text">
          {/* Soft orange glow behind the content */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 -z-0 opacity-70 dark:opacity-100"
            style={{
              background:
                "radial-gradient(900px 420px at 85% -8%, color-mix(in oklab, var(--brand) 11%, transparent), transparent 70%), radial-gradient(700px 380px at 10% 110%, color-mix(in oklab, var(--brand) 6%, transparent), transparent 70%)",
            }}
          />
          {!embed && !isAccount && <DemoBanner signedIn={!!account} />}
          {!embed && isAccount && <TestEnvBanner />}
          <div className="relative flex min-h-0 flex-1">
            <Sidebar />
            <main
              ref={mainRef}
              className="flex min-w-0 flex-1 flex-col overflow-y-auto overscroll-contain"
            >
              <DesktopHeader />
              <MobileHeader />
              <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-5 px-4 pt-4 pb-24 desk:px-8 desk:pt-7 desk:pb-14">
                {children}
              </div>
            </main>
          </div>
          <MobileNav />
          <AddProductModal />
          <ListDialog />
          <Toaster />
        </div>
      </MotionConfig>
    </Boot.Provider>
  );
}

// True while data is "loading" (first load or ?estado=cargando)
export function useLoading() {
  const booting = useContext(Boot);
  const loadState = useDemo((s) => s.loadState);
  return booting || loadState === "cargando";
}

function DemoBanner({ signedIn }: { signedIn: boolean }) {
  return (
    <div role="status" className={BANNER_CLASS}>
      <IconEye size={14} aria-hidden />
      <span>Estás viendo una cuenta de demostración</span>
      <span className="hidden text-text-3 desk:inline">
        (precios orientativos)
      </span>
      <span className="text-text-3" aria-hidden>
        ·
      </span>
      {signedIn ? (
        // A normal link (not <Link>) so the page reloads and loads the account again
        <a href="/app" className="link-anim font-medium text-brand-text">
          Volver a mi cuenta
        </a>
      ) : (
        <Link
          href="/entrar?modo=registro"
          className="link-anim font-medium text-brand-text"
        >
          Crear cuenta
        </Link>
      )}
    </div>
  );
}

// Real accounts: tells the user the catalog is test data
function TestEnvBanner() {
  return (
    <div role="note" className={BANNER_CLASS}>
      <IconFlask size={14} className="text-brand-text" aria-hidden />
      <span>
        <strong className="font-semibold text-text">Entorno de prueba:</strong>{" "}
        catálogo real de septiembre de 2026 con la evolución de precios
        simulada.
      </span>
    </div>
  );
}
