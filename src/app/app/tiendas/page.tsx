"use client";

import { useState } from "react";
import { IconAlertCircle, IconRefresh } from "@tabler/icons-react";
import { Button, Card, cx, enter } from "@/components/ui";
import { STORES, type Product, type Store } from "@/lib/demo-data";
import { sinceLabel } from "@/lib/format";
import { useDemo, useIsAccount, useProducts, type Freq } from "@/lib/store";

const COLS = "grid-cols-[minmax(200px,1fr)_150px_170px_110px_110px]";

const FREQ_LABEL: Record<Freq, string> = { "15m": "cada 15 minutos", "1h": "cada hora", "6h": "cada 6 horas", "24h": "una vez al día" };

type StoreRow = Store & { errMsg?: string; ids?: string[] };

// Domain of a store link, e.g. "pccomponentes.com". Empty for Google Shopping links.
function domainOf(url: string | undefined): string {
  try {
    const host = new URL(url ?? "").hostname.replace(/^www\./, "");
    return host.startsWith("google.") ? "" : host;
  } catch {
    return "";
  }
}

// Real account: one row per store, built from the followed products.
// A product counts for every store in its price comparison, not only the one we follow.
function storesFromProducts(products: Product[]): StoreRow[] {
  const byStore = new Map<string, { products: Product[]; url?: string }>();
  const addTo = (store: string, p: Product, url?: string) => {
    const entry = byStore.get(store) ?? { products: [] };
    entry.products.push(p);
    // Keep the first link that gives us a real store domain
    if (!domainOf(entry.url)) entry.url = url;
    byStore.set(store, entry);
  };

  for (const p of products) {
    addTo(p.store, p, p.url);
    for (const offer of p.offers ?? []) {
      if (offer.store !== p.store) addTo(offer.store, p, offer.url);
    }
  }

  return [...byStore.entries()]
    .map(([name, { products: list, url }]) => {
      // Errors only happen on the store we actually check for each product
      const failing = list.filter((p) => p.store === name && p.lastError);
      const recent = Math.min(...list.map((p) => p.checked));
      return {
        name,
        domain: domainOf(url),
        count: list.length,
        last: sinceLabel(recent),
        time: failing.length ? `${failing.length} con error` : "Todo al día",
        resp: "—",
        error: failing.length > 0,
        errMsg: failing[0]?.lastError ?? undefined,
        ids: failing.map((p) => p.id),
      };
    })
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

export default function TiendasPage() {
  const showToast = useDemo((s) => s.showToast);
  const checkNow = useDemo((s) => s.checkNow);
  const products = useProducts();
  const freq = useDemo((s) => s.freq);
  const isAccount = useIsAccount();
  const [retrying, setRetrying] = useState<string | null>(null);
  const stores: StoreRow[] = isAccount
    ? storesFromProducts(products)
    : STORES.map((s) => ({ ...s, errMsg: "La tienda no responde (tiempo de espera agotado tras 30 s). Volveremos a intentarlo automáticamente en 10 min." }));
  const ok = stores.filter((s) => !s.error).length;

  // Real account: re-check the failing products. Demo: just show a toast.
  const retry = async (s: StoreRow) => {
    setRetrying(s.name);
    if (isAccount && s.ids?.length) {
      for (const id of s.ids) await checkNow(id);
      setRetrying(null);
      return;
    }
    showToast(`Reintentando revisión de ${s.name}…`);
    setTimeout(() => setRetrying(null), 1600);
  };

  return (
    <>
      <div {...enter(0, "flex flex-col gap-1")}>
        <h1 className="m-0 text-xl font-semibold tracking-[-0.015em]">Tiendas</h1>
        <p className="m-0 text-[13px] text-text-2">
          {ok} funcionando · {stores.length - ok} con errores · Revisión automática {isAccount ? FREQ_LABEL[freq] : "cada hora"}
        </p>
      </div>
      <Card {...enter(1, "overflow-x-auto")}>
        <div className="min-w-[760px]">
          <div className={cx("grid h-9 items-center gap-4 border-b border-border bg-surface-2 px-4 text-xs font-medium text-text-3", COLS)}>
            <span>Tienda</span>
            <span>Estado</span>
            <span>Última revisión</span>
            <span className="text-right">Productos</span>
            <span className="text-right">Respuesta</span>
          </div>
          {stores.map((s, i) => (
            <div key={s.name} className={cx(i > 0 && "border-t border-border")}>
              <div className={cx("grid items-center gap-4 px-4 py-3 text-[13px]", COLS)}>
                <span className="flex items-center gap-2.5">
                  <span className="grid size-[30px] place-items-center rounded-lg bg-surface-3 text-[13px] font-semibold text-text-2">{s.name[0]}</span>
                  <span className="flex flex-col">
                    <span className="font-medium">{s.name}</span>
                    <span className="text-xs text-text-3">{s.domain}</span>
                  </span>
                </span>
                <span>
                  <span
                    className={cx(
                      "inline-flex h-[22px] items-center gap-1.5 rounded-full px-2 text-xs font-medium",
                      s.error ? "bg-up-soft text-up" : "bg-down-soft text-down",
                    )}
                  >
                    <span className="relative size-1.5">
                      <span className="absolute inset-0 rounded-full bg-current" />
                      {!s.error && <span className="absolute inset-0 animate-ping rounded-full bg-current opacity-40 [animation-duration:2.4s]" />}
                    </span>
                    {s.error ? "Con errores" : "Funcionando"}
                  </span>
                </span>
                <span className="flex flex-col">
                  <span>{s.last}</span>
                  <span className="text-xs text-text-3">{s.time}</span>
                </span>
                <span className="text-right">{s.count}</span>
                <span className="text-right text-text-2">{s.resp}</span>
              </div>
              {s.error && (
                <div className="mx-4 mb-3 ml-14 flex flex-wrap items-center gap-2.5 rounded-lg bg-up-soft px-3 py-2.5 text-[13px]">
                  <IconAlertCircle size={16} className="text-up" aria-hidden />
                  <span className="min-w-[240px] flex-1">
                    {s.errMsg}
                  </span>
                  <Button variant="secondary" className="h-7 px-2.5 text-xs shadow-none" onClick={() => retry(s)} disabled={retrying === s.name}>
                    <IconRefresh size={13} aria-hidden className={cx(retrying === s.name && "animate-spin")} />
                    {retrying === s.name ? "Reintentando…" : "Reintentar ahora"}
                  </Button>
                </div>
              )}
            </div>
          ))}
          {stores.length === 0 && (
            <p className="m-0 p-6 text-center text-[13px] text-text-2">Las tiendas aparecerán aquí cuando sigas tu primer producto.</p>
          )}
        </div>
      </Card>
    </>
  );
}
