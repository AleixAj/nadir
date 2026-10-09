"use client";

// Small modal that asks "are you sure?" before doing something that can't be undone,
// like unfollowing a product. Closes with Escape, Cancel or a click outside.
import { useEffect, useRef, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "motion/react";
import { IconAlertTriangle } from "@tabler/icons-react";
import { Button } from "@/components/ui";
import { useDialogFocus } from "@/lib/hooks";

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  busy = false,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  description: React.ReactNode;
  confirmLabel: string;
  // While the action runs, the buttons are disabled and the dialog can't be closed
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  useDialogFocus(open, panelRef);

  const cancel = () => {
    if (!busy) onCancel();
  };

  // Close with Escape
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busy) onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, busy, onCancel]);

  // Drawn at the end of <body> (only in the browser), so it always covers the whole page
  // even when the button that opens it is inside a smaller layer
  const inBrowser = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  if (!inBrowser) return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          key="overlay"
          onClick={cancel}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.15 } }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-overlay p-4 backdrop-blur-[2px]"
        >
          <motion.div
            ref={panelRef}
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="confirm-title"
            aria-describedby="confirm-text"
            onClick={(e) => e.stopPropagation()}
            initial={{ opacity: 0, transform: "scale(0.96) translateY(4px)" }}
            animate={{ opacity: 1, transform: "scale(1) translateY(0px)" }}
            exit={{ opacity: 0, transform: "scale(0.98)", transition: { duration: 0.12 } }}
            transition={{ duration: 0.22, ease: [0.23, 1, 0.32, 1] }}
            className="surface-grad w-full max-w-[400px] rounded-xl border border-border bg-surface shadow-[0_30px_80px_-30px_rgba(0,0,0,0.6)]"
          >
            <div className="flex gap-3.5 p-5">
              <span className="grid size-10 shrink-0 place-items-center rounded-full bg-up-soft text-up">
                <IconAlertTriangle size={20} aria-hidden />
              </span>
              <div className="flex min-w-0 flex-col gap-1.5">
                <h2 id="confirm-title" className="m-0 text-[15px] font-semibold">
                  {title}
                </h2>
                <p id="confirm-text" className="m-0 text-[13px] leading-relaxed text-text-2">
                  {description}
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-2 rounded-b-xl border-t border-border bg-surface-2 px-5 py-3">
              {/* Cancel gets the focus first, so pressing Enter by mistake doesn't delete anything */}
              <Button variant="secondary" size="md" onClick={cancel} disabled={busy} autoFocus>
                Cancelar
              </Button>
              <Button variant="danger" size="md" onClick={onConfirm} disabled={busy}>
                {busy ? "Un momento…" : confirmLabel}
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
