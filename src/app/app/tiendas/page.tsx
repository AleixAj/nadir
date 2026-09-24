"use client";

import { useState } from "react";
import { IconAlertCircle, IconRefresh } from "@tabler/icons-react";
import { Button, Card, cx, enter } from "@/components/ui";
import { STORES } from "@/lib/demo-data";
import { useDemo } from "@/lib/store";

const COLS = "grid-cols-[minmax(200px,1fr)_150px_170px_110px_110px]";

export default function TiendasPage() {
  const showToast = useDemo((s) => s.showToast);
  const [retrying, setRetrying] = useState<string | null>(null);
  const ok = STORES.filter((s) => !s.error).length;

  const retry = (name: string) => {
    setRetrying(name);
    showToast(`Reintentando revisión de ${name}…`);
    setTimeout(() => setRetrying(null), 1600);
  };

  return (
    <>
      <div {...enter(0, "flex flex-col gap-1")}>
        <h1 className="m-0 text-xl font-semibold tracking-[-0.015em]">Tiendas</h1>
        <p className="m-0 text-[13px] text-text-2">
          {ok} funcionando · {STORES.length - ok} con errores · Revisión automática cada hora
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
          {STORES.map((s, i) => (
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
                    La tienda no responde (tiempo de espera agotado tras 30 s). Volveremos a intentarlo automáticamente en 10 min.
                  </span>
                  <Button variant="secondary" className="h-7 px-2.5 text-xs shadow-none" onClick={() => retry(s.name)} disabled={retrying === s.name}>
                    <IconRefresh size={13} aria-hidden className={cx(retrying === s.name && "animate-spin")} />
                    {retrying === s.name ? "Reintentando…" : "Reintentar ahora"}
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      </Card>
    </>
  );
}
