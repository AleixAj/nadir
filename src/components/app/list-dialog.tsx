"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { IconCheck, IconTrash, IconX } from "@tabler/icons-react";
import { Button, cx } from "@/components/ui";
import { LIST_COLORS, type ProductList } from "@/lib/demo-data";
import { useDemo } from "@/lib/store";

// Dialog to create a list or edit one (name, colour and delete)
export function ListDialog() {
  const editing = useDemo((s) => s.listEditor);
  const close = useDemo((s) => s.closeListEditor);
  const lists = useDemo((s) => s.lists);

  // Close with Escape
  useEffect(() => {
    if (!editing) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [editing, close]);

  const list = lists.find((l) => l.id === editing) ?? null;

  return (
    <AnimatePresence>
      {editing && (
        <motion.div
          key="overlay"
          onClick={close}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.15 } }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-overlay p-4 backdrop-blur-[2px]"
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="list-title"
            onClick={(e) => e.stopPropagation()}
            initial={{ opacity: 0, transform: "scale(0.96) translateY(4px)" }}
            animate={{ opacity: 1, transform: "scale(1) translateY(0px)" }}
            exit={{ opacity: 0, transform: "scale(0.98)", transition: { duration: 0.12 } }}
            transition={{ duration: 0.22, ease: [0.23, 1, 0.32, 1] }}
            className="surface-grad w-full max-w-[400px] rounded-xl border border-border bg-surface shadow-[0_30px_80px_-30px_var(--glow)]"
          >
            {/* key: start with fresh fields every time it opens */}
            <ListForm key={editing} list={list} onClose={close} />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function ListForm({ list, onClose }: { list: ProductList | null; onClose: () => void }) {
  const createList = useDemo((s) => s.createList);
  const updateList = useDemo((s) => s.updateList);
  const deleteList = useDemo((s) => s.deleteList);
  const count = useDemo((s) => s.products.filter((p) => list && p.list === list.id).length);
  const [name, setName] = useState(list?.name ?? "");
  const [color, setColor] = useState(list?.color ?? LIST_COLORS[0]);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const ok = list ? await updateList(list.id, { name, color }) : await createList({ name, color });
    setSaving(false);
    if (ok) onClose();
  };

  // Two steps: the first click asks for confirmation
  const onDelete = async () => {
    if (!list) return;
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    setSaving(true);
    const ok = await deleteList(list.id);
    setSaving(false);
    if (ok) onClose();
  };

  const customColor = !LIST_COLORS.includes(color);

  return (
    <form onSubmit={onSubmit}>
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <h2 id="list-title" className="m-0 text-sm font-semibold">
          {list ? "Editar lista" : "Nueva lista"}
        </h2>
        <button type="button" onClick={onClose} aria-label="Cerrar" className="grid size-7 place-items-center rounded-md text-text-3 hover:bg-surface-3 hover:text-text">
          <IconX size={16} aria-hidden />
        </button>
      </div>

      <div className="flex flex-col gap-4 p-4">
        <label className="flex flex-col gap-1.5 text-xs font-medium text-text-2">
          Nombre
          <span className="flex h-10 items-center gap-2.5 rounded-lg border border-border-strong bg-surface px-3 transition-colors focus-within:border-brand">
            <span className="size-2.5 shrink-0 rounded-[3px]" style={{ background: color }} />
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={30}
              placeholder="Por ejemplo: Regalos"
              className="min-w-0 flex-1 border-none bg-transparent text-sm text-text outline-none placeholder:text-text-3"
            />
          </span>
        </label>

        <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
          <legend className="mb-2 p-0 text-xs font-medium text-text-2">Color</legend>
          <div className="flex flex-wrap gap-2">
            {LIST_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                aria-label={`Color ${c}`}
                aria-pressed={color === c}
                className="press grid size-7 place-items-center rounded-full ring-offset-2 ring-offset-surface transition-shadow"
                style={{ background: c, boxShadow: color === c ? `0 0 0 2px var(--surface), 0 0 0 4px ${c}` : undefined }}
              >
                {color === c && <IconCheck size={14} className="text-white" aria-hidden />}
              </button>
            ))}
            {/* Any other colour with the browser's colour picker */}
            <label
              title="Otro color"
              className={cx(
                "press relative grid size-7 cursor-pointer place-items-center overflow-hidden rounded-full border border-dashed border-border-strong text-xs text-text-3",
                customColor && "border-solid",
              )}
              style={customColor ? { background: color, boxShadow: `0 0 0 2px var(--surface), 0 0 0 4px ${color}` } : undefined}
            >
              {customColor ? <IconCheck size={14} className="text-white" aria-hidden /> : "+"}
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                aria-label="Otro color"
                className="absolute inset-0 cursor-pointer opacity-0"
              />
            </label>
          </div>
        </fieldset>
      </div>

      <div className="flex items-center gap-2 rounded-b-xl border-t border-border bg-surface-2 px-4 py-3">
        {list && (
          <Button variant="ghost" disabled={saving} onClick={onDelete} className={cx(confirmDelete && "text-up")}>
            <IconTrash size={15} aria-hidden />
            {confirmDelete ? "¿Seguro?" : "Eliminar"}
          </Button>
        )}
        <div className="flex-1" />
        {confirmDelete && count > 0 && (
          <span className="text-xs text-text-3">
            {count === 1 ? "Su producto quedará sin lista" : `Sus ${count} productos quedarán sin lista`}
          </span>
        )}
        {!confirmDelete && (
          <Button type="submit" disabled={saving || !name.trim()}>
            {saving ? "Guardando…" : list ? "Guardar" : "Crear lista"}
          </Button>
        )}
      </div>
    </form>
  );
}
