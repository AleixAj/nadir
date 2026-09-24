const MES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const DIA = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];

const nf2 = new Intl.NumberFormat("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const nf1 = new Intl.NumberFormat("es-ES", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

/** Fecha "de hoy" de la demo: los datos se generan hacia atrás desde aquí. */
export const TODAY = new Date(2026, 8, 24);

export const r2 = (v: number) => Math.round(v * 100) / 100;

/** 249,00 € */
export const eur = (v: number) => nf2.format(v) + " €";

/** 249 € si es entero, 249,90 € si no. */
export const eurS = (v: number) => (Math.abs(v - Math.round(v)) < 0.005 ? Math.round(v) + " €" : eur(v));

/** +3,8 % · −12,0 % · 0,0 % (con signo menos tipográfico) */
export const pctS = (v: number) => (v > 0.05 ? "+" : v < -0.05 ? "−" : "") + nf1.format(Math.abs(v)) + " %";

export const pct1 = (v: number) => nf1.format(v);

export const ago = (days: number) => {
  const d = new Date(TODAY);
  d.setDate(d.getDate() - days);
  return d;
};

/** 28 jul */
export const fd = (d: Date) => d.getDate() + " " + MES[d.getMonth()];

/** mar, 28 jul 2026 */
export const fdl = (d: Date) => DIA[d.getDay()] + ", " + fd(d) + " " + d.getFullYear();

/** Acepta "229", "229,5" o "229.50". NaN si no es un número. */
export const parsePrice = (s: string) => parseFloat(String(s).trim().replace(",", "."));
