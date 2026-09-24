"use client";

// App state. It works in two modes:
// - demo: sample data saved in localStorage, so changes survive a reload.
// - account: the user's real data. Every change goes to the server (Server Actions)
//   and the state is replaced with the response, which is the source of truth.
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import * as api from "@/server/actions";
import type { AccountAlert, AccountData, AccountUser, ActionResult, Freq } from "./account-types";
import { DEMO_PRODUCTS, type AlertStatus, type ListName, type Product } from "./demo-data";
import type { SortKey } from "./insights";

export type { Freq, SortKey };

export type LoadState = "normal" | "vacio" | "cargando" | "error";
export type ListFilter = "Todas" | ListName;
export type Mode = "demo" | "account";

/** Demo alerts: on for active or reached alerts, off for paused ones. */
function initialAlerts(): Record<string, boolean> {
  const alerts: Record<string, boolean> = {};
  for (const p of DEMO_PRODUCTS) {
    if (p.alert === "none") continue;
    alerts[p.id] = p.alert === "activa" || p.alert === "alcanzado";
  }
  return alerts;
}

function alertStatus(price: number, target: number, on: boolean): AlertStatus {
  if (price <= target) return "alcanzado";
  return on ? "activa" : "pausada";
}

interface DemoState {
  mode: Mode;
  products: Product[];
  /** Alert on (true) or paused (false), by product id */
  alerts: Record<string, boolean>;
  channels: { email: boolean; telegram: boolean };
  freq: Freq;
  profile: { name: string; email: string };

  // Account mode only
  account: AccountUser | null;
  history: AccountAlert[];
  lastCheckMinutes: number | null;

  // UI state (not saved)
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
   * Switches back to demo mode (e.g. a signed-in user opens the demo): clears the
   * account data and loads the demo saved in this browser.
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

/** Default values for the fields saved in localStorage. */
const PERSISTED = {
  products: DEMO_PRODUCTS,
  alerts: initialAlerts(),
  channels: { email: true, telegram: true },
  freq: "1h" as Freq,
  profile: { name: "Aleix", email: "aleix@ejemplo.com" },
};

/** Maps account data from the server to the store shape. */
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
      // Request counters: if responses arrive out of order, older ones are ignored
      let seq = 0;
      let applied = 0;

      /** Runs a server action and puts its response in the store. Returns true on success. */
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
          // While mode is still "account" nothing is written to localStorage,
          // so the saved demo changes are not overwritten here
          if (get().mode === "account") {
            set({ ...PERSISTED, alerts: initialAlerts(), account: null, history: [], lastCheckMinutes: null });
          }
          await useDemo.persist.rehydrate();
          set({ mode: "demo" });
        },

        toggleAlert: (id) => {
          const on = !get().alerts[id];
          // Update the UI right away and undo it if the server fails
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
            products: s.products.map((p) => (p.id === id ? { ...p, target, alert: alertStatus(p.cur, target, on) } : p)),
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
      // Bumping the version drops data saved in an old format
      version: 4,
      migrate: () => ({ ...PERSISTED, alerts: initialAlerts() }),
      // In account mode nothing is saved in the browser; the data lives on the server
      storage: createJSONStorage(() => ({
        getItem: (k) => localStorage.getItem(k),
        setItem: (k, v) => {
          if (useDemo.getState().mode !== "account") localStorage.setItem(k, v);
        },
        removeItem: (k) => localStorage.removeItem(k),
      })),
      // AppShell loads the saved demo itself (see enterDemo)
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

/** Products to show. The "vacio" state fakes a brand new account with none. */
export const useProducts = () => {
  const products = useDemo((s) => s.products);
  const loadState = useDemo((s) => s.loadState);
  return loadState === "vacio" ? [] : products;
};

export const useIsAccount = () => useDemo((s) => s.mode === "account");
