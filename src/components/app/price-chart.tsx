"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { buildChart, RANGES, type RangeKey } from "@/lib/chart";
import { ago, eur, eurS, fdl, r2 } from "@/lib/format";
import type { Product } from "@/lib/demo-data";

/** Gráfica del histórico: línea escalonada, precio objetivo, punto "nadir" y tooltip. */
export function PriceChart({
  product,
  range,
  target,
  compact,
  onStats,
}: {
  product: Product;
  range: RangeKey;
  target: number | null;
  compact: boolean;
  onStats?: (s: ReturnType<typeof buildChart>["stats"]) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(720);
  const [hover, setHover] = useState<number | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => {
      const w = Math.round(e.contentRect.width);
      if (w) setWidth(w);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const endIso = product.endDate;
  const c = useMemo(
    () =>
      buildChart({
        series: product.series,
        range,
        width,
        compact,
        allTimeMin: product.min,
        target,
        end: endIso ? new Date(endIso) : undefined,
      }),
    [product.series, product.min, range, width, compact, target, endIso],
  );

  useEffect(() => {
    onStats?.(c.stats);
  }, [c.stats, onStats]);

  // Etiqueta del nadir: a la derecha del punto, o a la izquierda si no cabe
  const labelW = c.nadir.label.length * 6.2 + 18;
  let nLeft = c.nadir.x + 14;
  if (nLeft + labelW > c.W) nLeft = c.nadir.x - 14 - labelW;
  nLeft = Math.max(c.padL, nLeft);

  const h = hover != null && hover < c.len ? hover : null;
  const hx = h != null ? c.X(h) : 0;
  const hy = h != null ? c.Y(c.data[h]) : 0;
  const hv = h != null ? c.data[h] : 0;
  const diff = target != null ? r2(hv - target) : 0;

  return (
    <div ref={ref} className="relative w-full select-none" style={{ height: c.H }}>
      <svg
        width={c.W}
        height={c.H}
        role="img"
        aria-label={`Histórico de precio, ${RANGES[range].label}. Mínimo ${eur(c.stats.min.value)} el ${c.stats.min.date}.`}
        onPointerMove={(e) => {
          const b = e.currentTarget.getBoundingClientRect();
          const i = c.indexAt(e.clientX - b.left);
          if (i !== hover) setHover(i);
        }}
        onPointerLeave={() => setHover(null)}
        className="block overflow-visible"
        style={{ touchAction: "pan-y" }}
      >
        <path d={c.grid} fill="none" stroke="var(--grid)" strokeWidth={1} />
        {/* key={range}: al cambiar de periodo, la línea se vuelve a dibujar */}
        <g key={range}>
          <path d={c.area} fill="var(--chart-fill)" className="fade-in" />
          <path
            d={c.line}
            pathLength={1}
            fill="none"
            stroke="var(--brand)"
            strokeWidth={2}
            strokeLinejoin="round"
            className="draw"
            // Un leve resplandor naranja alrededor de la línea
            style={{ filter: "drop-shadow(0 0 6px var(--glow))" }}
          />
        </g>
        {c.targetY != null && (
          <line
            x1={c.padL}
            x2={c.right}
            y1={c.targetY}
            y2={c.targetY}
            stroke="var(--text-3)"
            strokeWidth={1.25}
            strokeDasharray="5 4"
            style={{ transition: "transform 300ms var(--ease-out-strong)" }}
          />
        )}
        <line x1={hx} x2={hx} y1={c.padT} y2={c.bottom} stroke="var(--border-strong)" strokeWidth={1} opacity={h != null ? 1 : 0} />
        <circle cx={c.nadir.x} cy={c.nadir.y} r={10} fill="var(--brand)" className="nadir-pulse" />
        <circle cx={c.nadir.x} cy={c.nadir.y} r={10} fill="var(--brand)" opacity={0.14} />
        <circle cx={c.nadir.x} cy={c.nadir.y} r={4.5} fill="var(--brand)" stroke="var(--surface)" strokeWidth={2} />
        {h != null && <circle cx={hx} cy={hy} r={4} fill="var(--surface)" stroke="var(--brand)" strokeWidth={2} />}
      </svg>

      {c.yTicks.map((t) => (
        <span
          key={t.label}
          className="pointer-events-none absolute left-0 text-right text-[11px] text-text-3"
          style={{ top: t.y - 8, width: c.padL - 8 }}
        >
          {t.label}
        </span>
      ))}
      {c.xTicks.map((t, k) => (
        <span
          key={k}
          className="pointer-events-none absolute bottom-0 text-[11px] whitespace-nowrap text-text-3"
          style={{
            left: t.x,
            transform: t.align === "start" ? "none" : t.align === "end" ? "translateX(-100%)" : "translateX(-50%)",
          }}
        >
          {t.label}
        </span>
      ))}

      {c.targetY != null && target != null && (
        <span
          className="pointer-events-none absolute right-3 rounded bg-surface px-1.5 py-px text-[11px] font-medium text-text-2"
          style={{ top: c.targetY - 20 }}
        >
          Objetivo {eurS(target)}
        </span>
      )}

      <span
        key={"n" + range}
        className="fade-in pointer-events-none absolute inline-flex h-[22px] items-center rounded-full border border-brand-soft-border bg-surface px-2 text-[11px] font-semibold whitespace-nowrap text-brand-text shadow-sm"
        style={{ left: nLeft, top: c.nadir.y - 11, animationDelay: "700ms" }}
      >
        {c.nadir.label}
      </span>

      <AnimatePresence>
        {h != null && (
          <motion.div
            role="tooltip"
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.1 } }}
            transition={{ duration: 0.14, ease: [0.23, 1, 0.32, 1] }}
            className="pointer-events-none absolute z-[2] flex w-[172px] flex-col gap-[3px] rounded-lg border border-border bg-surface px-3 py-2.5 shadow-md"
            style={{ left: hx + 186 > c.W ? hx - 186 : hx + 14, top: Math.max(0, Math.min(hy - 40, c.H - 130)) }}
          >
            <span className="text-[11px] text-text-3">{fdl(ago(c.len - 1 - h, endIso ? new Date(endIso) : undefined))}</span>
            <span className="text-[15px] font-semibold tracking-[-0.01em]">{eur(hv)}</span>
            <span className="text-xs text-text-2">en {product.store}</span>
            {target != null && (
              <span className="mt-1 border-t border-border pt-1.5 text-xs" style={{ color: diff > 0 ? "var(--text-2)" : "var(--down)" }}>
                {diff > 0 ? eur(diff) + " por encima del objetivo" : diff === 0 ? "Justo en tu objetivo" : eur(-diff) + " por debajo del objetivo"}
              </span>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
