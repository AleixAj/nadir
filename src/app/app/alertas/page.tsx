"use client";

import Link from "next/link";
import { useState } from "react";
import { IconArrowDownRight, IconBell, IconBrandTelegram, IconCheck, IconMail } from "@tabler/icons-react";
import { Card, cx, enter, ProductThumb, ProgressBar, Segmented, Switch } from "@/components/ui";
import { SENT_ALERTS } from "@/lib/demo-data";
import { ago, eur, eurS, fd, pct1 } from "@/lib/format";
import { distanceToTarget, leftToTarget, targetProgress } from "@/lib/insights";
import { useDemo, useIsAccount, useProducts } from "@/lib/store";

type Tab = "activas" | "historial";
const COLS = "grid-cols-[minmax(220px,1fr)_96px_104px_170px_100px_44px]";

export default function AlertasPage() {
  const products = useProducts();
  const alerts = useDemo((s) => s.alerts);
  const toggleAlert = useDemo((s) => s.toggleAlert);
  const [tab, setTab] = useState<Tab>("activas");

  // Alerts with a target price that haven't been reached yet, closest first
  const rows = products
    .filter((p) => p.target && p.alert !== "alcanzado")
    .sort((a, b) => distanceToTarget(a) - distanceToTarget(b));
  const activeCount = rows.filter((p) => alerts[p.id]).length;
  const byId = Object.fromEntries(products.map((p) => [p.id, p]));
  const isAccount = useIsAccount();
  const accountHistory = useDemo((s) => s.history);
  // Same shape for sample and real sent alerts
  const history = isAccount
    ? accountHistory.map((h) => ({ key: String(h.id), name: h.name, txt: h.txt, date: h.date, time: h.time, channels: h.channels }))
    : SENT_ALERTS.filter((h) => byId[h.id]).map((h) => ({
        key: h.id + h.daysAgo,
        name: byId[h.id].name,
        txt: h.txt,
        date: fd(ago(h.daysAgo)),
        time: h.time,
        channels: h.channels,
      }));

  return (
    <>
      <div {...enter(0, "flex flex-wrap items-center justify-between gap-3")}>
        <h1 className="m-0 text-xl font-semibold tracking-[-0.015em]">Alertas</h1>
        <Segmented<Tab>
          role="tablist"
          label="Alertas"
          value={tab}
          onChange={setTab}
          options={[
            { value: "activas", label: "Activas", count: activeCount },
            { value: "historial", label: "Historial", count: history.length },
          ]}
        />
      </div>

      {/* Desktop: table */}
      {tab === "activas" && rows.length > 0 && (
        <Card key="activas" {...enter(1, "hidden overflow-x-auto desk:block")}>
          <div className="min-w-[760px]">
            <div className={cx("grid h-9 items-center gap-4 border-b border-border bg-surface-2 px-4 text-xs font-medium text-text-3", COLS)}>
              <span>Producto</span>
              <span className="text-right">Objetivo</span>
              <span className="text-right">Precio actual</span>
              <span>Distancia</span>
              <span>Canales</span>
              <span />
            </div>
            {rows.map((p, i) => {
              const on = !!alerts[p.id];
              const left = leftToTarget(p);
              return (
                <div
                  key={p.id}
                  className={cx("grid items-center gap-4 px-4 py-2.5 transition-opacity duration-200", COLS, i > 0 && "border-t border-border")}
                  style={{ opacity: on ? 1 : 0.55 }}
                >
                  <Link href={`/app/productos/${p.id}`} className="flex min-w-0 items-center gap-3 text-text hover:underline">
                    <ProductThumb icon={p.icon} image={p.image} />
                    <span className="truncate text-[13px] font-medium">{p.name}</span>
                  </Link>
                  <span className="text-right text-[13px] font-semibold text-brand-text">{eurS(p.target!)}</span>
                  <span className="text-right text-[13px]">{eur(p.cur)}</span>
                  <span className="flex flex-col gap-[5px]">
                    <span className="text-xs text-text-2">
                      Faltan {eurS(left)} · {pct1((left / p.cur) * 100)} %
                    </span>
                    <ProgressBar value={targetProgress(p)} delay={0.15 + i * 0.05} />
                  </span>
                  <span className="flex gap-2 text-text-2">
                    <IconMail size={16} aria-label="Email" />
                    <IconBrandTelegram size={16} aria-label="Telegram" />
                  </span>
                  <Switch on={on} onChange={() => toggleAlert(p.id)} label={"Alerta de " + p.name} />
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Mobile: one card per alert */}
      {tab === "activas" && rows.length > 0 && (
        <Card key="activas-mobile" {...enter(1, "overflow-hidden desk:hidden")}>
          {rows.map((p, i) => {
            const on = !!alerts[p.id];
            const left = leftToTarget(p);
            return (
              <div
                key={p.id}
                className={cx("flex flex-col gap-2.5 px-3.5 py-3 transition-opacity duration-200", i > 0 && "border-t border-border")}
                style={{ opacity: on ? 1 : 0.55 }}
              >
                <div className="flex items-center gap-3">
                  <Link href={`/app/productos/${p.id}`} className="flex min-w-0 flex-1 items-center gap-3 text-text">
                    <ProductThumb icon={p.icon} image={p.image} size={44} />
                    <span className="flex min-w-0 flex-col">
                      <span className="truncate text-sm font-medium">{p.name}</span>
                      <span className="text-xs text-text-2">
                        Ahora {eur(p.cur)} · Objetivo <span className="font-semibold text-brand-text">{eurS(p.target!)}</span>
                      </span>
                    </span>
                  </Link>
                  <Switch on={on} onChange={() => toggleAlert(p.id)} label={"Alerta de " + p.name} />
                </div>
                <ProgressBar value={targetProgress(p)} delay={0.15 + i * 0.05} />
                <div className="flex items-center justify-between gap-3 text-xs text-text-2">
                  <span>
                    Faltan {eurS(left)} · {pct1((left / p.cur) * 100)} %
                  </span>
                  <span className="flex gap-2">
                    <IconMail size={16} aria-label="Email" />
                    <IconBrandTelegram size={16} aria-label="Telegram" />
                  </span>
                </div>
              </div>
            );
          })}
        </Card>
      )}

      {tab === "activas" && rows.length === 0 && (
        <Card key="activas-empty" {...enter(1)}>
          <div className="flex flex-col items-center gap-2 px-6 py-10 text-center text-[13px] text-text-2">
            <IconBell size={22} className="text-text-3" aria-hidden />
            No tienes alertas. Ábrelas desde la ficha de cualquier producto.
          </div>
        </Card>
      )}

      {tab === "historial" && (
        <Card key="historial" {...enter(1, "overflow-hidden")}>
          {history.map((h, i) => (
            <div key={h.key} className={cx("flex flex-wrap items-center gap-3 px-4 py-3", i > 0 && "border-t border-border")}>
              <span className="grid size-[30px] shrink-0 place-items-center rounded-full bg-down-soft text-down">
                <IconArrowDownRight size={16} aria-hidden />
              </span>
              <span className="flex min-w-[200px] flex-1 flex-col">
                <span className="text-[13px] font-medium">{h.name}</span>
                <span className="text-[13px] text-text-2">
                  {h.txt} · {h.date}
                </span>
              </span>
              <span className="flex items-center gap-2.5 text-xs text-text-3">
                <span>
                  {h.channels} · {h.time}
                </span>
                <span className="inline-flex h-5 items-center gap-1 rounded-full bg-surface-3 px-[7px] font-medium text-text-2">
                  <IconCheck size={12} aria-hidden />
                  Enviado
                </span>
              </span>
            </div>
          ))}
          {history.length === 0 && (
            <p className="m-0 p-6 text-center text-[13px] text-text-2">
              Todavía no hay avisos. Aparecerán aquí cuando un precio baje de tu objetivo.
            </p>
          )}
        </Card>
      )}
    </>
  );
}
