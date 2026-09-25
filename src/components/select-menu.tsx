"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion } from "motion/react";
import { IconCheck, IconSelector } from "@tabler/icons-react";
import { cx } from "@/components/ui";

export interface SelectOption {
  value: string;
  label: string;
  // Optional colour dot (for lists)
  color?: string;
}

// Dropdown with the app's look. Native <select> menus are drawn by the operating system
// and ignore the app's colours, so this replaces them.
// Keyboard: Enter/Space/Arrow down opens, arrows move, Enter picks, Escape closes.
export function SelectMenu({
  value,
  options,
  onChange,
  label,
  className,
}: {
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  // Accessible name, e.g. "Ordenar por"
  label: string;
  // Classes for the button (size, background, border...)
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  // Where to draw the menu (fixed position, so dialogs with hidden overflow don't cut it)
  const [pos, setPos] = useState<{ left: number; top?: number; bottom?: number; width: number } | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const listId = useId();

  const selected = options.find((o) => o.value === value) ?? options[0];

  const openMenu = () => {
    const rect = buttonRef.current?.getBoundingClientRect();
    if (!rect) return;
    const menuHeight = Math.min(options.length * 36 + 8, 280);
    // Open upwards if there's no room below
    const below = window.innerHeight - rect.bottom > menuHeight + 8;
    setPos({
      left: rect.left,
      width: Math.max(rect.width, 180),
      ...(below ? { top: rect.bottom + 6 } : { bottom: window.innerHeight - rect.top + 6 }),
    });
    setActive(
      Math.max(
        0,
        options.findIndex((o) => o.value === value),
      ),
    );
    setOpen(true);
  };

  const close = (focusButton = true) => {
    setOpen(false);
    if (focusButton) buttonRef.current?.focus();
  };

  const pick = (option: SelectOption) => {
    if (option.value !== value) onChange(option.value);
    close();
  };

  // Close when clicking outside, scrolling or resizing (the menu would be out of place)
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (!listRef.current?.contains(target) && !buttonRef.current?.contains(target)) setOpen(false);
    };
    const onScroll = (e: Event) => {
      if (!listRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onScroll);
    // Focus the list so the arrow keys work straight away
    listRef.current?.focus();
    return () => {
      document.removeEventListener("mousedown", onDown);
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onScroll);
    };
  }, [open]);

  const onButtonKey = (e: React.KeyboardEvent) => {
    if (["ArrowDown", "ArrowUp", "Enter", " "].includes(e.key)) {
      e.preventDefault();
      openMenu();
    }
  };

  const onListKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => (a + 1) % options.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => (a - 1 + options.length) % options.length);
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      pick(options[active]);
    } else if (e.key === "Escape") {
      // Don't let the Escape also close a dialog behind
      e.preventDefault();
      e.stopPropagation();
      close();
    } else if (e.key === "Tab") {
      close(false);
    }
  };

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        aria-label={`${label}: ${selected?.label ?? ""}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        onClick={() => (open ? close() : openMenu())}
        onKeyDown={onButtonKey}
        className={cx("inline-flex cursor-pointer items-center gap-1.5 text-left", className)}
      >
        {selected?.color && <span className="size-2 shrink-0 rounded-[2px]" style={{ background: selected.color }} />}
        <span className="min-w-0 flex-1 truncate">{selected?.label}</span>
        <IconSelector size={13} className="shrink-0 text-text-3" aria-hidden />
      </button>

      {/* Portal: drawn at the end of <body>, above everything (also above dialogs) */}
      {open &&
        pos &&
        createPortal(
          <motion.ul
            ref={listRef}
            id={listId}
            role="listbox"
            aria-label={label}
            aria-activedescendant={`${listId}-${active}`}
            tabIndex={-1}
            onKeyDown={onListKey}
            initial={{ opacity: 0, transform: "scale(0.97) translateY(-2px)" }}
            animate={{ opacity: 1, transform: "scale(1) translateY(0px)" }}
            transition={{ duration: 0.14, ease: [0.23, 1, 0.32, 1] }}
            style={{ position: "fixed", left: pos.left, top: pos.top, bottom: pos.bottom, minWidth: pos.width }}
            className="z-[70] m-0 max-h-[280px] list-none overflow-y-auto rounded-lg border border-border-strong bg-surface p-1 shadow-[0_16px_40px_-12px_rgba(0,0,0,0.55)] outline-none"
          >
            {options.map((o, i) => {
              const isSelected = o.value === value;
              return (
                <li
                  key={o.value}
                  id={`${listId}-${i}`}
                  role="option"
                  aria-selected={isSelected}
                  onMouseEnter={() => setActive(i)}
                  // mousedown instead of click, so the list doesn't lose focus first
                  onMouseDown={(e) => {
                    e.preventDefault();
                    pick(o);
                  }}
                  className={cx(
                    "flex h-9 cursor-pointer items-center gap-2 rounded-md px-2.5 text-[13px]",
                    i === active ? "bg-surface-3 text-text" : "text-text-2",
                    isSelected && "font-medium text-brand-text",
                  )}
                >
                  {o.color && <span className="size-2 shrink-0 rounded-[2px]" style={{ background: o.color }} />}
                  <span className="flex-1 truncate">{o.label}</span>
                  {isSelected && <IconCheck size={14} className="shrink-0 text-brand-text" aria-hidden />}
                </li>
              );
            })}
          </motion.ul>,
          document.body,
        )}
    </>
  );
}
