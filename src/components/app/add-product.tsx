"use client";

import { useRouter } from "next/navigation";
import { Fragment, useEffect, useId, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  IconArrowLeft,
  IconArrowRight,
  IconCircleCheck,
  IconCornerDownLeft,
  IconLink,
  IconLinkOff,
  IconLoader2,
  IconSearch,
  IconSelector,
  IconX,
} from "@tabler/icons-react";
import {
  CATALOG,
  detectFromUrl,
  EXAMPLE_URL,
  productFromCatalog,
  searchDemo,
  SUPPORTED_STORES,
  type CatalogItem,
  type ListName,
  type ProductIcon,
} from "@/lib/demo-data";
import { eur, parsePrice } from "@/lib/format";
import { useIsMobile } from "@/lib/hooks";
import { useDemo, useIsAccount } from "@/lib/store";
import { previewProduct, searchProducts } from "@/server/actions";
import { Button, cx, ProductThumb, Skeleton } from "@/components/ui";

type Mode = "search" | "url";
type Step = "idle" | "loading" | "error" | "preview";

export function AddProductModal() {
  const open = useDemo((s) => s.addOpen);
  const close = useDemo((s) => s.closeAdd);
  const mobile = useIsMobile();
  const reduce = useReducedMotion();

  // Close with Escape
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, close]);

  // On mobile it slides up from the bottom like a sheet; on desktop it scales in
  const sheet = mobile && !reduce;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="overlay"
          onClick={close}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.15 } }}
          transition={{ duration: 0.2 }}
          className={cx("fixed inset-0 z-50 flex justify-center bg-overlay backdrop-blur-[2px]", mobile ? "items-end p-0" : "items-center p-4")}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-title"
            onClick={(e) => e.stopPropagation()}
            initial={sheet ? { transform: "translateY(100%)" } : { opacity: 0, transform: "scale(0.96) translateY(4px)" }}
            animate={sheet ? { transform: "translateY(0%)" } : { opacity: 1, transform: "scale(1) translateY(0px)" }}
            exit={
              sheet
                ? { transform: "translateY(100%)", transition: { duration: 0.2, ease: [0.32, 0.72, 0, 1] } }
                : { opacity: 0, transform: "scale(0.98)", transition: { duration: 0.12 } }
            }
            transition={sheet ? { duration: 0.4, ease: [0.32, 0.72, 0, 1] } : { duration: 0.22, ease: [0.23, 1, 0.32, 1] }}
            className={cx(
              "surface-grad flex max-h-[88vh] w-full max-w-[560px] flex-col overflow-hidden border border-border bg-surface shadow-lg",
              mobile ? "rounded-t-[14px]" : "rounded-xl shadow-[0_30px_80px_-30px_var(--glow)]",
            )}
          >
            <AddProductBody onClose={close} />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// A search result, from the demo or from the real catalog
interface Hit {
  key: string;
  name: string;
  image?: string | null;
  icon: ProductIcon;
  store: string;
  price: number;
  list?: ListName;
  followedId?: string;
  catalog?: CatalogItem;
  url?: string;
  // Real accounts: id in the test catalog and how many stores sell it
  catalogId?: string;
  stores?: number;
}

// What the preview step shows before adding the product
interface Preview {
  name: string;
  image?: string | null;
  icon: ProductIcon;
  store: string;
  price: number;
  others?: string;
  catalog?: CatalogItem;
  url?: string;
  catalogId?: string;
  stores?: number;
}

const fromCatalog = (c: CatalogItem): Preview => ({ ...c, catalog: c });

// Demo suggestion built from a catalog item
const catalogHit = (c: CatalogItem): Hit => ({
  key: "s-" + c.slug,
  name: c.name,
  image: c.image,
  icon: c.icon,
  store: c.store,
  price: c.price,
  list: c.list,
  catalog: c,
});

// Second line of a search result
function hitSubtitle(h: Hit) {
  if (h.followedId) return "Ya lo sigues · ver ficha";
  if (h.stores && h.stores > 1) return `Desde ${h.store} · ${h.stores} tiendas`;
  return h.list ? `${h.store} · ${h.list}` : h.store;
}

// Green line at the top of the preview card
function previewSource(p: Preview) {
  if (p.catalogId) return `Mejor precio en ${p.store}`;
  if (p.catalog || p.url) return `Encontrado en ${p.store}`;
  return p.store;
}

// Small note at the bottom of the preview card
function previewNote(p: Preview) {
  if (p.others) return `También disponible en ${p.others}`;
  if (p.catalogId) {
    const inStores = p.stores && p.stores > 1 ? ` · en ${p.stores} tiendas` : "";
    return `Catálogo de prueba${inStores}: a partir de hoy su precio evolucionará de forma simulada.`;
  }
  return "Guardaremos este precio y lo revisaremos automáticamente.";
}

// Lowercase and without accents, so "telefono" matches "Teléfono"
const normalize = (s: string) => s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();

// Highlights the part of the name that matches the search
function Highlight({ text, q }: { text: string; q: string }) {
  const t = q.trim();
  if (t.length < 2) return <>{text}</>;
  const i = normalize(text).indexOf(normalize(t));
  if (i < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, i)}
      <mark className="rounded-[3px] bg-brand-soft px-px text-brand-text">{text.slice(i, i + t.length)}</mark>
      {text.slice(i + t.length)}
    </>
  );
}

function AddProductBody({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const addProduct = useDemo((s) => s.addProduct);
  const addFromUrl = useDemo((s) => s.addFromUrl);
  const addFromCatalog = useDemo((s) => s.addFromCatalog);
  const products = useDemo((s) => s.products);
  const isAccount = useIsAccount();
  const listboxId = useId();

  const [mode, setMode] = useState<Mode>("search");
  const [q, setQ] = useState("");
  const [url, setUrl] = useState(isAccount ? "" : EXAMPLE_URL);
  const [step, setStep] = useState<Step>("idle");
  const [errMsg, setErrMsg] = useState("");
  const [found, setFound] = useState<Preview>(fromCatalog(CATALOG[0]));
  const [target, setTarget] = useState("");
  const [list, setList] = useState<ListName>("Tecnología");
  const [saving, setSaving] = useState(false);

  // Search
  const [hits, setHits] = useState<Hit[]>([]);
  const [searching, setSearching] = useState(false);
  const [available, setAvailable] = useState(true);
  const [active, setActive] = useState(0);

  // Timer for the fake loading delays in the demo
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const inputRef = useRef<HTMLInputElement>(null);
  // Id of the latest search, used to ignore old responses
  const reqId = useRef(0);

  useEffect(() => () => clearTimeout(timer.current), []);
  // Focus the input of each step
  useEffect(() => {
    inputRef.current?.focus();
  }, [mode, step]);

  // Search as you type, with a short debounce so we don't search on every key
  useEffect(() => {
    if (mode !== "search") return;
    const text = q.trim();
    if (text.length < 2) return;
    const id = ++reqId.current;
    const t = setTimeout(
      async () => {
        let next: Hit[] = [];
        if (isAccount) {
          try {
            const r = await searchProducts(text);
            if (r.ok) {
              setAvailable(r.data.available);
              next = r.data.hits.map((h) => ({
                key: h.id,
                name: h.name,
                image: h.image,
                icon: "desktop",
                store: h.store,
                price: h.price,
                list: h.list === "Hogar" ? "Hogar" : "Tecnología",
                catalogId: h.id,
                stores: h.stores,
              }));
            }
          } catch {
            next = [];
          }
        } else {
          next = searchDemo(text, products);
        }
        // Only keep the answer to the latest search
        if (id !== reqId.current) return;
        setHits(next);
        setActive(0);
        setSearching(false);
      },
      isAccount ? 300 : 120,
    );
    return () => clearTimeout(t);
  }, [q, mode, isAccount, products]);

  const toPreview = (p: Preview, list?: ListName) => {
    setFound(p);
    if (list) setList(list);
    // Suggest a target 10% below the current price
    setTarget(String(Math.round(p.price * 0.9)));
    setStep("preview");
  };

  const choose = (h: Hit) => {
    if (h.followedId) {
      // Already followed: go to its page
      onClose();
      router.push(`/app/productos/${h.followedId}`);
      return;
    }
    if (h.catalog) {
      // Demo: fake a short loading step
      const c = h.catalog;
      setStep("loading");
      clearTimeout(timer.current);
      timer.current = setTimeout(() => toPreview(fromCatalog(c), c.list), 450);
      return;
    }
    if (h.catalogId) {
      toPreview({ name: h.name, image: h.image, icon: h.icon, store: h.store, price: h.price, catalogId: h.catalogId, stores: h.stores }, h.list);
      return;
    }
    if (h.url) toPreview({ name: h.name, image: h.image, icon: h.icon, store: h.store, price: h.price, url: h.url });
  };

  const detect = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!url.trim()) return;
    setStep("loading");
    if (isAccount) {
      // Real account: the server reads the store page
      try {
        const r = await previewProduct(url.trim());
        if (!r.ok) {
          setErrMsg(r.error);
          setStep("error");
          return;
        }
        const d = r.data;
        toPreview({ name: d.name, image: d.image, icon: "desktop", store: d.store, price: d.price, url: d.url });
      } catch {
        setErrMsg("No hemos podido conectar con el servidor.");
        setStep("error");
      }
      return;
    }
    // Demo: match the URL against the sample catalog after a fake delay
    const hit = detectFromUrl(url);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      if (hit) toPreview(fromCatalog(hit), hit.list);
      else {
        setErrMsg("Comprueba que es la página de un producto concreto de una tienda compatible, o búscalo por su nombre.");
        setStep("error");
      }
    }, 1000);
  };

  const confirm = async () => {
    if (step !== "preview" || saving) return;
    const t = parsePrice(target);
    const tgt = t > 0 ? t : null;

    // Real account: save on the server and only close if it worked
    const saveOnServer = async (add: () => Promise<boolean>) => {
      setSaving(true);
      const ok = await add();
      setSaving(false);
      if (ok) onClose();
    };
    if (isAccount && found.catalogId) {
      const catalogId = found.catalogId;
      return saveOnServer(() => addFromCatalog({ catalogId, target: tgt, list }));
    }
    if (isAccount && found.url) {
      const productUrl = found.url;
      return saveOnServer(() => addFromUrl({ url: productUrl, target: tgt, list }));
    }

    // Demo: add it to the local store
    if (found.catalog) addProduct({ ...productFromCatalog(found.catalog, tgt, products.length + 20), list });
    onClose();
  };

  const goUrl = () => {
    setMode("url");
    setStep("idle");
  };
  const goSearch = () => {
    setMode("search");
    setStep("idle");
  };

  // Suggestions before typing anything (demo only)
  const suggestions: Hit[] = isAccount ? [] : CATALOG.slice(0, 4).map(catalogHit);
  const typed = q.trim().length >= 2;
  const isSearching = searching && typed;
  const shown = typed ? hits : suggestions;

  // Keyboard: arrows move through the list (wrapping around), Enter picks
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!shown.length) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => (a + 1) % shown.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => (a - 1 + shown.length) % shown.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      choose(shown[Math.min(active, shown.length - 1)]);
    }
  };

  let title = "Añadir producto";
  if (step === "preview") title = "Confirmar producto";
  else if (mode === "url") title = "Pegar enlace";

  // A new key makes AnimatePresence fade between the steps
  const contentKey = step === "preview" ? "preview" : mode + (step === "loading" ? "-l" : "");
  const showSearch = mode === "search" && step !== "preview" && step !== "loading";
  const showUrl = mode === "url" && step !== "preview" && step !== "loading";

  return (
    <>
      <div className="flex items-center gap-3 px-5 pt-4 pb-3">
        {(mode === "url" || step === "preview") && (
          <button
            type="button"
            onClick={step === "preview" ? () => setStep("idle") : goSearch}
            aria-label="Volver"
            className="press -ml-1.5 grid size-8 cursor-pointer place-items-center rounded-md text-text-2 hover:bg-surface-3 hover:text-text"
          >
            <IconArrowLeft size={18} aria-hidden />
          </button>
        )}
        <h2 id="add-title" className="m-0 flex-1 text-base font-semibold">
          {title}
        </h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar"
          className="press grid size-8 cursor-pointer place-items-center rounded-md text-text-2 hover:bg-surface-3"
        >
          <IconX size={18} aria-hidden />
        </button>
      </div>

      <div className="flex min-h-0 flex-col gap-3.5 overflow-y-auto px-5 pb-5">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={contentKey}
            initial={{ opacity: 0, transform: "translateY(6px)" }}
            animate={{ opacity: 1, transform: "translateY(0px)" }}
            exit={{ opacity: 0, transition: { duration: 0.1 } }}
            transition={{ duration: 0.24, ease: [0.23, 1, 0.32, 1] }}
            className="flex flex-col gap-3.5"
          >
            {/* Search by name */}
            {showSearch && (
              <>
                <label className="relative flex items-center">
                  <IconSearch size={18} className="absolute left-3.5 text-text-3" aria-hidden />
                  <input
                    ref={inputRef}
                    value={q}
                    onChange={(e) => {
                      setQ(e.target.value);
                      // The spinner turns on here and the search response turns it off
                      if (e.target.value.trim().length >= 2) setSearching(true);
                    }}
                    onKeyDown={onKeyDown}
                    placeholder="Busca un producto: «auriculares Sony», «iPhone 17»…"
                    aria-label="Buscar un producto por su nombre"
                    role="combobox"
                    aria-expanded={shown.length > 0}
                    aria-controls={listboxId}
                    aria-activedescendant={shown.length ? `${listboxId}-${active}` : undefined}
                    autoComplete="off"
                    className="h-12 w-full rounded-xl border border-border-strong bg-surface-2 pr-10 pl-11 text-[15px] transition-[border-color,box-shadow] duration-200 placeholder:text-text-3 focus:border-brand focus:shadow-[0_0_0_4px_var(--brand-soft)] focus:outline-none"
                  />
                  <span className="absolute right-3 grid size-5 place-items-center text-text-3">
                    {isSearching && <IconLoader2 size={17} className="animate-spin text-brand" aria-hidden />}
                    {!isSearching && q && (
                      <button type="button" aria-label="Borrar búsqueda" onClick={() => setQ("")} className="grid cursor-pointer place-items-center border-none bg-transparent p-0 text-text-3 hover:text-text">
                        <IconX size={16} aria-hidden />
                      </button>
                    )}
                  </span>
                </label>

                {/* Min height so the modal doesn't jump around while results come in */}
                <div className="flex min-h-[312px] flex-col gap-3.5">
                  {!typed && !isAccount && <p className="m-0 -mb-1.5 text-[11px] font-semibold tracking-[.05em] text-text-3 uppercase">Sugerencias</p>}

                  {shown.length > 0 && (
                    <ul id={listboxId} role="listbox" aria-label="Resultados" className="m-0 flex list-none flex-col gap-0.5 p-0">
                      {shown.map((h, i) => (
                        <motion.li
                          key={h.key}
                          id={`${listboxId}-${i}`}
                          role="option"
                          aria-selected={i === active}
                          initial={{ opacity: 0, transform: "translateY(4px)" }}
                          animate={{ opacity: 1, transform: "translateY(0px)" }}
                          transition={{ duration: 0.22, delay: Math.min(i, 6) * 0.03, ease: [0.23, 1, 0.32, 1] }}
                          onMouseEnter={() => setActive(i)}
                          onClick={() => choose(h)}
                          className={cx(
                            "group row-accent flex cursor-pointer items-center gap-3 rounded-lg px-2.5 py-2 transition-colors",
                            i === active ? "bg-surface-3" : "hover:bg-surface-2",
                          )}
                        >
                          <ProductThumb icon={h.icon} image={h.image ?? undefined} size={44} />
                          <span className="flex min-w-0 flex-1 flex-col">
                            <span className="truncate text-[13px] font-medium">
                              <Highlight text={h.name} q={q} />
                            </span>
                            <span className="text-xs text-text-3">{hitSubtitle(h)}</span>
                          </span>
                          <span className="text-[13px] font-semibold">{eur(h.price)}</span>
                          <IconCornerDownLeft
                            size={15}
                            aria-hidden
                            className={cx("text-text-3 transition-opacity", i === active ? "opacity-100" : "opacity-0")}
                          />
                        </motion.li>
                      ))}
                    </ul>
                  )}

                  {typed && !isSearching && hits.length === 0 && (
                    <div className="flex flex-col items-center gap-1 rounded-xl border border-dashed border-border-strong px-4 py-6 text-center text-[13px] text-text-2">
                      {isAccount && !available ? (
                        <>
                          <IconSearch size={22} className="mb-1 text-text-3" aria-hidden />
                          <strong className="font-semibold text-text">La búsqueda por nombre aún no está disponible en tu cuenta</strong>
                          <span className="max-w-[360px]">
                            Todavía no hay un catálogo de tiendas conectado. Mientras tanto, puedes añadir el producto con su enlace.
                          </span>
                          <Button size="md" onClick={goUrl} className="mt-3">
                            <IconLink size={15} aria-hidden />
                            Pegar el enlace del producto
                          </Button>
                        </>
                      ) : (
                        <>
                          <strong className="font-semibold text-text">Sin resultados para «{q.trim()}»</strong>
                          <span>Prueba con otro nombre o pega el enlace del producto.</span>
                        </>
                      )}
                    </div>
                  )}

                  {isAccount && !typed && (
                    <p className="m-0 text-xs leading-relaxed text-text-3">
                      Busca entre casi 900 productos reales de Amazon, PcComponentes, El Corte Inglés, Fnac y otras tiendas. Es un
                      catálogo de prueba: los productos y sus precios de partida son reales; su evolución se simula.
                    </p>
                  )}
                </div>

                <button
                  type="button"
                  onClick={goUrl}
                  className="group mt-0.5 flex cursor-pointer items-center justify-center gap-1.5 self-center border-none bg-transparent p-1 text-[13px] text-text-2 transition-colors hover:text-brand-text"
                >
                  <IconLink size={15} aria-hidden />
                  ¿Tienes el enlace? <span className="link-anim font-medium">Pégalo aquí</span>
                  <IconArrowRight size={14} aria-hidden className="nudge" />
                </button>
              </>
            )}

            {/* Paste a link */}
            {showUrl && (
              <>
                <form onSubmit={detect} className="flex gap-2">
                  <label className="relative flex flex-1 items-center">
                    <IconLink size={16} className="absolute left-[11px] text-text-3" aria-hidden />
                    <input
                      ref={inputRef}
                      value={url}
                      onChange={(e) => {
                        setUrl(e.target.value);
                        if (step === "error") setStep("idle");
                      }}
                      placeholder="https://www.tienda.es/producto"
                      aria-label="Enlace del producto"
                      aria-invalid={step === "error"}
                      className={cx(
                        "h-11 w-full rounded-lg border bg-surface-2 pr-3 pl-[34px] text-[13px] transition-[border-color,box-shadow] duration-200 placeholder:text-text-3 focus:shadow-[0_0_0_4px_var(--brand-soft)] focus:outline-none",
                        step === "error" ? "border-up" : "border-border-strong focus:border-brand",
                      )}
                    />
                  </label>
                  <Button type="submit" size="md" className="h-11 rounded-lg">
                    Detectar
                  </Button>
                </form>
                {step === "idle" && (
                  <p className="m-0 text-xs text-text-3">
                    {isAccount
                      ? "Pega la dirección de la página de un producto. Funciona con las tiendas que publican los datos del producto en su web; algunas, como Amazon, no permiten leer sus páginas."
                      : `Pega la dirección de la página de un producto en ${SUPPORTED_STORES.slice(0, -1).join(", ")} o ${SUPPORTED_STORES.at(-1)}.`}
                  </p>
                )}
                {step === "error" && (
                  <div role="alert" className="flex gap-2.5 rounded-[10px] bg-up-soft px-3.5 py-3 text-[13px]">
                    <IconLinkOff size={18} className="shrink-0 text-up" aria-hidden />
                    <div className="flex flex-col gap-1">
                      <strong className="font-semibold">No hemos podido leer esta URL</strong>
                      <span className="text-text-2">{errMsg}</span>
                    </div>
                  </div>
                )}
                <button
                  type="button"
                  onClick={goSearch}
                  className="group flex cursor-pointer items-center justify-center gap-1.5 self-center border-none bg-transparent p-1 text-[13px] text-text-2 transition-colors hover:text-brand-text"
                >
                  <IconSearch size={15} aria-hidden />
                  <span className="link-anim font-medium">Buscar por nombre</span>
                </button>
              </>
            )}

            {/* Loading */}
            {step === "loading" && (
              <div aria-busy="true" aria-label="Cargando el producto" className="flex gap-3.5 rounded-[10px] border border-border p-3.5">
                <Skeleton className="size-20 rounded-xl" />
                <div className="flex flex-1 flex-col gap-2 pt-1">
                  <Skeleton className="h-2.5 w-2/5" />
                  <Skeleton className="h-[13px] w-3/4" />
                  <Skeleton className="h-[20px] w-[30%]" />
                </div>
              </div>
            )}

            {/* Preview */}
            {step === "preview" && (
              <Fragment>
                <div className="flex flex-col overflow-hidden rounded-[10px] border border-brand-soft-border/70 shadow-[0_12px_30px_-18px_var(--glow)]">
                  <div className="flex gap-3.5 p-3.5">
                    <ProductThumb icon={found.icon} image={found.image ?? undefined} size={80} radius={12} />
                    <div className="flex min-w-0 flex-1 flex-col gap-[3px]">
                      <span className="inline-flex items-center gap-[5px] text-xs font-medium text-down">
                        <IconCircleCheck size={14} aria-hidden />
                        {previewSource(found)}
                      </span>
                      <span className="text-[15px] leading-[1.3] font-semibold">{found.name}</span>
                      <span className="text-xl font-semibold tracking-[-0.02em]">{eur(found.price)}</span>
                    </div>
                  </div>
                  <div className="border-t border-border bg-surface-2 px-3.5 py-2.5 text-xs text-text-2">
                    {previewNote(found)}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <label className="flex flex-col gap-1.5 text-xs font-medium text-text-2">
                    Avísame si baja de
                    <span className="flex h-10 items-center rounded-lg border border-border-strong bg-surface px-2.5 transition-[border-color,box-shadow] duration-200 focus-within:border-brand focus-within:shadow-[0_0_0_4px_var(--brand-soft)]">
                      <input
                        ref={inputRef}
                        value={target}
                        onChange={(e) => setTarget(e.target.value)}
                        inputMode="decimal"
                        aria-label="Precio objetivo"
                        className="min-w-0 flex-1 border-none bg-transparent text-sm font-semibold text-text outline-none"
                      />
                      <span className="text-text-3">€</span>
                    </span>
                  </label>
                  <label className="flex flex-col gap-1.5 text-xs font-medium text-text-2">
                    Lista
                    <span className="relative flex">
                      <select
                        value={list}
                        onChange={(e) => setList(e.target.value as ListName)}
                        className="h-10 w-full cursor-pointer appearance-none rounded-lg border border-border-strong bg-surface pr-7 pl-2.5 text-[13px] text-text"
                      >
                        <option>Tecnología</option>
                        <option>Hogar</option>
                      </select>
                      <IconSelector size={14} className="pointer-events-none absolute top-1/2 right-2 -translate-y-1/2 text-text-3" aria-hidden />
                    </span>
                  </label>
                </div>
              </Fragment>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {step === "preview" && (
        <div className="flex items-center justify-end gap-2 border-t border-border bg-surface-2 px-5 py-3">
          <Button variant="secondary" size="md" onClick={() => setStep("idle")}>
            Elegir otro
          </Button>
          <Button size="md" onClick={confirm} disabled={saving}>
            {saving ? "Añadiendo…" : "Añadir a mis productos"}
          </Button>
        </div>
      )}
    </>
  );
}
