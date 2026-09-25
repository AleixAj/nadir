const MES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const DIA = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];

const nf2 = new Intl.NumberFormat("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const nf1 = new Intl.NumberFormat("es-ES", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

/** The demo "today". Demo data is generated backwards from this date. */
export const TODAY = new Date(2026, 8, 24);

/** Rounds to 2 decimals */
export const r2 = (v: number) => Math.round(v * 100) / 100;

/** 249,00 € */
export const eur = (v: number) => nf2.format(v) + " €";

/** 249 € if it's a whole number, 249,90 € otherwise */
export const eurS = (v: number) => (Math.abs(v - Math.round(v)) < 0.005 ? Math.round(v) + " €" : eur(v));

// A percentage over a zero price is NaN or Infinity: show 0 instead
const safe = (v: number) => (Number.isFinite(v) ? v : 0);

/** +3,8 % · −12,0 % · 0,0 % (uses the proper minus sign) */
export const pctS = (value: number) => {
  const v = safe(value);
  return (v > 0.05 ? "+" : v < -0.05 ? "−" : "") + nf1.format(Math.abs(v)) + " %";
};

/** 3,8 (one decimal, no sign) */
export const pct1 = (v: number) => nf1.format(safe(v));

/** Date `days` days before `from` (the demo "today" by default) */
export const ago = (days: number, from: Date = TODAY) => {
  const d = new Date(from);
  d.setDate(d.getDate() - days);
  return d;
};

/** 28 jul */
export const fd = (d: Date) => d.getDate() + " " + MES[d.getMonth()];

/** mar, 28 jul 2026 */
export const fdl = (d: Date) => DIA[d.getDay()] + ", " + fd(d) + " " + d.getFullYear();

/** Minutes to "ahora", "hace 12 min", "hace 3 h" or "hace 2 d" */
export function sinceLabel(minutes: number | null | undefined) {
  if (minutes == null) return "sin revisar";
  if (minutes < 1) return "ahora";
  if (minutes < 60) return `hace ${Math.round(minutes)} min`;
  if (minutes < 60 * 24) return `hace ${Math.round(minutes / 60)} h`;
  return `hace ${Math.round(minutes / 60 / 24)} d`;
}

/** Accepts "229", "229,5" or "229.50". Returns NaN if it's not a number. */
export const parsePrice = (s: string) => parseFloat(String(s).trim().replace(",", "."));
