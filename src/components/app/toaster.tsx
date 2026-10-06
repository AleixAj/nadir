"use client";

// Small message at the bottom of the screen after an action ("Alerta guardada"...)
import { useEffect } from "react";
import { AnimatePresence, motion } from "motion/react";
import { IconCheck, IconX } from "@tabler/icons-react";
import { useDemo } from "@/lib/store";
import { cx } from "@/components/ui";

export function Toaster() {
  const toast = useDemo((s) => s.toast);
  const hide = useDemo((s) => s.hideToast);

  // Hide the toast after a few seconds
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(hide, 2800);
    return () => clearTimeout(t);
  }, [toast, hide]);

  return (
    <div
      aria-live="polite"
      role="status"
      className="pointer-events-none fixed right-4 bottom-20 z-[60] desk:right-6 desk:bottom-6"
    >
      <AnimatePresence>
        {toast && (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, transform: "translateY(12px) scale(0.96)" }}
            animate={{ opacity: 1, transform: "translateY(0px) scale(1)" }}
            exit={{
              opacity: 0,
              transform: "translateY(6px) scale(0.98)",
              transition: { duration: 0.15 },
            }}
            transition={{ duration: 0.28, ease: [0.23, 1, 0.32, 1] }}
            className="flex max-w-[min(420px,calc(100vw-32px))] items-center gap-2.5 rounded-lg bg-toast-bg py-2.5 pr-3.5 pl-2.5 text-[13px] font-medium text-toast-text shadow-lg"
          >
            <ToastIcon isError={toast.tone === "error"} />
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Red cross for errors, green tick otherwise
function ToastIcon({ isError }: { isError: boolean }) {
  return (
    <span
      className={cx(
        "grid size-5 shrink-0 place-items-center rounded-full text-white",
        isError ? "bg-[#dc2626]" : "bg-[#16a34a]",
      )}
    >
      {isError ? (
        <IconX size={13} aria-hidden />
      ) : (
        <IconCheck size={13} aria-hidden />
      )}
    </span>
  );
}
