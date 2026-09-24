"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  IconArrowLeft,
  IconBell,
  IconBuildingStore,
  IconCheck,
  IconEye,
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
} from "@tabler/icons-react";
import { useDemo, useProducts, type LoadState } from "@/lib/store";
import { useTheme } from "@/components/theme";
import { Button, cx, Logo, LogoMark } from "@/components/ui";
import { AddProductModal } from "./add-product";

const NAV = [
  { href: "/app", label: "Panel", short: "Panel", icon: IconLayoutDashboard },
  { href: "/app/productos", label: "Mis productos", short: "Productos", icon: IconPackage },
  { href: "/app/alertas", label: "Alertas", short: "Alertas", icon: IconBell },
  { href: "/app/tiendas", label: "Tiendas", short: "Tiendas", icon: IconBuildingStore },
];

const LISTS = [
  { name: "Tecnología" as const, dot: "#2563eb" },
  { name: "Hogar" as const, dot: "#0d9488" },
];

const isActive = (path: string, href: string) => (href === "/app" ? path === "/app" : path.startsWith(href));

export function AppShell({ children }: { children: ReactNode }) {
  const params = useSearchParams();
  const embed = params.get("embed") === "1";
  const setLoadState = useDemo((s) => s.setLoadState);
  const [booting, setBooting] = useState(!embed);

  // Carga inicial: recupera la demo guardada y enseña los esqueletos un momento.
  // ?estado=vacio|cargando|error permite ver cada estado de la interfaz.
  useEffect(() => {
    useDemo.persist.rehydrate();
    const e = params.get("estado") as LoadState | null;
    if (e) setLoadState(e);
    if (embed) return;
    const t = setTimeout(() => setBooting(false), 650);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <BootContext booting={booting}>
      <div className="flex min-h-screen flex-col bg-bg text-text">
        {!embed && <DemoBanner />}
        <div className="flex min-h-0 flex-1">
          <Sidebar />
          <main className="flex min-w-0 flex-1 flex-col">
            <DesktopHeader />
            <MobileHeader />
            <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-5 px-4 pt-4 pb-24 desk:px-8 desk:pt-7 desk:pb-14">
              {children}
            </div>
          </main>
        </div>
        <MobileNav />
        <AddProductModal />
        <Toaster />
      </div>
    </BootContext>
  );
}

/* El arranque va en un contexto y no en el store, para que no se guarde. */
const Boot = createContext(false);
function BootContext({ booting, children }: { booting: boolean; children: ReactNode }) {
  return <Boot.Provider value={booting}>{children}</Boot.Provider>;
}
/** true mientras se "cargan" los datos (arranque o estado de carga forzado). */
export function useLoading() {
  const booting = useContext(Boot);
  const loadState = useDemo((s) => s.loadState);
  return booting || loadState === "cargando";
}

function DemoBanner() {
  return (
    <div
      role="status"
      className="flex min-h-8 items-center justify-center gap-2 border-b border-border bg-surface-2 px-3 py-1.5 text-center text-xs text-text-2"
    >
      <IconEye size={14} aria-hidden />
      <span>Estás viendo una cuenta de demostración</span>
      <span className="hidden text-text-3 desk:inline">(precios orientativos)</span>
      <span className="text-text-3" aria-hidden>
        ·
      </span>
      <Link href="/entrar?modo=registro" className="font-medium text-brand-text hover:underline">
        Crear cuenta
      </Link>
    </div>
  );
}

function Sidebar() {
  const path = usePathname();
  const products = useProducts();
  const alerts = useDemo((s) => s.alerts);
  const filter = useDemo((s) => s.filter);
  const setFilter = useDemo((s) => s.setFilter);
  const profile = useDemo((s) => s.profile);
  const activeCount = products.filter((p) => alerts[p.id] && p.alert !== "alcanzado").length;
  const onProducts = path === "/app/productos";

  const counts: Record<string, string> = {
    "/app/productos": String(products.length),
    "/app/alertas": String(activeCount),
  };

  return (
    <div className="hidden w-[244px] shrink-0 border-r border-border bg-surface-2 desk:block">
      <aside aria-label="Navegación principal" className="sticky top-0 flex h-screen flex-col gap-5 overflow-y-auto px-3 py-3.5">
        <Link href="/" aria-label="Nadir, inicio" className="flex items-center px-2 py-1 text-text">
          <Logo />
        </Link>
        <nav className="flex flex-col gap-0.5">
          {NAV.map((n) => {
            // En "Mis productos" filtrado por lista, se resalta la lista y no el menú
            const a = isActive(path, n.href) && !(n.href === "/app/productos" && onProducts && filter !== "Todas");
            const Ic = n.icon;
            return (
              <Link
                key={n.href}
                href={n.href}
                onClick={() => n.href === "/app/productos" && setFilter("Todas")}
                aria-current={a ? "page" : undefined}
                className={cx(
                  "press relative flex h-8 items-center gap-2.5 rounded-md px-2 text-[13px] font-medium",
                  a ? "text-text" : "text-text-2 hover:bg-surface-3 hover:text-text",
                )}
              >
                {a && (
                  <motion.span
                    layoutId="nav-active"
                    className="absolute inset-0 rounded-md bg-surface-3"
                    transition={{ type: "spring", duration: 0.35, bounce: 0.1 }}
                  />
                )}
                <Ic size={17} aria-hidden className="relative" />
                <span className="relative flex-1">{n.label}</span>
                {n.href === "/app/tiendas" && (
                  <span title="1 tienda con errores" className="relative size-1.5 rounded-full bg-up" />
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
          <div className="px-2 pb-1.5 text-[11px] font-semibold tracking-[.04em] text-text-3 uppercase">Listas</div>
          {LISTS.map((l) => {
            const a = onProducts && filter === l.name;
            return (
              <Link
                key={l.name}
                href="/app/productos"
                onClick={() => setFilter(l.name)}
                className={cx(
                  "press relative flex h-[30px] items-center gap-2.5 rounded-md px-2 text-[13px] font-medium",
                  a ? "text-text" : "text-text-2 hover:bg-surface-3 hover:text-text",
                )}
              >
                {a && (
                  <motion.span
                    layoutId="nav-active"
                    className="absolute inset-0 rounded-md bg-surface-3"
                    transition={{ type: "spring", duration: 0.35, bounce: 0.1 }}
                  />
                )}
                <span className="relative mx-1 size-2 rounded-[2px]" style={{ background: l.dot }} />
                <span className="relative flex-1">{l.name}</span>
                <span className="relative text-xs text-text-3">{products.filter((p) => p.list === l.name).length}</span>
              </Link>
            );
          })}
        </div>
        <div className="flex-1" />
        {products.length > 0 && (
          <div className="flex flex-col gap-1.5 rounded-[10px] border border-border bg-surface p-3">
            <div className="flex items-center gap-1.5 text-xs text-text-2">
              <IconPigMoney size={15} className="text-brand" aria-hidden />
              Este mes has ahorrado
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-[22px] font-semibold tracking-[-0.02em]">86 €</span>
              <span className="text-xs text-text-3">en 4 compras</span>
            </div>
          </div>
        )}
        <Link href="/app/ajustes" className="press flex items-center gap-2.5 rounded-lg p-2 text-left hover:bg-surface-3">
          <span className="grid size-[30px] place-items-center rounded-full bg-brand-soft text-xs font-semibold text-brand-text">
            {initials(profile.name)}
          </span>
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="truncate text-[13px] font-medium">{profile.name}</span>
            <span className="text-xs text-text-3">Plan gratuito</span>
          </span>
          <IconSelector size={15} className="text-text-3" aria-hidden />
        </Link>
      </aside>
    </div>
  );
}

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");

/** Título de la cabecera según la ruta. */
function usePageTitle() {
  const path = usePathname();
  const products = useDemo((s) => s.products);
  if (path.startsWith("/app/productos/")) {
    const id = decodeURIComponent(path.split("/")[3] ?? "");
    return { title: products.find((p) => p.id === id)?.name ?? "Producto", isFicha: true };
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
  const label = theme === "dark" ? "Cambiar a tema claro" : "Cambiar a tema oscuro";
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
          {theme === "dark" ? <IconSun size={16} aria-hidden /> : <IconMoon size={16} aria-hidden />}
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
            <Link href="/app/productos" className="-ml-1.5 rounded-md px-1.5 py-1 whitespace-nowrap text-text-2 hover:bg-surface-3 hover:text-text">
              Mis productos
            </Link>
            <IconChevronRight size={14} className="text-text-3" aria-hidden />
          </>
        )}
        <span className="truncate font-semibold">{title}</span>
      </div>
      <label className="relative flex w-[260px] min-w-[140px] shrink items-center">
        <IconSearch size={15} className="absolute left-2.5 text-text-3" aria-hidden />
        <input
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
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
        <Link href="/app/productos" aria-label="Volver a Mis productos" className="press -ml-2 grid size-9 place-items-center rounded-lg text-text">
          <IconArrowLeft size={20} aria-hidden />
        </Link>
      ) : (
        <LogoMark />
      )}
      <span className="min-w-0 flex-1 truncate text-[15px] font-semibold">{isFicha ? "Producto" : title}</span>
      <ThemeButton />
      <Button onClick={openAdd} aria-label="Añadir producto" className="h-9 rounded-lg">
        <IconPlus size={16} aria-hidden />
        Añadir
      </Button>
    </header>
  );
}

function MobileNav() {
  const path = usePathname();
  const products = useProducts();
  const alerts = useDemo((s) => s.alerts);
  const activeCount = products.filter((p) => alerts[p.id] && p.alert !== "alcanzado").length;
  const items = [
    ...NAV.map((n) => ({ ...n, label: n.short })),
    { href: "/app/ajustes", label: "Ajustes", short: "Ajustes", icon: IconSettings },
  ];
  return (
    <nav
      aria-label="Navegación principal"
      className="fixed inset-x-0 bottom-0 z-20 grid h-16 grid-cols-5 border-t border-border bg-surface/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-md desk:hidden"
    >
      {items.map((n) => {
        const a = isActive(path, n.href);
        const Ic = n.icon;
        return (
          <Link
            key={n.href}
            href={n.href}
            aria-current={a ? "page" : undefined}
            className={cx(
              "press relative flex flex-col items-center justify-center gap-[3px] text-[11px] font-medium",
              a ? "text-brand-text" : "text-text-2",
            )}
          >
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

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(hide, 2800);
    return () => clearTimeout(t);
  }, [toast, hide]);

  return (
    <div aria-live="polite" role="status" className="pointer-events-none fixed right-4 bottom-20 z-[60] desk:right-6 desk:bottom-6">
      <AnimatePresence>
        {toast && (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, transform: "translateY(12px) scale(0.96)" }}
            animate={{ opacity: 1, transform: "translateY(0px) scale(1)" }}
            exit={{ opacity: 0, transform: "translateY(6px) scale(0.98)", transition: { duration: 0.15 } }}
            transition={{ duration: 0.28, ease: [0.23, 1, 0.32, 1] }}
            className="flex items-center gap-2.5 rounded-lg bg-toast-bg py-2.5 pr-3.5 pl-2.5 text-[13px] font-medium text-toast-text shadow-lg"
          >
            <span className="grid size-5 place-items-center rounded-full bg-[#16a34a] text-white">
              <IconCheck size={13} aria-hidden />
            </span>
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
