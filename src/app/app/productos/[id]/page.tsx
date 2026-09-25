"use client";

import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  IconAlertCircle,
  IconBrandTelegram,
  IconBuildingStore,
  IconCalendar,
  IconCheck,
  IconDots,
  IconExternalLink,
  IconMail,
  IconRefresh,
  IconTrash,
  IconTruckDelivery,
} from "@tabler/icons-react";
import { PriceChart } from "@/components/app/price-chart";
import { SelectMenu } from "@/components/select-menu";
import { useLoading } from "@/components/app/shell";
import { Button, Card, ChangeBadge, CountUp, cx, enter, ProductThumb, Segmented, Skeleton, Switch } from "@/components/ui";
import { RANGES, type RangeKey, type Chart } from "@/lib/chart";
import { minDate, rankOffers, shopsFor, type Product, type RankedOffer } from "@/lib/demo-data";
import { eur, eurS, parsePrice, pct1, pctS, r2, sinceLabel } from "@/lib/format";
import { useIsMobile } from "@/lib/hooks";
import { useDemo, useIsAccount } from "@/lib/store";

export default function FichaPage() {
  const { id } = useParams<{ id: string }>();
  const product = useDemo((s) => s.products.find((p) => p.id === decodeURIComponent(id)));
  const loading = useLoading();

  if (!product && loading) {
    return (
      <div className="flex flex-col gap-5" aria-busy="true" aria-label="Cargando el producto">
        <div className="flex items-start gap-4">
          <Skeleton className="size-[88px] rounded-xl" />
          <div className="flex flex-1 flex-col gap-2.5 pt-1">
            <Skeleton className="h-6 w-2/3" />
            <Skeleton className="h-3.5 w-1/2" />
          </div>
        </div>
        <Skeleton className="h-[420px] rounded-xl" />
      </div>
    );
  }
  if (!product) {
    return (
      <div className="flex flex-col items-center gap-3 py-20 text-center">
        <h1 className="m-0 text-xl font-semibold">No encontramos este producto</h1>
        <p className="m-0 text-sm text-text-2">Puede que lo hayas dejado de seguir.</p>
        <Link href="/app/productos" className="text-sm font-medium text-brand-text hover:underline">
          Volver a Mis productos
        </Link>
      </div>
    );
  }
  // The key resets the alert form state when switching products
  return <Ficha key={product.id} p={product} loading={loading} />;
}

// Column widths for the desktop store comparison table
const OFFER_COLS = "grid-cols-[minmax(170px,1.2fr)_88px_minmax(150px,1.5fr)_104px_96px_32px]";
const RANGE_KEYS: RangeKey[] = ["7D", "1M", "3M", "1A"];

// "7D" becomes "7 D" for the range buttons
const rangeButtonLabel = (key: RangeKey) => key.replace(/(\d)/, "$1 ");

// "229.5" becomes "229,5" for the price input
const toInputPrice = (value: number) => String(value).replace(".", ",");

function shippingLabel(shipCents: number | null) {
  if (shipCents === 0) return "Envío gratis";
  if (shipCents) return `Envío ${eur(shipCents / 100)}`;
  return "Consulta el envío en la tienda";
}

// Demo: several sample stores. Real account: the stores we got real offers from,
// or just the store of the URL being followed.
function buildOffers(p: Product, isAccount: boolean): RankedOffer[] {
  if (!isAccount) return rankOffers(shopsFor(p));

  if (p.offers?.length) {
    return rankOffers(
      p.offers.map((o) => ({
        name: o.store,
        price: o.price,
        // Ranked by final price, so add shipping when we know it
        ship: (o.shipCents ?? 0) / 100,
        shipL: shippingLabel(o.shipCents),
        eta: "—",
        url: o.url,
      })),
    );
  }

  if (p.lastError) return [{ name: p.store, error: true, best: false }];
  return [{ name: p.store, price: p.cur, ship: 0, total: p.cur, shipL: "Consulta el envío en la tienda", eta: "—", best: true }];
}

function Ficha({ p, loading }: { p: Product; loading: boolean }) {
  const mobile = useIsMobile();
  const storedOn = useDemo((s) => s.alerts[p.id]);
  const saveAlert = useDemo((s) => s.saveAlert);
  const showToast = useDemo((s) => s.showToast);
  const isAccount = useIsAccount();
  const checkNow = useDemo((s) => s.checkNow);
  const channels = useDemo((s) => s.channels);
  const setChannel = useDemo((s) => s.setChannel);
  const profile = useDemo((s) => s.profile);

  const [range, setRange] = useState<RangeKey>("3M");
  const [alertOn, setAlertOn] = useState<boolean>(storedOn ?? false);
  const [target, setTarget] = useState(toInputPrice(p.target ?? Math.round(p.cur * 0.9)));
  const [stats, setStats] = useState<Chart["stats"] | null>(null);
  const onStats = useCallback((s: Chart["stats"]) => setStats(s), []);

  // If the alert changes in the store (e.g. when the saved demo loads), sync the switch
  const [seenOn, setSeenOn] = useState(storedOn);
  if (seenOn !== storedOn) {
    setSeenOn(storedOn);
    setAlertOn(storedOn ?? false);
  }
  // Same for the saved target price
  const [seenTarget, setSeenTarget] = useState(p.target);
  if (seenTarget !== p.target) {
    setSeenTarget(p.target);
    setTarget(toInputPrice(p.target ?? Math.round(p.cur * 0.9)));
  }

  const tn = parsePrice(target);
  const valid = !isNaN(tn) && tn > 0;
  // How much the price still has to drop to reach the target
  const diff = valid ? r2(p.cur - tn) : 0;
  const offers = buildOffers(p, isAccount);

  let targetStatus = "Objetivo alcanzado";
  if (!alertOn) targetStatus = "Alerta pausada";
  else if (diff > 0) targetStatus = "Faltan " + eurS(diff);

  // Hint under the target input, and its colour
  let targetHint = "Está por encima del precio actual: te avisaremos en la próxima revisión";
  let targetHintColor = "var(--warn)";
  if (!valid) {
    targetHint = "Introduce un precio válido";
    targetHintColor = "var(--up)";
  } else if (diff > 0) {
    targetHint = `${eurS(diff)} menos que ahora (−${pct1((diff / p.cur) * 100)} %)`;
    targetHintColor = "var(--text-2)";
  }

  const retryStore = (name: string) => {
    if (isAccount) checkNow(p.id);
    else showToast(`Reintentando revisión de ${name}…`);
  };

  return (
    <>
      <div {...enter(0, "flex flex-wrap items-start gap-4")}>
        <ProductThumb icon={p.icon} image={p.image} size={88} radius={12} />
        <div className="flex min-w-[220px] flex-1 flex-col gap-2">
          <h1 className="m-0 text-[22px] leading-[1.2] font-semibold tracking-[-0.02em] text-balance">{p.name}</h1>
          <div className="flex flex-wrap items-center gap-x-3.5 gap-y-1.5 text-[13px] text-text-2">
            <ListPicker p={p} />
            <Meta icon={<IconCalendar size={14} aria-hidden />}>Seguido desde {p.since}</Meta>
            <Meta icon={<IconBuildingStore size={14} aria-hidden />}>{p.stores} tiendas</Meta>
            {p.simulated && (
              <span
                title="Catálogo de prueba: el producto y su precio de partida son reales; la evolución del precio está simulada."
                className="inline-flex h-[22px] items-center rounded-full border border-brand-soft-border bg-brand-soft px-2 text-xs font-medium text-brand-text"
              >
                Precio simulado
              </span>
            )}
            <Meta icon={<IconRefresh size={14} aria-hidden />}>
              Revisado {sinceLabel(p.checked)}
            </Meta>
          </div>
        </div>
        <div className="flex gap-2">
          <StoreLink p={p} className="press inline-flex h-8 items-center gap-1.5 rounded-md border border-border-strong bg-surface px-3 text-[13px] font-medium whitespace-nowrap text-text shadow-sm hover:bg-surface-2">
            Ver en {p.store}
            <IconExternalLink size={14} className="text-text-3" aria-hidden />
          </StoreLink>
          <ProductMenu p={p} />
        </div>
      </div>

      <div className="grid grid-cols-1 items-start gap-5 wide:grid-cols-[minmax(0,1fr)_340px]">
        <div className="flex min-w-0 flex-col gap-5">
          {/* Price and history */}
          <Card aria-label="Precio e histórico" {...enter(1, "rounded-xl")}>
            <div className="grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-x-6 gap-y-4 p-5">
              <div className="flex min-w-[190px] flex-col gap-1">
                <span className="text-xs font-medium text-text-2">Precio actual · {p.store}</span>
                <span className="text-[36px] leading-[1.1] font-semibold tracking-[-0.03em]">
                  <CountUp value={p.cur} format={eur} />
                </span>
                <span className="flex items-center gap-1.5 text-xs text-text-3">
                  <ChangeBadge ch={p.ch} />
                  en 7 días
                </span>
              </div>
              <div className="flex flex-col gap-1 pt-0.5">
                <span className="text-xs font-medium text-text-2">Mínimo histórico</span>
                <span className="flex items-center gap-[7px] text-xl font-semibold tracking-[-0.02em]">
                  <span className="size-[9px] rounded-full bg-brand shadow-[0_0_0_3px_var(--brand-soft)]" aria-hidden />
                  {eur(p.min)}
                </span>
                <span className="text-xs text-text-3">
                  {minDate(p)} · {p.store}
                </span>
              </div>
              <div className="flex flex-col gap-1 pt-0.5">
                <span className="text-xs font-medium text-text-2">Tu objetivo</span>
                <span className="text-xl font-semibold tracking-[-0.02em]">{valid ? eurS(tn) : "—"}</span>
                <span className="text-xs text-text-3">{targetStatus}</span>
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-5 pt-3.5">
              <div className="flex flex-wrap items-center gap-3.5 text-xs text-text-2">
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-0.5 w-3.5 rounded-[1px] bg-brand" />
                  Precio
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-3.5 border-t-2 border-dashed border-text-3" />
                  Objetivo
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="size-2 rounded-full bg-brand shadow-[0_0_0_2px_var(--brand-soft)]" />
                  Nadir
                </span>
              </div>
              <Segmented<RangeKey>
                label="Periodo de la gráfica"
                size="sm"
                value={range}
                onChange={setRange}
                options={RANGE_KEYS.map((key) => ({ value: key, label: rangeButtonLabel(key) }))}
              />
            </div>
            <div className="px-4 pt-3 pb-3.5">
              {loading ? (
                <Skeleton className="rounded-lg" style={{ height: mobile ? 220 : 280 }} />
              ) : (
                <PriceChart product={p} range={range} target={alertOn && valid ? tn : null} compact={mobile} onStats={onStats} />
              )}
            </div>
          </Card>

          {/* Store comparison */}
          <Card aria-labelledby="cmp-title" {...enter(2, "overflow-hidden rounded-xl")}>
            <div className="flex flex-wrap items-baseline justify-between gap-3 border-b border-border px-4 py-3.5">
              <h2 id="cmp-title" className="m-0 text-sm font-semibold">
                Comparativa de tiendas
              </h2>
              <span className="text-xs text-text-3">Ordenado por precio final con envío</span>
            </div>
            <div className="hidden overflow-x-auto desk:block">
              {/* Table roles so screen readers link each cell with its column */}
              <div role="table" aria-label="Comparativa de tiendas" className="min-w-[700px]">
                <div role="row" className={cx("grid h-[34px] items-center gap-3 bg-surface-2 px-4 text-xs font-medium text-text-3", OFFER_COLS)}>
                  <span role="columnheader">Tienda</span>
                  <span role="columnheader" className="text-right">
                    Precio
                  </span>
                  <span role="columnheader">Envío o recogida</span>
                  <span role="columnheader">Plazo</span>
                  <span role="columnheader" className="text-right">
                    Total
                  </span>
                  <span role="columnheader">
                    <span className="sr-only">Enlace</span>
                  </span>
                </div>
                {offers.map((s) =>
                  s.error ? (
                    <div key={s.name} role="row" className="flex min-h-12 flex-wrap items-center gap-3 border-t border-border px-4 py-2.5 text-[13px]">
                      <span role="cell" className="min-w-[120px] font-medium text-text-2">
                        {s.name}
                      </span>
                      <span role="cell" className="flex min-w-[220px] flex-1 items-center gap-1.5 text-up">
                        <IconAlertCircle size={15} aria-hidden />
                        {isAccount ? p.lastError : "No disponible. No hemos podido revisar esta tienda desde las 09:12."}
                      </span>
                      <span role="cell">
                        <Button variant="secondary" className="h-7 px-2.5 text-xs shadow-none" onClick={() => retryStore(s.name)}>
                          Reintentar
                        </Button>
                      </span>
                    </div>
                  ) : (
                    <div
                      key={s.name}
                      role="row"
                      className={cx(
                        "grid min-h-12 items-center gap-3 border-t border-border px-4 text-[13px]",
                        OFFER_COLS,
                        s.best && "bg-brand-soft",
                      )}
                    >
                      <span role="cell" className="flex items-center gap-2 font-medium">
                        {s.name}
                        {s.best && <BestTag />}
                      </span>
                      <span role="cell" className="text-right">
                        {eur(s.price!)}
                      </span>
                      <span role="cell" className="flex items-center gap-1.5 text-text-2">
                        {s.pickup ? (
                          <IconBuildingStore size={15} className="text-text-3" aria-hidden />
                        ) : (
                          <IconTruckDelivery size={15} className="text-text-3" aria-hidden />
                        )}
                        {s.shipL}
                      </span>
                      <span role="cell" className="text-text-2">
                        {s.eta}
                      </span>
                      <span role="cell" className="text-right font-semibold">
                        {eur(s.total!)}
                      </span>
                      <span role="cell">
                        <StoreLink
                          p={isAccount ? p : undefined}
                          href={s.url}
                          aria-label={"Ir a " + s.name}
                          className="grid size-7 place-items-center rounded-md text-text-3 transition-colors hover:bg-surface-3 hover:text-text"
                        >
                          <IconExternalLink size={15} aria-hidden />
                        </StoreLink>
                      </span>
                    </div>
                  ),
                )}
              </div>
            </div>
            <div className="desk:hidden">
              {offers.map((s, i) => (
                <div key={s.name} className={cx("flex flex-col gap-1 px-4 py-3", i > 0 && "border-t border-border", s.best && "bg-brand-soft")}>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-medium">{s.name}</span>
                    {s.best && <BestTag />}
                    <span className="flex-1" />
                    <span className="font-semibold">{s.error ? "—" : eur(s.total!)}</span>
                  </div>
                  {s.error ? (
                    <span className="text-xs text-up">{isAccount ? p.lastError : "No disponible desde las 09:12"}</span>
                  ) : (
                    <span className="text-xs text-text-3">
                      {eur(s.price!)} · {s.shipL} · {s.eta}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </Card>
        </div>

        <div className="flex min-w-0 flex-col gap-5">
          {/* Price alert */}
          <Card aria-labelledby="alert-title" {...enter(3, "rounded-xl")}>
            <div className="flex items-center gap-3 border-b border-border px-4 py-3.5">
              <div className="flex flex-1 flex-col">
                <h2 id="alert-title" className="m-0 text-sm font-semibold">
                  Alerta de precio
                </h2>
                <span className="text-xs text-text-3">
                  {alertOn ? "Activa · te avisaremos al bajar de " + (valid ? eurS(tn) : "—") : "Pausada"}
                </span>
              </div>
              <Switch on={alertOn} onChange={() => setAlertOn(!alertOn)} label="Activar alerta" />
            </div>
            <fieldset
              disabled={!alertOn}
              className="m-0 flex min-w-0 flex-col gap-4 border-0 px-4 pt-4 pb-4 transition-opacity duration-200"
              style={{ opacity: alertOn ? 1 : 0.5 }}
            >
              <div className="flex flex-col gap-1.5">
                <label htmlFor="target" className="text-xs font-medium text-text-2">
                  Avísame cuando baje de
                </label>
                <div className="flex h-11 items-center rounded-lg border border-border-strong bg-surface px-3 transition-colors focus-within:border-brand">
                  <input
                    id="target"
                    inputMode="decimal"
                    aria-describedby="target-hint"
                    aria-invalid={!valid}
                    value={target}
                    onChange={(e) => setTarget(e.target.value)}
                    className="min-w-0 flex-1 border-none bg-transparent text-xl font-semibold tracking-[-0.02em] outline-none"
                  />
                  <span className="text-base font-medium text-text-3">€</span>
                </div>
                <span id="target-hint" className="text-[13px]" style={{ color: targetHintColor }}>
                  {targetHint}
                </span>
              </div>
              {/* Quick target presets */}
              <div className="flex flex-wrap gap-1.5">
                {(
                  [
                    ["Mínimo histórico · " + eurS(p.min), p.min],
                    ["−5 %", Math.round(p.cur * 0.95)],
                    ["−10 %", Math.round(p.cur * 0.9)],
                  ] as [string, number][]
                ).map(([label, v]) => (
                  <button
                    key={label}
                    type="button"
                    onClick={() => setTarget(toInputPrice(v))}
                    className="press h-[26px] cursor-pointer rounded-full border border-border bg-surface-2 px-[9px] text-xs font-medium whitespace-nowrap text-text-2 hover:border-border-strong hover:text-text"
                  >
                    {label}
                  </button>
                ))}
              </div>
              <div className="flex flex-col gap-1">
                <span className="mb-1 text-xs font-medium text-text-2">Canales</span>
                {(
                  [
                    ["email", "Email", profile.email, IconMail],
                    ["telegram", "Telegram", isAccount ? "Próximamente" : "@aleix_demo", IconBrandTelegram],
                  ] as const
                ).map(([k, label, sub, Ic]) => {
                  const on = channels[k];
                  return (
                    <button
                      key={k}
                      type="button"
                      role="checkbox"
                      aria-checked={on}
                      onClick={() => setChannel(k, !on)}
                      className="-mx-2.5 flex min-h-11 cursor-pointer items-center gap-2.5 rounded-lg border-none bg-transparent px-2.5 py-2 text-left transition-colors hover:bg-surface-2"
                    >
                      <Ic size={18} className="text-text-2" aria-hidden />
                      <span className="flex min-w-0 flex-1 flex-col">
                        <span className="text-[13px] font-medium">{label}</span>
                        <span className="truncate text-xs text-text-3">{sub}</span>
                      </span>
                      <span
                        className={cx(
                          "grid size-[18px] place-items-center rounded-[5px] border-[1.5px] text-on-brand transition-colors duration-150",
                          on ? "border-brand-solid bg-brand-solid" : "border-border-strong bg-transparent",
                        )}
                      >
                        <IconCheck
                          size={12}
                          aria-hidden
                          className="transition-[opacity,transform] duration-150 ease-out-strong"
                          style={{ opacity: on ? 1 : 0, transform: on ? "scale(1)" : "scale(0.6)" }}
                        />
                      </span>
                    </button>
                  );
                })}
              </div>
            </fieldset>
            {/* Outside the fieldset: when the alert is off it still has to be saveable */}
            <div className="flex flex-col px-4 pb-4">
              <Button size="md" onClick={() => valid && saveAlert(p.id, tn, alertOn)} disabled={!valid}>
                Guardar alerta
              </Button>
            </div>
          </Card>

          {/* Stats for the selected range */}
          <Card aria-label="Estadísticas del periodo" {...enter(4, "flex flex-col gap-2.5 rounded-xl px-4 py-3.5")}>
            <h2 className="m-0 text-sm font-semibold">Resumen · {RANGES[range].label}</h2>
            {stats &&
              (
                [
                  ["Máximo", eur(stats.max.value), stats.max.date],
                  ["Media", eur(stats.avg), ""],
                  ["Mínimo", eur(stats.min.value), stats.min.date],
                  ["Variación", pctS(stats.change), ""],
                ] as const
              ).map(([label, value, date]) => (
                <div key={label} className="flex items-baseline gap-2 text-[13px]">
                  <span className="text-text-2">{label}</span>
                  <span className="flex-1 -translate-y-[3px] border-b border-dotted border-border-strong" />
                  <span className="font-semibold">{value}</span>
                  <span className="w-[46px] text-right text-xs text-text-3">{date}</span>
                </div>
              ))}
            {!stats && [1, 2, 3, 4].map((k) => <Skeleton key={k} className="h-3.5 w-full" />)}
          </Card>
        </div>
      </div>
    </>
  );
}

function Meta({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-[5px]">
      <span className="text-text-3">{icon}</span>
      {children}
    </span>
  );
}

function BestTag() {
  return (
    <span className="inline-flex h-5 items-center gap-[3px] rounded border border-brand-soft-border bg-brand-soft px-[7px] text-[11px] font-semibold text-brand-text">
      <IconCheck size={12} aria-hidden />
      Mejor
    </span>
  );
}

/** Link to the product in the store. In the demo it goes nowhere. */
function StoreLink({
  p,
  href,
  children,
  ...rest
}: {
  p?: Product;
  href?: string;
  children: React.ReactNode;
  className?: string;
  "aria-label"?: string;
}) {
  const target = href || p?.url;
  if (p && target && /^https?:/.test(target)) {
    return (
      <a href={target} target="_blank" rel="noopener noreferrer nofollow" {...rest}>
        {children}
      </a>
    );
  }
  // Demo: no real store page, so it's plain text instead of a link that goes nowhere
  return <span {...rest}>{children}</span>;
}

/** "..." menu: check the price now or stop following the product. */
function ProductMenu({ p }: { p: Product }) {
  const router = useRouter();
  const checkNow = useDemo((s) => s.checkNow);
  const deleteProduct = useDemo((s) => s.deleteProduct);
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState<"" | "check" | "delete">("");
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click or Escape
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // Delete needs two clicks: the first one asks for confirmation
  let deleteLabel = "Dejar de seguir";
  if (busy === "delete") deleteLabel = "Borrando…";
  else if (confirm) deleteLabel = "Pulsa otra vez para confirmar";

  const item = "flex w-full cursor-pointer items-center gap-2.5 rounded-md border-none bg-transparent px-2.5 py-2 text-left text-[13px] transition-colors hover:bg-surface-2 disabled:cursor-wait disabled:opacity-60";

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-label="Más opciones"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => {
          setOpen(!open);
          setConfirm(false);
        }}
        className="press grid size-8 cursor-pointer place-items-center rounded-md border border-border-strong bg-surface text-text-2 shadow-sm hover:bg-surface-2"
      >
        <IconDots size={16} aria-hidden />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            role="menu"
            initial={{ opacity: 0, transform: "scale(0.96) translateY(-4px)" }}
            animate={{ opacity: 1, transform: "scale(1) translateY(0px)" }}
            exit={{ opacity: 0, transform: "scale(0.98)", transition: { duration: 0.1 } }}
            transition={{ duration: 0.16, ease: [0.23, 1, 0.32, 1] }}
            style={{ transformOrigin: "top right" }}
            className="absolute top-10 right-0 z-20 flex w-56 flex-col rounded-lg border border-border bg-surface p-1 shadow-md"
          >
            <button
              type="button"
              role="menuitem"
              disabled={!!busy}
              className={item}
              onClick={async () => {
                setBusy("check");
                await checkNow(p.id);
                setBusy("");
                setOpen(false);
              }}
            >
              <IconRefresh size={16} className={cx("text-text-2", busy === "check" && "animate-spin")} aria-hidden />
              {busy === "check" ? "Revisando…" : "Revisar el precio ahora"}
            </button>
            <button
              type="button"
              role="menuitem"
              disabled={!!busy}
              className={cx(item, "text-up")}
              onClick={async () => {
                if (!confirm) {
                  setConfirm(true);
                  return;
                }
                setBusy("delete");
                const ok = await deleteProduct(p.id);
                setBusy("");
                if (ok) router.push("/app/productos");
              }}
            >
              <IconTrash size={16} aria-hidden />
              {deleteLabel}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Chip with the product's list. Picking another one moves the product there
function ListPicker({ p }: { p: Product }) {
  const lists = useDemo((s) => s.lists);
  const moveProduct = useDemo((s) => s.moveProduct);
  // "" stands for "no list"
  const options = [...lists.map((l) => ({ value: l.id, label: l.name, color: l.color })), { value: "", label: "Sin lista", color: "var(--text-3)" }];
  return (
    <SelectMenu
      label="Cambiar de lista"
      value={p.list ?? ""}
      onChange={(v) => moveProduct(p.id, v || null)}
      options={options}
      className="h-[22px] rounded-full bg-surface-3 px-2 text-xs font-medium text-text transition-colors hover:bg-border"
    />
  );
}
