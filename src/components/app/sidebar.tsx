"use client";

// Desktop sidebar: menu, the user's lists, demo savings card and the profile link
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";
import { IconPencil, IconPigMoney, IconPlus, IconSelector } from "@tabler/icons-react";
import { useDemo, useIsAccount, useProducts } from "@/lib/store";
import { cx, Logo } from "@/components/ui";
import { Avatar } from "./avatar";
import { isActive, NAV, useActiveAlertCount } from "./nav-items";

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

export function Sidebar() {
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
