"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import {
  IconBell,
  IconBellOff,
  IconCircleCheck,
  IconCloudOff,
  IconPlayerPause,
  IconPlus,
  IconRefresh,
  IconSearch,
} from "@tabler/icons-react";
import { useLoading } from "@/components/app/shell";
import { SelectMenu } from "@/components/select-menu";
import { Button, ChangeBadge, changeColor, cx, EmptyMark, enter, ProductThumb, Segmented, Skeleton, Sparkline } from "@/components/ui";
import { minDate, type Product } from "@/lib/demo-data";
import { eur, eurS } from "@/lib/format";
import { alertBadge, sortProducts, type SortKey } from "@/lib/insights";
import { listName, NO_LIST, useDemo, useProducts, type ListFilter } from "@/lib/store";

// Shared column widths for the desktop table header, rows and skeletons
const COLS = "grid-cols-[minmax(240px,1fr)_108px_150px_124px_112px_164px]";
const SORT_OPTIONS = [
  { value: "drop", label: "Mayor bajada (7 d)" },
  { value: "near", label: "Más cerca del objetivo" },
  { value: "price", label: "Precio: de menor a mayor" },
  { value: "name", label: "Nombre" },
];

function inList(product: Product, filter: ListFilter) {
  if (filter === "Todas") return true;
  if (filter === NO_LIST) return product.list === null;
  return product.list === filter;
}

export default function ProductosPage() {
  const [retrying, setRetrying] = useState(false);
  const loading = useLoading() || retrying;
  const products = useProducts();
  const loadState = useDemo((s) => s.loadState);
  const setLoadState = useDemo((s) => s.setLoadState);
  const filter = useDemo((s) => s.filter);
  const setFilter = useDemo((s) => s.setFilter);
  const sort = useDemo((s) => s.sort);
  const setSort = useDemo((s) => s.setSort);
  const search = useDemo((s) => s.search);
  const setSearch = useDemo((s) => s.setSearch);
  const openAdd = useDemo((s) => s.openAdd);
  const lists = useDemo((s) => s.lists);
  const openListEditor = useDemo((s) => s.openListEditor);
  const errored = loadState === "error" && !loading;
  const empty = products.length === 0;

  // Filter by list and search text, then sort
  const query = search.trim().toLowerCase();
  const matches = products.filter((p) => inList(p, filter) && (!query || p.name.toLowerCase().includes(query)));
  const rows = sortProducts(matches, sort);
  const countIn = (list: ListFilter) => products.filter((p) => inList(p, list)).length;

  // Filter buttons: all products, each list, and "Sin lista" only if some product has none
  const filterOptions = [
    { value: "Todas", label: "Todas", count: products.length },
    ...lists.map((l) => ({ value: l.id, label: l.name, count: countIn(l.id) })),
  ];
  if (countIn(NO_LIST) > 0) filterOptions.push({ value: NO_LIST, label: "Sin lista", count: countIn(NO_LIST) });
  const ready = !loading && !errored && !empty;

  // "Retry": show the loading state for a moment, then the data
  const retry = () => {
    setLoadState("normal");
    setRetrying(true);
    setTimeout(() => setRetrying(false), 900);
  };

  return (
    <>
      <div {...enter(0, "flex items-baseline gap-2")}>
        <h1 className="m-0 text-xl font-semibold tracking-[-0.015em]">Mis productos</h1>
        <span className="text-sm text-text-3">{rows.length}</span>
      </div>

      <label {...enter(1, "relative flex items-center desk:hidden")}>
        <IconSearch size={16} className="absolute left-3 text-text-3" aria-hidden />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar en mis productos"
          aria-label="Buscar en mis productos"
          className="h-11 w-full rounded-lg border border-border bg-surface pr-3 pl-9 text-[15px] placeholder:text-text-3"
        />
      </label>

      <div {...enter(1, "flex flex-wrap items-center gap-3")}>
        <Segmented<ListFilter>
          label="Filtrar por lista"
          value={filter}
          onChange={setFilter}
          options={filterOptions}
        />
        <Button variant="ghost" onClick={() => openListEditor("new")} aria-label="Nueva lista" title="Nueva lista">
          <IconPlus size={15} aria-hidden />
          <span className="desk:hidden">Lista</span>
        </Button>
        <div className="flex-1" />
        <div className="inline-flex items-center gap-2 text-[13px] text-text-2">
          <span aria-hidden>Ordenar por</span>
          <SelectMenu
            label="Ordenar por"
            value={sort}
            onChange={(v) => setSort(v as SortKey)}
            options={SORT_OPTIONS}
            className="h-9 rounded-md border border-border-strong bg-surface px-2.5 text-[13px] text-text transition-colors hover:border-brand-soft-border desk:h-7"
          />
        </div>
      </div>

      {errored && (
        <div role="alert" {...enter(2, "flex flex-col items-center gap-2 rounded-[10px] border border-border bg-surface px-6 py-10 text-center")}>
          <span className="mb-1 grid size-11 place-items-center rounded-xl bg-up-soft text-up">
            <IconCloudOff size={22} aria-hidden />
          </span>
          <h2 className="m-0 text-base font-semibold">No hemos podido cargar tus productos</h2>
          <p className="m-0 max-w-[400px] text-[13px] text-text-2">
            El servidor ha tardado demasiado en responder. Tus alertas siguen activas y se enviarán con normalidad.
          </p>
          <Button variant="secondary" onClick={retry} className="mt-2">
            <IconRefresh size={15} aria-hidden />
            Reintentar
          </Button>
        </div>
      )}

      {!loading && !errored && empty && (
        <div {...enter(2, "flex flex-col items-center gap-2.5 rounded-xl border border-dashed border-border-strong bg-surface px-6 py-14 text-center")}>
          <EmptyMark />
          <h2 className="m-0 text-[17px] font-semibold">Aún no sigues ningún producto</h2>
          <p className="m-0 max-w-[420px] text-sm text-text-2">Añade el primero y empezaremos a guardar su histórico de precios.</p>
          <Button size="md" onClick={openAdd} className="mt-2.5">
            <IconPlus size={15} aria-hidden />
            Añadir tu primer producto
          </Button>
        </div>
      )}

      {/* Desktop: table */}
      {!errored && !empty && (
        <div {...enter(2, "hidden overflow-x-auto rounded-[10px] border border-border bg-surface shadow-sm desk:block")}>
          <div role="table" aria-label="Mis productos" className="min-w-[920px]">
            <div
              role="row"
              className={cx("grid h-9 items-center gap-4 border-b border-border bg-surface-2 px-4 text-xs font-medium text-text-3", COLS)}
            >
              <span role="columnheader">Producto</span>
              <span role="columnheader" className="text-right">
                Precio actual
              </span>
              <span role="columnheader">7 días</span>
              <span role="columnheader">Mínimo histórico</span>
              <span role="columnheader">Mejor tienda</span>
              <span role="columnheader">Alerta</span>
            </div>
            {loading && [1, 2, 3, 4, 5, 6].map((k) => <RowSkeleton key={k} />)}
            {ready && rows.map((p, i) => <ProductRow key={p.id} p={p} i={i} />)}
          </div>
        </div>
      )}

      {/* Mobile: list */}
      {!errored && !empty && (
        <div {...enter(2, "overflow-hidden rounded-[10px] border border-border bg-surface desk:hidden")}>
          {loading &&
            [1, 2, 3, 4, 5, 6].map((k) => (
              <div key={k} className="flex gap-3 border-t border-border p-3.5 first:border-t-0">
                <Skeleton className="size-10 rounded-lg" />
                <div className="flex flex-1 flex-col gap-2">
                  <Skeleton className="h-3 w-3/4" />
                  <Skeleton className="h-2.5 w-[45%]" />
                </div>
              </div>
            ))}
          {ready &&
            rows.map((p, i) => (
              <Link
                key={p.id}
                href={`/app/productos/${p.id}`}
                className={cx("row-accent flex min-h-16 items-center gap-3 px-3.5 py-3 text-text active:bg-surface-2", i > 0 && "border-t border-border")}
              >
                <ProductThumb icon={p.icon} image={p.image} size={52} radius={10} />
                <span className="flex min-w-0 flex-1 flex-col gap-1">
                  <span className="truncate text-sm font-medium">{p.name}</span>
                  <span className="flex items-center gap-2 text-xs text-text-3">
                    <Sparkline values={p.series.slice(-8)} color={changeColor(p.ch)} w={44} h={16} strokeWidth={2} />
                    <span>Mín. {eur(p.min)}</span>
                  </span>
                </span>
                <span className="flex flex-col items-end gap-1">
                  <span className="text-sm font-semibold">{eur(p.cur)}</span>
                  <ChangeBadge ch={p.ch} size="sm" />
                </span>
              </Link>
            ))}
        </div>
      )}

      {ready && rows.length === 0 && (
        <p className="m-0 p-8 text-center text-[13px] text-text-2">
          {search.trim() ? `No hay productos que coincidan con «${search}».` : "Esta lista todavía no tiene productos."}
        </p>
      )}
    </>
  );
}

/** Clickable table row (also works with Enter / Space). */
function ProductRow({ p, i }: { p: Product; i: number }) {
  const lists = useDemo((s) => s.lists);
  const router = useRouter();
  const on = useDemo((s) => s.alerts[p.id]);
  const open = () => router.push(`/app/productos/${p.id}`);
  // Stagger the entry animation, capped so long lists don't wait too much
  const delay = Math.min(i, 10) * 25;
  return (
    <div
      role="row"
      tabIndex={0}
      onClick={open}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          open();
        }
      }}
      className={cx("row-accent grid cursor-pointer items-center gap-4 border-t border-border px-4 py-2.5 transition-colors hover:bg-surface-2", COLS)}
      style={{ animation: `enter 320ms var(--ease-out-strong) ${delay}ms both` }}
    >
      <div role="cell" className="flex min-w-0 items-center gap-3">
        <ProductThumb icon={p.icon} image={p.image} size={44} />
        <span className="flex min-w-0 flex-col">
          <span className="truncate text-[13px] font-medium">{p.name}</span>
          <span className="text-xs text-text-3">
            {listName(lists, p.list)} · {p.stores} tiendas
          </span>
        </span>
      </div>
      <div role="cell" className="text-right text-[13px] font-semibold">
        {eur(p.cur)}
      </div>
      <div role="cell" className="flex items-center gap-2.5">
        <Sparkline values={p.series.slice(-8)} color={changeColor(p.ch)} />
        <ChangeBadge ch={p.ch} />
      </div>
      <div role="cell" className="flex flex-col">
        <span className="text-[13px]">{eur(p.min)}</span>
        <span className="text-xs text-text-3">{minDate(p)}</span>
      </div>
      <div role="cell" className="text-[13px]">
        {p.store}
      </div>
      <div role="cell">
        <AlertPill p={p} on={on} />
      </div>
    </div>
  );
}

/** Alert status pill: reached, active, paused or none. */
function AlertPill({ p, on }: { p: Product; on: boolean | undefined }) {
  const status = alertBadge(p, on);
  const pill = {
    alcanzado: { label: "Objetivo alcanzado", className: "bg-down-soft text-down", Icon: IconCircleCheck },
    activa: { label: "Activa · " + (p.target ? eurS(p.target) : ""), className: "bg-brand-soft text-brand-text", Icon: IconBell },
    pausada: { label: "Pausada", className: "bg-surface-3 text-text-2", Icon: IconPlayerPause },
    none: { label: "Sin alerta", className: "bg-transparent text-text-3", Icon: IconBellOff },
  }[status];
  return (
    <span className={cx("inline-flex h-[22px] items-center gap-[5px] rounded-full px-2 text-xs font-medium whitespace-nowrap", pill.className)}>
      <pill.Icon size={13} aria-hidden />
      {pill.label}
    </span>
  );
}

function RowSkeleton() {
  return (
    <div className={cx("grid items-center gap-4 border-t border-border px-4 py-3", COLS)}>
      <div className="flex items-center gap-3">
        <Skeleton className="size-9 rounded-lg" />
        <div className="flex flex-1 flex-col gap-1.5">
          <Skeleton className="h-[11px] w-[70%]" />
          <Skeleton className="h-[9px] w-[35%]" />
        </div>
      </div>
      <Skeleton className="ml-auto h-3 w-[70px]" />
      <Skeleton className="h-[18px] w-[120px]" />
      <Skeleton className="h-3 w-20" />
      <Skeleton className="h-3 w-[70px]" />
      <Skeleton className="h-5 w-[110px]" />
    </div>
  );
}
