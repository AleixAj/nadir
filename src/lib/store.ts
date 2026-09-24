"use client";

// Estado de la app. Funciona en dos modos:
// - demo: datos de ejemplo guardados en localStorage (cambios que sobreviven a recargar).
// - account: datos reales del usuario; cada cambio se envía al servidor (Server Actions)
//   y el estado se sustituye por la respuesta, que es la fuente de verdad.
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import * as api from "@/server/actions";
import type { AccountAlert, AccountData, AccountUser, ActionResult, Freq } from "./account-types";
import { DEMO_PRODUCTS, type ListName, type Product } from "./demo-data";
import type { SortKey } from "./insights";

export type { Freq, SortKey };

export type LoadState = "normal" | "vacio" | "cargando" | "error";
export type ListFilter = "Todas" | ListName;
export type Mode = "demo" | "account";

const initialAlerts = () =>
  Object.fromEntries(
    DEMO_PRODUCTS.filter((p) => p.alert !== "none").map((p) => [p.id, p.alert === "activa" || p.alert === "alcanzado"]),
  );

interface DemoState {
  mode: Mode;
  products: Product[];
  /** Alerta encendida o pausada, por producto */
  alerts: Record<string, boolean>;
  channels: { email: boolean; telegram: boolean };
  freq: Freq;
  profile: { name: string; email: string };

  // Solo en modo cuenta
  account: AccountUser | null;
  history: AccountAlert[];
  lastCheckMinutes: number | null;

  // Estado de la interfaz (no se guarda)
  loadState: LoadState;
  filter: ListFilter;
  sort: SortKey;
  search: string;
  addOpen: boolean;
  toast: { id: number; msg: string; tone: "ok" | "error" } | null;

  setLoadState: (s: LoadState) => void;
  setFilter: (f: ListFilter) => void;
  setSort: (s: SortKey) => void;
  setSearch: (q: string) => void;
  openAdd: () => void;
  closeAdd: () => void;
  showToast: (msg: string, tone?: "ok" | "error") => void;
  hideToast: () => void;

  enterAccount: (d: AccountData) => void;
  /**
   * Vuelve al modo demo (p. ej. un usuario con sesión que abre la demo): quita los datos
   * de la cuenta, recupera la demo guardada en el navegador y cambia de modo.
   */
  enterDemo: () => Promise<void>;
  toggleAlert: (id: string) => void;
  saveAlert: (id: string, target: number, on: boolean) => Promise<void>;
  addProduct: (p: Product) => void;
  addFromUrl: (input: { url: string; target: number | null; list: ListName }) => Promise<boolean>;
  addFromCatalog: (input: { catalogId: string; target: number | null; list: ListName }) => Promise<boolean>;
  deleteProduct: (id: string) => Promise<boolean>;
  checkNow: (id: string) => Promise<void>;
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
  profile: { name: "Aleix", email: "aleix@ejemplo.com" },
};

/** Pasa los datos de la cuenta al formato del estado. */
const fromAccount = (d: AccountData) => ({
  products: d.products,
  alerts: d.alerts,
  channels: { email: d.settings.email, telegram: d.settings.telegram },
  freq: d.settings.freq,
  profile: { name: d.user.name, email: d.user.email },
  account: d.user,
  history: d.history,
  lastCheckMinutes: d.lastCheckMinutes,
});

export const useDemo = create<DemoState>()(
  persist(
    (set, get) => {
      // Número de la última respuesta aplicada: si llegan desordenadas, se ignoran las antiguas
      let seq = 0;
      let applied = 0;

      /** Ejecuta una acción del servidor y aplica su respuesta. */
      const apply = async (p: Promise<ActionResult>, okMsg?: string): Promise<boolean> => {
        const mine = ++seq;
        try {
          const r = await p;
          if (!r.ok) {
            get().showToast(r.error, "error");
            return false;
          }
          if (mine > applied) {
            applied = mine;
            set(fromAccount(r.data));
          }
          if (okMsg) get().showToast(okMsg);
          return true;
        } catch {
          get().showToast("No hemos podido conectar con el servidor.", "error");
          return false;
        }
      };
      const isAccount = () => get().mode === "account";

      return {
        mode: "demo",
        ...PERSISTED,
        account: null,
        history: [],
        lastCheckMinutes: null,
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
        showToast: (msg, tone = "ok") => set({ toast: { id: Date.now(), msg, tone } }),
        hideToast: () => set({ toast: null }),

        enterAccount: (d) => set({ mode: "account", loadState: "normal", ...fromAccount(d) }),
        enterDemo: async () => {
          // Mientras el modo siga siendo "account" no se escribe en localStorage,
          // así no se pisan los cambios de la demo que el usuario tenga guardados
          if (get().mode === "account") {
            set({ ...PERSISTED, alerts: initialAlerts(), account: null, history: [], lastCheckMinutes: null });
          }
          await useDemo.persist.rehydrate();
          set({ mode: "demo" });
        },

        toggleAlert: (id) => {
          const on = !get().alerts[id];
          // Cambio inmediato en pantalla; si el servidor falla, se deshace
          set((s) => ({ alerts: { ...s.alerts, [id]: on } }));
          if (!isAccount()) {
            get().showToast(on ? "Alerta activada" : "Alerta pausada");
            return;
          }
          apply(api.toggleAlert(id), on ? "Alerta activada" : "Alerta pausada").then((ok) => {
            if (!ok) set((s) => ({ alerts: { ...s.alerts, [id]: !on } }));
          });
        },
        saveAlert: async (id, target, on) => {
          if (isAccount()) {
            await apply(api.saveAlert({ id, target, on }), "Alerta guardada");
            return;
          }
          set((s) => ({
            alerts: { ...s.alerts, [id]: on },
            products: s.products.map((p) =>
              p.id === id ? { ...p, target, alert: p.cur <= target ? "alcanzado" : on ? "activa" : "pausada" } : p,
            ),
          }));
          get().showToast("Alerta guardada");
        },
        addProduct: (p) => {
          if (get().products.some((x) => x.id === p.id)) {
            get().showToast("Ya sigues este producto", "error");
            return;
          }
          set((s) => ({
            products: [p, ...s.products],
            alerts: p.target ? { ...s.alerts, [p.id]: true } : s.alerts,
            loadState: s.loadState === "vacio" ? "normal" : s.loadState,
          }));
          get().showToast("Producto añadido a " + p.list);
        },
        addFromUrl: (input) => apply(api.addProduct(input), "Producto añadido a " + input.list),
        addFromCatalog: (input) => apply(api.addFromCatalog(input), "Producto añadido a " + input.list),
        deleteProduct: async (id) => {
          if (isAccount()) return apply(api.deleteProduct(id), "Has dejado de seguir el producto");
          set((s) => ({ products: s.products.filter((p) => p.id !== id) }));
          get().showToast("Has dejado de seguir el producto");
          return true;
        },
        checkNow: async (id) => {
          if (!isAccount()) {
            get().showToast("Precio revisado");
            return;
          }
          try {
            const r = await api.checkNow(id);
            if (!r.ok) return get().showToast(r.error, "error");
            set(fromAccount(r.data));
            if (r.checkError) get().showToast(r.checkError, "error");
            else get().showToast("Precio revisado");
          } catch {
            get().showToast("No hemos podido conectar con el servidor.", "error");
          }
        },
        setChannel: (k, on) => {
          set((s) => ({ channels: { ...s.channels, [k]: on } }));
          if (!isAccount()) return;
          apply(api.updateSettings({ [k]: on })).then((ok) => {
            if (!ok) set((s) => ({ channels: { ...s.channels, [k]: !on } }));
          });
        },
        setFreq: (freq) => {
          const prev = get().freq;
          set({ freq });
          if (!isAccount() || freq === "15m") return;
          apply(api.updateSettings({ freq })).then((ok) => {
            if (!ok) set({ freq: prev });
          });
        },
        setProfile: (profile) => {
          set({ profile });
          get().showToast("Cambios guardados");
        },
        resetDemo: () => {
          set({ ...PERSISTED, alerts: initialAlerts(), filter: "Todas", search: "", loadState: "normal" });
          get().showToast("Demo restablecida");
        },
      };
    },
    {
      name: "nadir-demo",
      // Subir la versión descarta los datos guardados con un formato antiguo
      version: 4,
      migrate: () => ({ ...PERSISTED, alerts: initialAlerts() }),
      // En modo cuenta no se escribe nada en el navegador: los datos viven en el servidor
      storage: createJSONStorage(() => ({
        getItem: (k) => localStorage.getItem(k),
        setItem: (k, v) => {
          if (useDemo.getState().mode !== "account") localStorage.setItem(k, v);
        },
        removeItem: (k) => localStorage.removeItem(k),
      })),
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

export const useIsAccount = () => useDemo((s) => s.mode === "account");
