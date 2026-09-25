"use client";

// App state. It works in two modes:
// - demo: sample data saved in localStorage, so changes survive a reload.
// - account: the user's real data. Every change goes to the server (Server Actions)
//   and the state is replaced with the response, which is the source of truth.
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import * as api from "@/server/actions";
import type { AccountAlert, AccountData, AccountUser, ActionResult, Freq } from "./account-types";
import { DEFAULT_LISTS, DEMO_PRODUCTS, type AlertStatus, type Product, type ProductList } from "./demo-data";
import type { SortKey } from "./insights";

export type { Freq, SortKey };

export type LoadState = "normal" | "vacio" | "cargando" | "error";
// "Todas", "sin-lista" or the id of a list
export type ListFilter = string;
export const NO_LIST = "sin-lista";
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

// Name of a list by its id ("Sin lista" if there is none)
export function listName(lists: ProductList[], id: string | null) {
  return lists.find((l) => l.id === id)?.name ?? "Sin lista";
}

function addedMessage(lists: ProductList[], listId: string | null) {
  return listId ? "Producto añadido a " + listName(lists, listId) : "Producto añadido";
}

// Same rules as the server: 1-30 characters and no repeated names
function checkListName(lists: ProductList[], name: string, exceptId?: string) {
  const clean = name.trim();
  if (!clean || clean.length > 30) return "Escribe un nombre de 1 a 30 caracteres.";
  const taken = lists.some((l) => l.id !== exceptId && l.name.toLowerCase() === clean.toLowerCase());
  return taken ? "Ya tienes una lista con ese nombre." : null;
}

interface DemoState {
  mode: Mode;
  products: Product[];
  lists: ProductList[];
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
  // List being created ("new") or edited (its id) in the list dialog
  listEditor: string | null;
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
  addProduct: (p: Product) => boolean;
  addFromUrl: (input: { url: string; target: number | null; listId: string | null }) => Promise<boolean>;
  addFromCatalog: (input: { catalogId: string; target: number | null; listId: string | null }) => Promise<boolean>;
  deleteProduct: (id: string) => Promise<boolean>;
  checkNow: (id: string) => Promise<void>;
  setChannel: (k: "email" | "telegram", on: boolean) => void;
  setFreq: (f: Freq) => void;
  setProfile: (p: { name: string; email: string }) => void;
  // Real account profile (saved on the server)
  updateName: (name: string) => Promise<boolean>;
  uploadAvatar: (dataUrl: string) => Promise<boolean>;
  removeAvatar: () => Promise<boolean>;
  resetDemo: () => void;
  // Lists
  openListEditor: (id: string | "new") => void;
  closeListEditor: () => void;
  createList: (l: { name: string; color: string }) => Promise<boolean>;
  updateList: (id: string, l: { name: string; color: string }) => Promise<boolean>;
  deleteList: (id: string) => Promise<boolean>;
  moveProduct: (id: string, listId: string | null) => Promise<boolean>;
}

/** Default values for the fields saved in localStorage. */
const PERSISTED = {
  products: DEMO_PRODUCTS,
  lists: DEFAULT_LISTS,
  alerts: initialAlerts(),
  channels: { email: true, telegram: true },
  freq: "1h" as Freq,
  profile: { name: "Aleix", email: "aleix@ejemplo.com" },
};

// UI state that shouldn't carry over when switching between demo and account
const CLEAN_UI = { filter: "Todas", search: "", addOpen: false, listEditor: null };

/** Maps account data from the server to the store shape. */
const fromAccount = (d: AccountData) => ({
  products: d.products,
  lists: d.lists,
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
        listEditor: null,
        toast: null,

        setLoadState: (loadState) => set({ loadState }),
        setFilter: (filter) => set({ filter }),
        setSort: (sort) => set({ sort }),
        setSearch: (search) => set({ search }),
        openAdd: () => set({ addOpen: true }),
        closeAdd: () => set({ addOpen: false }),
        showToast: (msg, tone = "ok") => set({ toast: { id: Date.now(), msg, tone } }),
        hideToast: () => set({ toast: null }),

        enterAccount: (d) => set({ mode: "account", loadState: "normal", ...CLEAN_UI, ...fromAccount(d) }),
        enterDemo: async () => {
          // While mode is still "account" nothing is written to localStorage,
          // so the saved demo changes are not overwritten here
          if (get().mode === "account") {
            set({ ...PERSISTED, alerts: initialAlerts(), account: null, history: [], lastCheckMinutes: null });
          }
          await useDemo.persist.rehydrate();
          set({ mode: "demo", ...CLEAN_UI });
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
            return false;
          }
          set((s) => ({
            products: [p, ...s.products],
            alerts: p.target ? { ...s.alerts, [p.id]: true } : s.alerts,
            loadState: s.loadState === "vacio" ? "normal" : s.loadState,
          }));
          get().showToast(addedMessage(get().lists, p.list));
          return true;
        },
        addFromUrl: (input) => apply(api.addProduct(input), addedMessage(get().lists, input.listId)),
        addFromCatalog: (input) => apply(api.addFromCatalog(input), addedMessage(get().lists, input.listId)),
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
          const request = api.checkNow(id);
          if (!(await apply(request))) return;
          // The request already finished, this just reads its result
          const r = await request;
          if (r.ok && r.checkError) get().showToast(r.checkError, "error");
          else get().showToast("Precio revisado");
        },
        setChannel: (k, on) => {
          set((s) => ({ channels: { ...s.channels, [k]: on } }));
          if (!isAccount()) return;
          apply(api.updateSettings({ [k]: on })).then((ok) => {
            if (!ok && get().channels[k] === on) set((s) => ({ channels: { ...s.channels, [k]: !on } }));
          });
        },
        setFreq: (freq) => {
          const prev = get().freq;
          set({ freq });
          if (!isAccount() || freq === "15m") return;
          apply(api.updateSettings({ freq })).then((ok) => {
            if (!ok && get().freq === freq) set({ freq: prev });
          });
        },
        setProfile: (profile) => {
          set({ profile });
          get().showToast("Cambios guardados");
        },
        updateName: (name) => apply(api.updateName(name), "Nombre actualizado"),
        uploadAvatar: (dataUrl) => apply(api.uploadAvatar(dataUrl), "Foto actualizada"),
        removeAvatar: () => apply(api.removeAvatar(), "Foto eliminada"),
        resetDemo: () => {
          set({ ...PERSISTED, alerts: initialAlerts(), filter: "Todas", search: "", loadState: "normal" });
          get().showToast("Demo restablecida");
        },

        openListEditor: (id) => set({ listEditor: id }),
        closeListEditor: () => set({ listEditor: null }),
        createList: async (l) => {
          const error = checkListName(get().lists, l.name);
          if (error) {
            get().showToast(error, "error");
            return false;
          }
          if (isAccount()) return apply(api.createList(l), "Lista creada");
          // Demo: a random id is enough, it only lives in this browser
          set((s) => ({ lists: [...s.lists, { id: crypto.randomUUID(), name: l.name.trim(), color: l.color }] }));
          get().showToast("Lista creada");
          return true;
        },
        updateList: async (id, l) => {
          const error = checkListName(get().lists, l.name, id);
          if (error) {
            get().showToast(error, "error");
            return false;
          }
          if (isAccount()) return apply(api.updateList({ id, ...l }), "Lista guardada");
          set((s) => ({ lists: s.lists.map((x) => (x.id === id ? { ...x, name: l.name.trim(), color: l.color } : x)) }));
          get().showToast("Lista guardada");
          return true;
        },
        deleteList: async (id) => {
          // If we were looking at that list, go back to all products
          if (get().filter === id) set({ filter: "Todas" });
          if (isAccount()) return apply(api.deleteList(id), "Lista eliminada");
          set((s) => ({
            lists: s.lists.filter((x) => x.id !== id),
            products: s.products.map((p) => (p.list === id ? { ...p, list: null } : p)),
          }));
          get().showToast("Lista eliminada");
          return true;
        },
        moveProduct: async (id, listId) => {
          const message = listId ? "Movido a " + listName(get().lists, listId) : "Quitado de la lista";
          if (isAccount()) return apply(api.moveProduct({ id, listId }), message);
          set((s) => ({ products: s.products.map((p) => (p.id === id ? { ...p, list: listId } : p)) }));
          get().showToast(message);
          return true;
        },
      };
    },
    {
      name: "nadir-demo",
      // Bumping the version drops data saved in an old format
      version: 5,
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
        lists: s.lists,
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
