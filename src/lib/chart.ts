// Geometría de la gráfica del histórico. Es una función pura (sin React)
// para poder probarla con tests unitarios.
import { ago as agoFrom, eur, fd } from "./format";

export type RangeKey = "7D" | "1M" | "3M" | "1A";

export const RANGES: Record<RangeKey, { days: number; label: string }> = {
  "7D": { days: 8, label: "7 días" },
  "1M": { days: 31, label: "1 mes" },
  "3M": { days: 91, label: "3 meses" },
  "1A": { days: 365, label: "1 año" },
};

/** Redondea un paso de eje a un valor "bonito": 1, 2, 2.5, 5 o 10 × 10^n */
export function niceStep(s: number) {
  const e = Math.pow(10, Math.floor(Math.log10(s)));
  const f = s / e;
  return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * e;
}

export interface ChartInput {
  series: number[];
  range: RangeKey;
  width: number;
  compact: boolean;
  /** Mínimo histórico del producto, para saber si el mínimo visible es el "nadir" */
  allTimeMin: number;
  target: number | null;
  /** Día del último dato. Por defecto, el "hoy" de la demo. */
  end?: Date;
}

export function buildChart({ series, range, width, compact, allTimeMin, target, end }: ChartInput) {
  let data = series.slice(-RANGES[range].days);
  // Con un solo precio (producto recién añadido) se dibuja una línea plana
  if (data.length === 1) data = [data[0], data[0]];
  const ago = (n: number) => agoFrom(n, end);
  const len = data.length;
  const W = Math.max(280, width);
  const H = compact ? 220 : 280;
  const padL = compact ? 40 : 48;
  const padR = 12;
  const padT = 16;
  const padB = 26;

  let mn = Math.min(...data);
  let mx = Math.max(...data);
  if (target != null) {
    mn = Math.min(mn, target);
    mx = Math.max(mx, target);
  }
  const span = Math.max(mx - mn, mx * 0.04);
  const step = niceStep(span / 4);
  const lo = Math.floor((mn - span * 0.18) / step) * step;
  const hi = Math.ceil((mx + span * 0.1) / step) * step;

  const X = (i: number) => padL + (i * (W - padL - padR)) / (len - 1);
  const Y = (v: number) => padT + ((hi - v) / (hi - lo)) * (H - padT - padB);

  // Línea escalonada: el precio se mantiene hasta que cambia
  let line = `M${X(0).toFixed(1)} ${Y(data[0]).toFixed(1)}`;
  for (let i = 1; i < len; i++) line += ` H${X(i).toFixed(1)} V${Y(data[i]).toFixed(1)}`;
  const area = line + ` V${H - padB} H${X(0).toFixed(1)} Z`;

  let grid = "";
  const yTicks: { label: string; y: number }[] = [];
  for (let v = lo; v <= hi + 1e-6; v += step) {
    const y = Y(v);
    grid += `M${padL} ${y.toFixed(1)} H${W - padR} `;
    yTicks.push({ label: v.toLocaleString("es-ES") + " €", y });
  }

  const cnt = compact ? 3 : 5;
  const xTicks: { label: string; x: number; align: "start" | "middle" | "end" }[] = [];
  for (let k = 0; k < cnt; k++) {
    const i = Math.round((k * (len - 1)) / (cnt - 1));
    xTicks.push({ label: fd(ago(len - 1 - i)), x: X(i), align: k === 0 ? "start" : k === cnt - 1 ? "end" : "middle" });
  }

  const minV = Math.min(...data);
  const minI = data.indexOf(minV);
  const isNadir = Math.abs(minV - allTimeMin) < 0.001;
  const nadirLabel = (isNadir ? "Nadir · " : "Mínimo del periodo · ") + eur(minV) + " · " + fd(ago(len - 1 - minI));

  const maxV = Math.max(...data);
  const maxI = data.indexOf(maxV);
  const avg = data.reduce((a, b) => a + b, 0) / len;

  return {
    data,
    len,
    W,
    H,
    padL,
    padR,
    padT,
    bottom: H - padB,
    right: W - padR,
    X,
    Y,
    line,
    area,
    grid,
    yTicks,
    xTicks,
    nadir: { x: X(minI), y: Y(minV), value: minV, index: minI, label: nadirLabel, isNadir },
    targetY: target != null ? Y(target) : null,
    stats: {
      max: { value: maxV, date: fd(ago(len - 1 - maxI)) },
      avg,
      min: { value: minV, date: fd(ago(len - 1 - minI)) },
      change: ((data[len - 1] - data[0]) / data[0]) * 100,
    },
    /** Índice del dato más cercano a una posición x en píxeles */
    indexAt(px: number) {
      const i = Math.round(((px - padL) / (W - padL - padR)) * (len - 1));
      return Math.max(0, Math.min(len - 1, i));
    },
  };
}

export type Chart = ReturnType<typeof buildChart>;
