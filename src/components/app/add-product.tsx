"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { IconCircleCheck, IconLink, IconLinkOff, IconSearch, IconSelector, IconX } from "@tabler/icons-react";
import {
  CATALOG,
  detectFromUrl,
  EXAMPLE_URL,
  productFromCatalog,
  searchCatalog,
  SUPPORTED_STORES,
  type CatalogItem,
  type ListName,
} from "@/lib/demo-data";
import { eur, parsePrice } from "@/lib/format";
import { useIsMobile } from "@/lib/hooks";
import { useDemo } from "@/lib/store";
import { Button, cx, ProductThumb, Segmented, Skeleton } from "@/components/ui";

type Mode = "url" | "search";
type Step = "idle" | "loading" | "error" | "preview";

export function AddProductModal() {
  const open = useDemo((s) => s.addOpen);
  const close = useDemo((s) => s.closeAdd);
  const mobile = useIsMobile();
  const reduce = useReducedMotion();

  // Escape para cerrar
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, close]);

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
          className={cx("fixed inset-0 z-50 flex justify-center bg-overlay", mobile ? "items-end p-0" : "items-center p-4")}
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
              "flex max-h-[92vh] w-full max-w-[540px] flex-col overflow-hidden border border-border bg-surface shadow-lg",
              mobile ? "rounded-t-[14px]" : "rounded-xl",
            )}
          >
            <AddProductBody onClose={close} />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function AddProductBody({ onClose }: { onClose: () => void }) {
  const addProduct = useDemo((s) => s.addProduct);
  const productsCount = useDemo((s) => s.products.length);
  const [mode, setMode] = useState<Mode>("url");
  const [q, setQ] = useState(EXAMPLE_URL);
  const [step, setStep] = useState<Step>("idle");
  const [found, setFound] = useState<CatalogItem>(CATALOG[0]);
  const [target, setTarget] = useState("159");
  const [list, setList] = useState<ListName>(CATALOG[0].list);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => () => clearTimeout(timer.current), []);
  useEffect(() => {
    inputRef.current?.focus();
  }, [mode]);

  const pick = (c: CatalogItem, delay: number) => {
    setStep("loading");
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      setFound(c);
      setList(c.list);
      setTarget(String(Math.round(c.price * 0.9)));
      setStep("preview");
    }, delay);
  };

  const detect = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (mode !== "url") return;
    const hit = detectFromUrl(q);
    if (hit) pick(hit, 1100);
    else {
      setStep("loading");
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setStep("error"), 1100);
    }
  };

  const confirm = () => {
    if (step !== "preview") return;
    const t = parsePrice(target);
    addProduct({ ...productFromCatalog(found, t > 0 ? t : null, productsCount + 20), list });
    onClose();
  };

  const results = mode === "search" ? searchCatalog(q) : [];
  const showResults = mode === "search" && step !== "preview" && step !== "loading" && q.trim().length > 1;
  const isUrl = mode === "url";

  return (
    <>
      <div className="flex items-center gap-3 px-5 pt-4 pb-3">
        <h2 id="add-title" className="m-0 flex-1 text-base font-semibold">
          Añadir producto
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
      <div className="flex flex-col gap-3.5 overflow-y-auto px-5 pb-5">
        <Segmented<Mode>
          role="tablist"
          label="Cómo añadir"
          full
          value={mode}
          onChange={(v) => {
            setMode(v);
            setQ(v === "url" ? EXAMPLE_URL : "");
            setStep("idle");
          }}
          options={[
            { value: "url", label: "Pegar URL", icon: IconLink },
            { value: "search", label: "Buscar por nombre", icon: IconSearch },
          ]}
        />
        <form onSubmit={detect} className="flex gap-2">
          <label className="relative flex flex-1 items-center">
            {isUrl ? (
              <IconLink size={16} className="absolute left-[11px] text-text-3" aria-hidden />
            ) : (
              <IconSearch size={16} className="absolute left-[11px] text-text-3" aria-hidden />
            )}
            <input
              ref={inputRef}
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                if (step !== "loading") setStep("idle");
              }}
              placeholder={isUrl ? "https://tienda.es/producto" : "Nombre del producto"}
              aria-label={isUrl ? "URL del producto" : "Nombre del producto"}
              aria-invalid={step === "error"}
              className={cx(
                "h-10 w-full rounded-lg border bg-surface pr-3 pl-[34px] text-[13px] transition-colors placeholder:text-text-3",
                step === "error" ? "border-up" : "border-border-strong",
              )}
            />
          </label>
          {isUrl && (
            <Button type="submit" variant="secondary" className="h-10 rounded-lg bg-surface-2 shadow-none hover:bg-surface-3">
              Detectar
            </Button>
          )}
        </form>

        <AnimatePresence mode="popLayout" initial={false}>
          <motion.div
            key={step + mode}
            initial={{ opacity: 0, transform: "translateY(4px)" }}
            animate={{ opacity: 1, transform: "translateY(0px)" }}
            exit={{ opacity: 0, transition: { duration: 0.1 } }}
            transition={{ duration: 0.22, ease: [0.23, 1, 0.32, 1] }}
            className="flex flex-col gap-3.5"
          >
            {isUrl && step === "idle" && (
              <p className="m-0 text-xs text-text-3">
                Pega la dirección de la página de un producto en {SUPPORTED_STORES.slice(0, -1).join(", ")} o{" "}
                {SUPPORTED_STORES.at(-1)}.
              </p>
            )}

            {step === "loading" && (
              <div aria-busy="true" aria-label="Leyendo la página del producto" className="flex gap-3.5 rounded-[10px] border border-border p-3.5">
                <Skeleton className="size-16 rounded-[10px]" />
                <div className="flex flex-1 flex-col gap-2 pt-1">
                  <Skeleton className="h-[13px] w-3/4" />
                  <Skeleton className="h-2.5 w-2/5" />
                  <Skeleton className="h-[18px] w-[30%]" />
                </div>
              </div>
            )}

            {step === "error" && (
              <div role="alert" className="flex gap-2.5 rounded-[10px] bg-up-soft px-3.5 py-3 text-[13px]">
                <IconLinkOff size={18} className="shrink-0 text-up" aria-hidden />
                <div className="flex flex-col gap-1">
                  <strong className="font-semibold">No hemos podido leer esta URL</strong>
                  <span className="text-text-2">
                    Comprueba que es la página de un producto concreto de una tienda compatible, o búscalo por su nombre.
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setMode("search");
                      setQ("");
                      setStep("idle");
                    }}
                    className="mt-1 cursor-pointer self-start border-none bg-transparent p-0 text-[13px] font-medium text-text underline"
                  >
                    Buscar por nombre
                  </button>
                </div>
              </div>
            )}

            {showResults && (
              <div className="flex flex-col overflow-hidden rounded-[10px] border border-border">
                {results.map((x, i) => (
                  <button
                    key={x.slug}
                    type="button"
                    onClick={() => pick(x, 700)}
                    className={cx(
                      "flex cursor-pointer items-center gap-3 border-0 bg-transparent px-3 py-2.5 text-left transition-colors hover:bg-surface-2",
                      i > 0 && "border-t border-border",
                    )}
                  >
                    <ProductThumb icon={x.icon} size={44} />
                    <span className="flex flex-1 flex-col">
                      <span className="text-[13px] font-medium">{x.name}</span>
                      <span className="text-xs text-text-3">
                        {x.store} · {x.list}
                      </span>
                    </span>
                    <span className="text-[13px] font-semibold">{eur(x.price)}</span>
                  </button>
                ))}
                {results.length === 0 && <p className="m-0 p-4 text-center text-[13px] text-text-2">Sin resultados para «{q}».</p>}
              </div>
            )}

            {step === "preview" && (
              <>
                <div className="flex flex-col overflow-hidden rounded-[10px] border border-border">
                  <div className="flex gap-3.5 p-3.5">
                    <ProductThumb icon={found.icon} size={80} radius={12} />
                    <div className="flex min-w-0 flex-1 flex-col gap-[3px]">
                      <span className="inline-flex items-center gap-[5px] text-xs font-medium text-down">
                        <IconCircleCheck size={14} aria-hidden />
                        Detectado en {found.store}
                      </span>
                      <span className="text-[15px] leading-[1.3] font-semibold">{found.name}</span>
                      <span className="text-xl font-semibold tracking-[-0.02em]">{eur(found.price)}</span>
                    </div>
                  </div>
                  <div className="border-t border-border bg-surface-2 px-3.5 py-2.5 text-xs text-text-2">
                    También disponible en {found.others}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <label className="flex flex-col gap-1.5 text-xs font-medium text-text-2">
                    Precio objetivo
                    <span className="flex h-9 items-center rounded-md border border-border-strong bg-surface px-2.5 focus-within:border-brand">
                      <input
                        value={target}
                        onChange={(e) => setTarget(e.target.value)}
                        inputMode="decimal"
                        className="min-w-0 flex-1 border-none bg-transparent text-[13px] font-medium text-text outline-none"
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
                        className="h-9 w-full cursor-pointer appearance-none rounded-md border border-border-strong bg-surface pr-7 pl-2.5 text-[13px] text-text"
                      >
                        <option>Tecnología</option>
                        <option>Hogar</option>
                      </select>
                      <IconSelector size={14} className="pointer-events-none absolute top-1/2 right-2 -translate-y-1/2 text-text-3" aria-hidden />
                    </span>
                  </label>
                </div>
              </>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
      <div className="flex items-center justify-end gap-2 border-t border-border bg-surface-2 px-5 py-3">
        <Button variant="secondary" size="md" onClick={onClose}>
          Cancelar
        </Button>
        <Button size="md" onClick={confirm} disabled={step !== "preview"}>
          Añadir a mis productos
        </Button>
      </div>
    </>
  );
}
