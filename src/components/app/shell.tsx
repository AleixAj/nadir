"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { AnimatePresence, MotionConfig, motion } from "motion/react";
import {
  IconArrowLeft,
  IconBell,
  IconBuildingStore,
  IconCheck,
  IconPencil,
  IconEye,
  IconFlask,
  IconLayoutDashboard,
  IconMoon,
  IconPackage,
  IconPigMoney,
  IconPlus,
  IconSearch,
  IconSelector,
  IconSettings,
  IconSun,
  IconChevronRight,
  IconX,
} from "@tabler/icons-react";
import type { AccountData } from "@/lib/account-types";
import {
  useDemo,
  useIsAccount,
  useProducts,
  type LoadState,
} from "@/lib/store";
import { useTheme } from "@/components/theme";
import { Button, cx, Logo, LogoMark } from "@/components/ui";
import { AddProductModal } from "./add-product";
import { ListDialog } from "./list-dialog";

const NAV = [
  { href: "/app", label: "Panel", short: "Panel", icon: IconLayoutDashboard },
  {
    href: "/app/productos",
    label: "Mis productos",
    short: "Productos",
    icon: IconPackage,
  },
  { href: "/app/alertas", label: "Alertas", short: "Alertas", icon: IconBell },
  {
    href: "/app/tiendas",
    label: "Tiendas",
    short: "Tiendas",
    icon: IconBuildingStore,
  },
];

// "/app" only matches itself; other links also match their sub-pages
const isActive = (path: string, href: string) =>
  href === "/app" ? path === "/app" : path.startsWith(href);

const BANNER_CLASS =
  "relative flex min-h-8 shrink-0 items-center justify-center gap-2 border-b border-brand-soft-border/60 bg-[linear-gradient(90deg,transparent,var(--brand-soft),transparent)] px-3 py-1.5 text-center text-xs text-text-2";

// Number of alerts that are on and not reached yet
function useActiveAlertCount() {
  const products = useProducts();
  const alerts = useDemo((s) => s.alerts);
  return products.filter((p) => alerts[p.id] && p.alert !== "alcanzado").length;
}

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
    <BootContext booting={booting}>
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
    </BootContext>
  );
}

// Boot state lives in a context instead of the store so it never gets saved
const Boot = createContext(false);
function BootContext({
  booting,
  children,
}: {
  booting: boolean;
  children: ReactNode;
}) {
  return <Boot.Provider value={booting}>{children}</Boot.Provider>;
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

// Orange highlight behind the active sidebar link. It slides between links thanks to layoutId.
function SidebarHighlight() {
  return (
    <motion.span
      layoutId="nav-active"
      className="absolute inset-0 rounded-md bg-brand-soft"
      transition={{ type: "spring", duration: 0.35, bounce: 0.1 }}
    >
      <span className="absolute top-1.5 bottom-1.5 left-0 w-[3px] rounded-full bg-brand shadow-[0_0_10px_var(--glow)]" />
    </motion.span>
  );
}

function Sidebar() {
  const path = usePathname();
  const products = useProducts();
  const filter = useDemo((s) => s.filter);
  const setFilter = useDemo((s) => s.setFilter);
  const lists = useDemo((s) => s.lists);
  const openListEditor = useDemo((s) => s.openListEditor);
  const profile = useDemo((s) => s.profile);
  const accountUser = useDemo((s) => s.account);
  const isAccount = useIsAccount();
  const activeCount = useActiveAlertCount();
  const onProducts = path === "/app/productos";
  // When "Mis productos" is filtered by a list, the list is highlighted instead of the menu item
  const listSelected = onProducts && filter !== "Todas";
  // The demo always shows one store with errors
  const storeHasErrors = !isAccount || products.some((p) => p.lastError);

  const counts: Record<string, string> = {
    "/app/productos": String(products.length),
    "/app/alertas": String(activeCount),
  };

  return (
    <div className="hidden w-[244px] shrink-0 border-r border-border bg-surface-2/80 backdrop-blur-sm desk:block">
      <aside
        aria-label="Navegación principal"
        className="flex h-full flex-col gap-5 overflow-y-auto px-3 py-3.5"
      >
        <Link
          href="/"
          aria-label="Nadir, inicio"
          className="flex items-center px-2 py-1 text-text"
        >
          <Logo />
        </Link>
        <nav className="flex flex-col gap-0.5">
          {NAV.map((n) => {
            const isProducts = n.href === "/app/productos";
            const active =
              isActive(path, n.href) && !(isProducts && listSelected);
            const Ic = n.icon;
            return (
              <Link
                key={n.href}
                href={n.href}
                onClick={() => {
                  if (isProducts) setFilter("Todas");
                }}
                aria-current={active ? "page" : undefined}
                className={cx(
                  "press group relative flex h-8 items-center gap-2.5 rounded-md px-2 text-[13px] font-medium",
                  active
                    ? "text-text"
                    : "text-text-2 hover:bg-surface-3 hover:text-text",
                )}
              >
                {active && <SidebarHighlight />}
                <Ic
                  size={17}
                  aria-hidden
                  className={cx(
                    "relative transition-colors duration-200",
                    active ? "text-brand-text" : "group-hover:text-brand-text",
                  )}
                />
                <span className="relative flex-1">{n.label}</span>
                {n.href === "/app/tiendas" && storeHasErrors && (
                  <span
                    title="Hay tiendas con errores"
                    className="relative size-1.5 rounded-full bg-up"
                  >
                    <span className="sr-only">Hay tiendas con errores</span>
                  </span>
                )}
                {counts[n.href] && (
                  <span className="relative grid h-[18px] min-w-5 place-items-center rounded-full border border-border bg-surface px-1.5 text-[11px] font-medium text-text-2">
                    {counts[n.href]}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center justify-between pb-1 pl-2">
            <span className="text-[11px] font-semibold tracking-[.04em] text-text-3 uppercase">
              Listas
            </span>
            <button
              type="button"
              onClick={() => openListEditor("new")}
              aria-label="Nueva lista"
              title="Nueva lista"
              className="press grid size-6 place-items-center rounded-md text-text-3 hover:bg-surface-3 hover:text-text"
            >
              <IconPlus size={14} aria-hidden />
            </button>
          </div>
          {lists.map((l) => {
            const active = onProducts && filter === l.id;
            return (
              <div key={l.id} className="group/list relative">
                <Link
                  href="/app/productos"
                  onClick={() => setFilter(l.id)}
                  className={cx(
                    "press relative flex h-[30px] items-center gap-2.5 rounded-md px-2 text-[13px] font-medium",
                    active
                      ? "text-text"
                      : "text-text-2 hover:bg-surface-3 hover:text-text",
                  )}
                >
                  {active && <SidebarHighlight />}
                  <span
                    className="relative mx-1 size-2 shrink-0 rounded-[2px]"
                    style={{ background: l.color }}
                  />
                  <span className="relative flex-1 truncate">{l.name}</span>
                  {/* The count hides on hover to make room for the edit button */}
                  <span className="relative text-xs text-text-3 group-focus-within/list:opacity-0 group-hover/list:opacity-0">
                    {products.filter((p) => p.list === l.id).length}
                  </span>
                </Link>
                <button
                  type="button"
                  onClick={() => openListEditor(l.id)}
                  aria-label={`Editar la lista ${l.name}`}
                  className="absolute top-1/2 right-1 grid size-6 -translate-y-1/2 place-items-center rounded-md text-text-3 opacity-0 group-focus-within/list:opacity-100 group-hover/list:opacity-100 hover:bg-surface hover:text-text focus-visible:opacity-100"
                >
                  <IconPencil size={13} aria-hidden />
                </button>
              </div>
            );
          })}
          {lists.length === 0 && (
            <p className="m-0 px-2 text-xs text-text-3">
              Aún no tienes listas.
            </p>
          )}
        </div>
        <div className="flex-1" />
        {/* Savings card with fixed sample numbers, demo only */}
        {!isAccount && products.length > 0 && (
          <div className="flex flex-col gap-1.5 rounded-[10px] border border-border bg-surface p-3">
            <div className="flex items-center gap-1.5 text-xs text-text-2">
              <IconPigMoney size={15} className="text-brand" aria-hidden />
              Este mes has ahorrado
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-[22px] font-semibold tracking-[-0.02em]">
                86 €
              </span>
              <span className="text-xs text-text-3">en 4 compras</span>
            </div>
          </div>
        )}
        <Link
          href="/app/ajustes"
          className="press flex items-center gap-2.5 rounded-lg p-2 text-left hover:bg-surface-3"
        >
          <Avatar name={profile.name} image={accountUser?.image} />
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="truncate text-[13px] font-medium">
              {profile.name}
            </span>
            <span className="text-xs text-text-3">Plan gratuito</span>
          </span>
          <IconSelector size={15} className="text-text-3" aria-hidden />
        </Link>
      </aside>
    </div>
  );
}

// Google profile photo if there is one, otherwise the initials
export function Avatar({
  name,
  image,
  size = 30,
}: {
  name: string;
  image?: string | null;
  size?: number;
}) {
  if (image) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- Google photo or a small uploaded one, already optimized
      <img
        src={image}
        alt=""
        width={size}
        height={size}
        referrerPolicy="no-referrer"
        className="shrink-0 rounded-full object-cover"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <span
      className="grid shrink-0 place-items-center rounded-full bg-brand-soft font-semibold text-brand-text"
      // The letters grow with the avatar
      style={{
        width: size,
        height: size,
        fontSize: Math.max(11, Math.round(size * 0.38)),
      }}
    >
      {initials(name)}
    </span>
  );
}

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");

// Header title for the current route. isFicha is true on a product page.
function usePageTitle() {
  const path = usePathname();
  const products = useDemo((s) => s.products);
  if (path.startsWith("/app/productos/")) {
    const id = decodeURIComponent(path.split("/")[3] ?? "");
    return {
      title: products.find((p) => p.id === id)?.name ?? "Producto",
      isFicha: true,
    };
  }
  const titles: Record<string, string> = {
    "/app": "Panel",
    "/app/productos": "Mis productos",
    "/app/alertas": "Alertas",
    "/app/tiendas": "Tiendas",
    "/app/ajustes": "Ajustes",
  };
  return { title: titles[path] ?? "Nadir", isFicha: false };
}

function ThemeButton() {
  const { theme, toggle } = useTheme();
  const label =
    theme === "dark" ? "Cambiar a tema claro" : "Cambiar a tema oscuro";
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={label}
      title={label}
      className="press relative grid size-8 cursor-pointer place-items-center overflow-hidden rounded-md border border-border bg-surface text-text-2 hover:bg-surface-2 hover:text-text"
    >
      <AnimatePresence initial={false} mode="popLayout">
        <motion.span
          key={theme}
          initial={{ opacity: 0, rotate: -60, scale: 0.8 }}
          animate={{ opacity: 1, rotate: 0, scale: 1 }}
          exit={{ opacity: 0, rotate: 60, scale: 0.8 }}
          transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
          className="grid place-items-center"
        >
          {theme === "dark" ? (
            <IconSun size={16} aria-hidden />
          ) : (
            <IconMoon size={16} aria-hidden />
          )}
        </motion.span>
      </AnimatePresence>
    </button>
  );
}

function DesktopHeader() {
  const { title, isFicha } = usePageTitle();
  const router = useRouter();
  const path = usePathname();
  const search = useDemo((s) => s.search);
  const setSearch = useDemo((s) => s.setSearch);
  const openAdd = useDemo((s) => s.openAdd);

  return (
    <header className="sticky top-0 z-10 hidden h-14 items-center gap-4 border-b border-border bg-bg/85 px-8 backdrop-blur-md desk:flex">
      <div className="flex min-w-0 flex-1 items-center gap-1.5 text-sm">
        {isFicha && (
          <>
            <Link
              href="/app/productos"
              className="-ml-1.5 rounded-md px-1.5 py-1 whitespace-nowrap text-text-2 hover:bg-surface-3 hover:text-text"
            >
              Mis productos
            </Link>
            <IconChevronRight size={14} className="text-text-3" aria-hidden />
          </>
        )}
        <span className="truncate font-semibold">{title}</span>
      </div>
      <label className="relative flex w-[260px] min-w-[140px] shrink items-center">
        <IconSearch
          size={15}
          className="absolute left-2.5 text-text-3"
          aria-hidden
        />
        <input
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            // Results are shown on the products page
            if (path !== "/app/productos") router.push("/app/productos");
          }}
          placeholder="Buscar en mis productos"
          aria-label="Buscar en mis productos"
          className="h-8 w-full rounded-md border border-border bg-surface pr-2.5 pl-8 text-[13px] outline-offset-0 placeholder:text-text-3"
        />
      </label>
      <ThemeButton />
      <Button onClick={openAdd}>
        <IconPlus size={15} aria-hidden />
        Añadir producto
      </Button>
    </header>
  );
}

function MobileHeader() {
  const { title, isFicha } = usePageTitle();
  const openAdd = useDemo((s) => s.openAdd);
  return (
    <header className="sticky top-0 z-10 flex h-[52px] items-center gap-2.5 border-b border-border bg-bg/85 pr-3 pl-4 backdrop-blur-md desk:hidden">
      {isFicha ? (
        <Link
          href="/app/productos"
          aria-label="Volver a Mis productos"
          className="press -ml-2 grid size-9 place-items-center rounded-lg text-text"
        >
          <IconArrowLeft size={20} aria-hidden />
        </Link>
      ) : (
        <LogoMark />
      )}
      <span className="min-w-0 flex-1 truncate text-[15px] font-semibold">
        {isFicha ? "Producto" : title}
      </span>
      <ThemeButton />
      <Button
        onClick={openAdd}
        aria-label="Añadir producto"
        className="h-9 rounded-lg"
      >
        <IconPlus size={16} aria-hidden />
        Añadir
      </Button>
    </header>
  );
}

function MobileNav() {
  const path = usePathname();
  const activeCount = useActiveAlertCount();
  // Mobile uses the short labels and adds Settings at the end
  const items = [
    ...NAV.map((n) => ({ ...n, label: n.short })),
    {
      href: "/app/ajustes",
      label: "Ajustes",
      short: "Ajustes",
      icon: IconSettings,
    },
  ];
  return (
    <nav
      aria-label="Navegación principal"
      className="fixed inset-x-0 bottom-0 z-20 grid h-16 grid-cols-5 border-t border-border bg-surface/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-md desk:hidden"
    >
      {items.map((n) => {
        const active = isActive(path, n.href);
        const Ic = n.icon;
        return (
          <Link
            key={n.href}
            href={n.href}
            aria-current={active ? "page" : undefined}
            className={cx(
              "press relative flex flex-col items-center justify-center gap-[3px] text-[11px] font-medium",
              active ? "text-brand-text" : "text-text-2",
            )}
          >
            {active && (
              <motion.span
                layoutId="mobile-nav-active"
                className="absolute top-0 h-[2px] w-8 rounded-full bg-brand shadow-[0_0_10px_var(--glow)]"
                transition={{ type: "spring", duration: 0.35, bounce: 0.15 }}
              />
            )}
            <Ic size={22} aria-hidden />
            {n.label}
            {n.href === "/app/alertas" && activeCount > 0 && (
              <span className="absolute top-2 left-[calc(50%+6px)] grid h-4 min-w-4 place-items-center rounded-full bg-brand-solid px-1 text-[10px] font-semibold text-on-brand">
                {activeCount}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}

function Toaster() {
  const toast = useDemo((s) => s.toast);
  const hide = useDemo((s) => s.hideToast);

  // Hide the toast after a few seconds
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(hide, 2800);
    return () => clearTimeout(t);
  }, [toast, hide]);

  return (
    <div
      aria-live="polite"
      role="status"
      className="pointer-events-none fixed right-4 bottom-20 z-[60] desk:right-6 desk:bottom-6"
    >
      <AnimatePresence>
        {toast && (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, transform: "translateY(12px) scale(0.96)" }}
            animate={{ opacity: 1, transform: "translateY(0px) scale(1)" }}
            exit={{
              opacity: 0,
              transform: "translateY(6px) scale(0.98)",
              transition: { duration: 0.15 },
            }}
            transition={{ duration: 0.28, ease: [0.23, 1, 0.32, 1] }}
            className="flex max-w-[min(420px,calc(100vw-32px))] items-center gap-2.5 rounded-lg bg-toast-bg py-2.5 pr-3.5 pl-2.5 text-[13px] font-medium text-toast-text shadow-lg"
          >
            <ToastIcon isError={toast.tone === "error"} />
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Red cross for errors, green tick otherwise
function ToastIcon({ isError }: { isError: boolean }) {
  return (
    <span
      className={cx(
        "grid size-5 shrink-0 place-items-center rounded-full text-white",
        isError ? "bg-[#dc2626]" : "bg-[#16a34a]",
      )}
    >
      {isError ? (
        <IconX size={13} aria-hidden />
      ) : (
        <IconCheck size={13} aria-hidden />
      )}
    </span>
  );
}
