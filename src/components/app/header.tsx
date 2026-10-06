"use client";

// Top bars of the app: page title, search, theme button and "add product".
// The desktop and mobile versions are different components.
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { IconArrowLeft, IconChevronRight, IconMoon, IconPlus, IconSearch, IconSun } from "@tabler/icons-react";
import { useDemo } from "@/lib/store";
import { useTheme } from "@/components/theme";
import { Button, LogoMark } from "@/components/ui";

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

export function DesktopHeader() {
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

export function MobileHeader() {
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
