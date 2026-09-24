"use client";

// Estado de la cuenta de demostración. Se guarda en localStorage para que los
// cambios (alertas, productos añadidos, ajustes) sigan ahí al recargar.
// Cuando haya cuentas reales, esto se sustituye por la base de datos.
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { DEMO_PRODUCTS, type ListName, type Product } from "./demo-data";
import type { SortKey } from "./insights";

export type { SortKey };

export type LoadState = "normal" | "vacio" | "cargando" | "error";
export type Freq = "15m" | "1h" | "6h" | "24h";
export type ListFilter = "Todas" | ListName;

const initialAlerts = () =>
  Object.fromEntries(
    DEMO_PRODUCTS.filter((p) => p.alert !== "none").map((p) => [p.id, p.alert === "activa" || p.alert === "alcanzado"]),
  );

interface DemoState {
  products: Product[];
  /** Alerta encendida o pausada, por producto */
  alerts: Record<string, boolean>;
  channels: { email: boolean; telegram: boolean };
  freq: Freq;
  profile: { name: string; email: string };

  // Estado de la interfaz (no se guarda)
  loadState: LoadState;
  filter: ListFilter;
  sort: SortKey;
  search: string;
  addOpen: boolean;
  toast: { id: number; msg: string } | null;

  setLoadState: (s: LoadState) => void;
  setFilter: (f: ListFilter) => void;
  setSort: (s: SortKey) => void;
  setSearch: (q: string) => void;
  openAdd: () => void;
  closeAdd: () => void;
  showToast: (msg: string) => void;
  hideToast: () => void;

  toggleAlert: (id: string) => void;
  saveAlert: (id: string, target: number, on: boolean) => void;
  addProduct: (p: Product) => void;
  setChannel: (k: "email" | "telegram", on: boolean) => void;
  setFreq: (f: Freq) => void;
  setProfile: (p: { name: string; email: string }) => void;
  resetDemo: () => void;
}

const PERSISTED = {
  products: DEMO_PRODUCTS,
  alerts: initialAlerts(),
  channels: { email: true, telegram: true },
  freq: "1h" as Freq,
  profile: { name: "Ana Martín", email: "ana.martin@ejemplo.com" },
};

export const useDemo = create<DemoState>()(
  persist(
    (set, get) => ({
      ...PERSISTED,
      loadState: "normal",
      filter: "Todas",
      sort: "drop",
      search: "",
      addOpen: false,
      toast: null,

      setLoadState: (loadState) => set({ loadState }),
      setFilter: (filter) => set({ filter }),
      setSort: (sort) => set({ sort }),
      setSearch: (search) => set({ search }),
      openAdd: () => set({ addOpen: true }),
      closeAdd: () => set({ addOpen: false }),
      showToast: (msg) => set({ toast: { id: Date.now(), msg } }),
      hideToast: () => set({ toast: null }),

      toggleAlert: (id) => {
        const on = !get().alerts[id];
        set((s) => ({ alerts: { ...s.alerts, [id]: on } }));
        get().showToast(on ? "Alerta activada" : "Alerta pausada");
      },
      saveAlert: (id, target, on) => {
        set((s) => ({
          alerts: { ...s.alerts, [id]: on },
          products: s.products.map((p) =>
            p.id === id
              ? { ...p, target, alert: p.cur <= target ? "alcanzado" : on ? "activa" : "pausada" }
              : p,
          ),
        }));
        get().showToast("Alerta guardada");
      },
      addProduct: (p) => {
        if (get().products.some((x) => x.id === p.id)) {
          get().showToast("Ya sigues este producto");
          return;
        }
        set((s) => ({
          products: [p, ...s.products],
          alerts: p.target ? { ...s.alerts, [p.id]: true } : s.alerts,
          loadState: s.loadState === "vacio" ? "normal" : s.loadState,
        }));
        get().showToast("Producto añadido a " + p.list);
      },
      setChannel: (k, on) => set((s) => ({ channels: { ...s.channels, [k]: on } })),
      setFreq: (freq) => set({ freq }),
      setProfile: (profile) => {
        set({ profile });
        get().showToast("Cambios guardados");
      },
      resetDemo: () => {
        set({ ...PERSISTED, alerts: initialAlerts(), filter: "Todas", search: "", loadState: "normal" });
        get().showToast("Demo restablecida");
      },
    }),
    {
      name: "nadir-demo",
      // Subir la versión descarta los datos guardados con un formato antiguo
      version: 2,
      migrate: () => ({ ...PERSISTED, alerts: initialAlerts() }),
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
      partialize: (s) => ({
        products: s.products,
        alerts: s.alerts,
        channels: s.channels,
        freq: s.freq,
        profile: s.profile,
      }),
    },
  ),
);

/** Productos visibles según el estado de carga (el estado "vacío" simula una cuenta nueva). */
export const useProducts = () => {
  const products = useDemo((s) => s.products);
  const loadState = useDemo((s) => s.loadState);
  return loadState === "vacio" ? [] : products;
};
