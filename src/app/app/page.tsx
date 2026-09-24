"use client";

import Link from "next/link";
import { IconAlertTriangle, IconArrowDownRight, IconArrowRight, IconBell, IconPackage, IconPigMoney, IconPlus } from "@tabler/icons-react";
import { useLoading } from "@/components/app/shell";
import { Button, Card, EmptyMark, enter, ProductThumb, ProgressBar, Skeleton } from "@/components/ui";
import { DROPS, FAILING_STORE, SUPPORTED_STORES } from "@/lib/demo-data";
import { eur, eurS, pct1, pctS } from "@/lib/format";
import { distanceToTarget, leftToTarget, targetProgress } from "@/lib/insights";
import { useDemo, useProducts } from "@/lib/store";

export default function PanelPage() {
  const loading = useLoading();
  const products = useProducts();
  const alerts = useDemo((s) => s.alerts);
  const openAdd = useDemo((s) => s.openAdd);
  const name = useDemo((s) => s.profile.name.split(" ")[0]);
  const empty = products.length === 0;

  const byId = Object.fromEntries(products.map((p) => [p.id, p]));
  const withAlert = products.filter((p) => p.target && alerts[p.id] && p.alert !== "alcanzado");
  const near = [...withAlert].sort((a, b) => distanceToTarget(a) - distanceToTarget(b)).slice(0, 4);
  const closeOnes = withAlert.filter((p) => leftToTarget(p) < 5).length;
  const drops = DROPS.filter(([id]) => byId[id]);
  const tech = products.filter((p) => p.list === "Tecnología").length;

  return (
    <>
      <div {...enter(0, "flex flex-col gap-1")}>
        <h1 className="m-0 text-xl font-semibold tracking-[-0.015em]">Hola, {name}</h1>
        <p className="m-0 text-[13px] text-text-2">Última revisión de precios hace 6 min · 24 sep, 10:45</p>
      </div>

      {loading && <PanelSkeleton />}

      {!loading && empty && (
        <div {...enter(1, "flex flex-col items-center gap-2.5 rounded-xl border border-dashed border-border-strong bg-surface px-6 py-14 text-center")}>
          <EmptyMark />
          <h2 className="m-0 text-[17px] font-semibold">Aún no sigues ningún producto</h2>
          <p className="m-0 max-w-[420px] text-sm text-pretty text-text-2">
            Pega el enlace de un producto o búscalo por su nombre. Guardaremos su histórico y te avisaremos cuando baje de tu
            precio objetivo.
          </p>
          <Button size="md" onClick={openAdd} className="mt-2.5">
            <IconPlus size={15} aria-hidden />
            Añadir tu primer producto
          </Button>
          <p className="mt-1.5 mb-0 text-xs text-text-3">Compatible con {SUPPORTED_STORES.join(", ").replace(/, ([^,]*)$/, " y $1")}.</p>
        </div>
      )}

      {!loading && !empty && (
        <>
          <div role="alert" {...enter(1, "flex flex-wrap items-start gap-2.5 rounded-lg border border-warn-border bg-warn-soft px-3.5 py-2.5 text-[13px]")}>
            <IconAlertTriangle size={17} className="mt-px text-warn" aria-hidden />
            <span className="min-w-[200px] flex-1">
              <strong className="font-semibold">No podemos revisar {FAILING_STORE} desde las 09:12.</strong> Los precios de 2 productos pueden
              no estar actualizados.
            </span>
            <Link href="/app/tiendas" className="text-[13px] font-medium text-text underline">
              Ver tiendas
            </Link>
          </div>

          <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-3">
            <Card {...enter(2, "flex flex-col gap-1.5 p-4")}>
              <div className="flex items-center gap-1.5 text-xs font-medium text-text-2">
                <IconPigMoney size={15} aria-hidden />
                Ahorrado este mes
              </div>
              <div className="text-[28px] font-semibold tracking-[-0.025em]">86,00 €</div>
              <div className="text-xs text-text-3">En 4 compras, frente al precio medio de 90 días</div>
            </Card>
            <StatLink i={3} href="/app/productos" icon={<IconPackage size={15} aria-hidden />} label="Productos seguidos" value={products.length}>
              {tech} en Tecnología · {products.length - tech} en Hogar
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
                    className={`flex items-center gap-3 px-4 py-2.5 text-text transition-colors hover:bg-surface-2 ${i ? "border-t border-border" : ""}`}
                  >
                    <ProductThumb icon={p.icon} />
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
            </Card>
            <Card {...enter(6, "overflow-hidden")}>
              <div className="flex items-center justify-between border-b border-border px-4 py-3.5">
                <h2 className="m-0 text-sm font-semibold">Cerca de tu precio objetivo</h2>
                <Link href="/app/alertas" className="text-xs font-medium text-brand-text hover:underline">
                  Ver alertas
                </Link>
              </div>
              {near.map((p, i) => (
                <Link
                  key={p.id}
                  href={`/app/productos/${p.id}`}
                  className={`flex flex-col gap-2 px-4 py-3 text-text transition-colors hover:bg-surface-2 ${i ? "border-t border-border" : ""}`}
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

function StatLink({ i, href, icon, label, value, children }: { i: number; href: string; icon: React.ReactNode; label: string; value: number; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      {...enter(i, "press flex flex-col gap-1.5 rounded-[10px] border border-border bg-surface p-4 text-left text-text shadow-sm hover:border-border-strong")}
    >
      <span className="flex items-center gap-1.5 text-xs font-medium text-text-2">
        {icon}
        {label}
      </span>
      <span className="text-[28px] font-semibold tracking-[-0.025em]">{value}</span>
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
