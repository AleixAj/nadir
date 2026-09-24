// Geometry for the price history chart. Plain functions (no React)
// so it can be unit tested.
import { ago as agoFrom, eur, fd } from "./format";

export type RangeKey = "7D" | "1M" | "3M" | "1A";

export const RANGES: Record<RangeKey, { days: number; label: string }> = {
  "7D": { days: 8, label: "7 días" },
  "1M": { days: 31, label: "1 mes" },
  "3M": { days: 91, label: "3 meses" },
  "1A": { days: 365, label: "1 año" },
};

/** Rounds an axis step up to a "nice" value: 1, 2, 2.5, 5 or 10 times a power of 10 */
export function niceStep(s: number) {
  const power = Math.pow(10, Math.floor(Math.log10(s)));
  const fraction = s / power;
  const nice = [1, 2, 2.5, 5].find((n) => fraction <= n) ?? 10;
  return nice * power;
}

export interface ChartInput {
  series: number[];
  range: RangeKey;
  width: number;
  compact: boolean;
  /** All-time low, to know if the lowest visible point is the real "nadir" */
  allTimeMin: number;
  target: number | null;
  /** Date of the last data point. Defaults to the demo "today". */
  end?: Date;
}

export function buildChart({ series, range, width, compact, allTimeMin, target, end }: ChartInput) {
  let data = series.slice(-RANGES[range].days);
  // Only one price (just added product): draw a flat line
  if (data.length === 1) data = [data[0], data[0]];
  const ago = (n: number) => agoFrom(n, end);
  const len = data.length;
  const W = Math.max(280, width);
  const H = compact ? 220 : 280;
  const padL = compact ? 40 : 48;
  const padR = 12;
  const padT = 16;
  const padB = 26;

  // Y axis range: fit the data and the target line, with some padding, rounded to nice steps
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

  // Convert a data index to x and a price to y (in pixels)
  const X = (i: number) => padL + (i * (W - padL - padR)) / (len - 1);
  const Y = (v: number) => padT + ((hi - v) / (hi - lo)) * (H - padT - padB);

  // Step line: the price stays flat until it changes
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

  // Evenly spaced date labels. First and last are aligned to the edges.
  const cnt = compact ? 3 : 5;
  const xTicks: { label: string; x: number; align: "start" | "middle" | "end" }[] = [];
  for (let k = 0; k < cnt; k++) {
    const i = Math.round((k * (len - 1)) / (cnt - 1));
    let align: "start" | "middle" | "end" = "middle";
    if (k === 0) align = "start";
    else if (k === cnt - 1) align = "end";
    xTicks.push({ label: fd(ago(len - 1 - i)), x: X(i), align });
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
    /** Index of the data point closest to an x position in pixels */
    indexAt(px: number) {
      const i = Math.round(((px - padL) / (W - padL - padR)) * (len - 1));
      return Math.max(0, Math.min(len - 1, i));
    },
  };
}

export type Chart = ReturnType<typeof buildChart>;
