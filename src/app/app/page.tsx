"use client";

import Link from "next/link";
import { IconAlertTriangle, IconArrowDownRight, IconArrowRight, IconBell, IconPackage, IconPigMoney, IconPlus } from "@tabler/icons-react";
import { useLoading } from "@/components/app/shell";
import { Button, Card, CountUp, EmptyMark, enter, ProductThumb, ProgressBar, Skeleton } from "@/components/ui";
import { DROPS, FAILING_STORE, SUPPORTED_STORES } from "@/lib/demo-data";
import { eur, eurS, pct1, pctS, sinceLabel } from "@/lib/format";
import { distanceToTarget, leftToTarget, targetProgress } from "@/lib/insights";
import { useDemo, useIsAccount, useProducts } from "@/lib/store";

export default function PanelPage() {
  const loading = useLoading();
  const products = useProducts();
  const alerts = useDemo((s) => s.alerts);
  const openAdd = useDemo((s) => s.openAdd);
  const name = useDemo((s) => s.profile.name.split(" ")[0]);
  const empty = products.length === 0;

  const byId = Object.fromEntries(products.map((p) => [p.id, p]));
  // Active alerts that have not been reached yet, closest to the target first
  const withAlert = products.filter((p) => p.target && alerts[p.id] && p.alert !== "alcanzado");
  const near = [...withAlert].sort((a, b) => distanceToTarget(a) - distanceToTarget(b)).slice(0, 4);
  const closeOnes = withAlert.filter((p) => leftToTarget(p) < 5).length;
  const isAccount = useIsAccount();
  const lastCheck = useDemo((s) => s.lastCheckMinutes);
  // Demo: sample drops. Real account: products that dropped in the last 7 days, biggest first
  const drops: [string, string, string][] = isAccount
    ? products
        .filter((p) => p.ch < -0.05)
        .sort((a, b) => a.ch - b.ch)
        .slice(0, 6)
        .map((p) => [p.id, p.store, sinceLabel(p.checked)])
    : DROPS.filter(([id]) => byId[id]);
  const failing = products.filter((p) => p.lastError);
  const dropSum = products.reduce((acc, p) => acc + Math.max(0, p.prev7 - p.cur), 0);
  // "8 en Tecnología · 4 en Hogar": the two lists with more products
  const lists = useDemo((s) => s.lists);
  const listSummary =
    lists
      .map((l) => ({ name: l.name, count: products.filter((p) => p.list === l.id).length }))
      .filter((l) => l.count > 0)
      .sort((a, b) => b.count - a.count)
      .slice(0, 2)
      .map((l) => `${l.count} en ${l.name}`)
      .join(" · ") || "Todavía sin listas";

  return (
    <>
      <div {...enter(0, "flex flex-col gap-1")}>
        <h1 className="m-0 text-xl font-semibold tracking-[-0.015em]">Hola, {name}</h1>
        <p className="m-0 text-[13px] text-text-2">
          {isAccount ? `Última revisión de precios: ${sinceLabel(lastCheck)}` : "Última revisión de precios hace 6 min · 24 sep, 10:45"}
        </p>
      </div>

      {loading && <PanelSkeleton />}

      {!loading && empty && (
        <div {...enter(1, "flex flex-col items-center gap-2.5 rounded-xl border border-dashed border-border-strong bg-surface px-6 py-14 text-center")}>
          <EmptyMark />
          <h2 className="m-0 text-[17px] font-semibold">Aún no sigues ningún producto</h2>
          <p className="m-0 max-w-[420px] text-sm text-pretty text-text-2">
            {isAccount
              ? "Pega el enlace de la página de un producto. Guardaremos su histórico y te avisaremos cuando baje de tu precio objetivo."
              : "Pega el enlace de un producto o búscalo por su nombre. Guardaremos su histórico y te avisaremos cuando baje de tu precio objetivo."}
          </p>
          <Button size="md" onClick={openAdd} className="mt-2.5">
            <IconPlus size={15} aria-hidden />
            Añadir tu primer producto
          </Button>
          <p className="mt-1.5 mb-0 max-w-[460px] text-xs text-text-3">
            {isAccount
              ? "Funciona con las tiendas que publican los datos de sus productos, como IKEA. Algunas grandes, como Amazon o PcComponentes, no permiten leer sus páginas."
              : `Compatible con ${joinWithAnd(SUPPORTED_STORES)}.`}
          </p>
        </div>
      )}

      {!loading && !empty && (
        <>
          {(!isAccount || failing.length > 0) && (
            <div role="alert" {...enter(1, "flex flex-wrap items-start gap-2.5 rounded-lg border border-warn-border bg-warn-soft px-3.5 py-2.5 text-[13px]")}>
              <IconAlertTriangle size={17} className="mt-px text-warn" aria-hidden />
              <span className="min-w-[200px] flex-1">
                {isAccount ? (
                  <>
                    <strong className="font-semibold">
                      No hemos podido revisar {failing.length === 1 ? "1 producto" : `${failing.length} productos`}.
                    </strong>{" "}
                    {failing[0].lastError}
                  </>
                ) : (
                  <>
                    <strong className="font-semibold">No podemos revisar {FAILING_STORE} desde las 09:12.</strong> Los precios de 2
                    productos pueden no estar actualizados.
                  </>
                )}
              </span>
              <Link href="/app/tiendas" className="text-[13px] font-medium text-text underline decoration-warn/50 underline-offset-2 transition-colors hover:decoration-warn">
                Ver tiendas
              </Link>
            </div>
          )}

          <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-3">
            <Card {...enter(2, "flex flex-col gap-1.5 p-4")}>
              <div className="flex items-center gap-1.5 text-xs font-medium text-text-2">
                <IconPigMoney size={15} aria-hidden />
                {isAccount ? "Bajadas en 7 días" : "Ahorrado este mes"}
              </div>
              <div className="text-[28px] font-semibold tracking-[-0.025em]">
                <CountUp value={isAccount ? dropSum : 86} format={eur} />
              </div>
              <div className="text-xs text-text-3">
                {isAccount ? "Lo que han bajado en total tus productos esta semana" : "En 4 compras, frente al precio medio de 90 días"}
              </div>
            </Card>
            <StatLink i={3} href="/app/productos" icon={<IconPackage size={15} aria-hidden />} label="Productos seguidos" value={products.length}>
              {listSummary}
            </StatLink>
            <StatLink i={4} href="/app/alertas" icon={<IconBell size={15} aria-hidden />} label="Alertas activas" value={withAlert.length}>
              {closeOnes} a menos de 5 € del objetivo
            </StatLink>
          </div>

          <div className="grid grid-cols-[repeat(auto-fit,minmax(min(340px,100%),1fr))] items-start gap-4">
            <Card {...enter(5, "overflow-hidden")}>
              <div className="flex items-center justify-between border-b border-border px-4 py-3.5">
                <h2 className="m-0 text-sm font-semibold">Últimas bajadas de precio</h2>
                <span className="text-xs text-text-3">Últimos 7 días</span>
              </div>
              {drops.map(([id, store, when], i) => {
                const p = byId[id];
                return (
                  <Link
                    key={id}
                    href={`/app/productos/${id}`}
                    className={`row-accent flex items-center gap-3 px-4 py-2.5 text-text transition-colors hover:bg-surface-2 ${i ? "border-t border-border" : ""}`}
                  >
                    <ProductThumb icon={p.icon} image={p.image} />
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate text-[13px] font-medium">{p.name}</span>
                      <span className="text-xs text-text-3">
                        {store} · {when}
                      </span>
                    </span>
                    <span className="flex flex-col items-end gap-0.5">
                      <span className="flex items-baseline gap-1.5">
                        <s className="text-xs text-text-3">{eur(p.prev7)}</s>
                        <span className="text-[13px] font-semibold">{eur(p.cur)}</span>
                      </span>
                      <span className="inline-flex h-[18px] items-center gap-0.5 rounded bg-down-soft px-[5px] text-[11px] font-semibold text-down">
                        <IconArrowDownRight size={12} aria-hidden />
                        {pctS(p.ch)}
                      </span>
                    </span>
                  </Link>
                );
              })}
              {drops.length === 0 && <p className="m-0 p-4 text-[13px] text-text-2">Ninguno de tus productos ha bajado esta semana.</p>}
            </Card>
            <Card {...enter(6, "overflow-hidden")}>
              <div className="flex items-center justify-between border-b border-border px-4 py-3.5">
                <h2 className="m-0 text-sm font-semibold">Cerca de tu precio objetivo</h2>
                <Link href="/app/alertas" className="link-anim text-xs font-medium text-brand-text">
                  Ver alertas
                </Link>
              </div>
              {near.map((p, i) => (
                <Link
                  key={p.id}
                  href={`/app/productos/${p.id}`}
                  className={`row-accent flex flex-col gap-2 px-4 py-3 text-text transition-colors hover:bg-surface-2 ${i ? "border-t border-border" : ""}`}
                >
                  <span className="flex w-full items-baseline gap-2">
                    <span className="min-w-0 flex-1 truncate text-[13px] font-medium">{p.name}</span>
                    <span className="text-[13px] font-semibold">{eur(p.cur)}</span>
                    <IconArrowRight size={12} className="self-center text-text-3" aria-hidden />
                    <span className="text-[13px] font-semibold text-brand-text">{eurS(p.target!)}</span>
                  </span>
                  <ProgressBar value={targetProgress(p)} delay={0.3 + i * 0.06} />
                  <span className="text-xs text-text-3">
                    Faltan {eurS(leftToTarget(p))} · {pct1((leftToTarget(p) / p.cur) * 100)} %
                  </span>
                </Link>
              ))}
              {near.length === 0 && <p className="m-0 p-4 text-[13px] text-text-2">No tienes alertas activas.</p>}
            </Card>
          </div>
        </>
      )}
    </>
  );
}

// Joins ["A", "B", "C"] as "A, B y C"
function joinWithAnd(items: readonly string[]) {
  if (items.length < 2) return items.join("");
  return `${items.slice(0, -1).join(", ")} y ${items[items.length - 1]}`;
}

// Summary card that links to another page
function StatLink({ i, href, icon, label, value, children }: { i: number; href: string; icon: React.ReactNode; label: string; value: number; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      {...enter(i, "press lift surface-grad flex flex-col gap-1.5 rounded-[10px] border border-border bg-surface p-4 text-left text-text shadow-sm")}
    >
      <span className="flex items-center gap-1.5 text-xs font-medium text-text-2">
        {icon}
        {label}
      </span>
      <span className="text-[28px] font-semibold tracking-[-0.025em]">
        <CountUp value={value} />
      </span>
      <span className="text-xs text-text-3">{children}</span>
    </Link>
  );
}

function PanelSkeleton() {
  return (
    <>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-3" aria-busy="true" aria-label="Cargando resumen">
        {[1, 2, 3].map((k) => (
          <div key={k} className="flex flex-col gap-3 rounded-[10px] border border-border bg-surface p-4">
            <Skeleton className="h-3 w-[45%]" />
            <Skeleton className="h-[26px] w-3/5 rounded-md" />
            <Skeleton className="h-2.5 w-4/5" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(340px,100%),1fr))] gap-4">
        {[1, 2].map((k) => (
          <div key={k} className="flex flex-col gap-4 rounded-[10px] border border-border bg-surface p-4">
            <Skeleton className="h-3.5 w-2/5" />
            {[1, 2, 3, 4].map((x) => (
              <div key={x} className="flex items-center gap-3">
                <Skeleton className="size-8 rounded-lg" />
                <div className="flex flex-1 flex-col gap-1.5">
                  <Skeleton className="h-[11px] w-[70%]" />
                  <Skeleton className="h-[9px] w-2/5" />
                </div>
                <Skeleton className="h-3 w-14" />
              </div>
            ))}
          </div>
        ))}
      </div>
    </>
  );
}
