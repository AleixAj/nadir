"use client";

// Bottom navigation bar on mobile
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";
import { IconSettings } from "@tabler/icons-react";
import { cx } from "@/components/ui";
import { isActive, NAV, useActiveAlertCount } from "./nav-items";

export function MobileNav() {
  const path = usePathname();
  const activeCount = useActiveAlertCount();
  // Mobile uses the short labels and adds Settings at the end
  const items = [
    ...NAV.map((n) => ({ ...n, label: n.short })),
    {
      href: "/app/ajustes",
      label: "Ajustes",
      short: "Ajustes",
      icon: IconSettings,
    },
  ];
  return (
    <nav
      aria-label="Navegación principal"
      className="fixed inset-x-0 bottom-0 z-20 grid h-16 grid-cols-5 border-t border-border bg-surface/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-md desk:hidden"
    >
      {items.map((n) => {
        const active = isActive(path, n.href);
        const Ic = n.icon;
        return (
          <Link
            key={n.href}
            href={n.href}
            aria-current={active ? "page" : undefined}
            className={cx(
              "press relative flex flex-col items-center justify-center gap-[3px] text-[11px] font-medium",
              active ? "text-brand-text" : "text-text-2",
            )}
          >
            {active && (
              <motion.span
                layoutId="mobile-nav-active"
                className="absolute top-0 h-[2px] w-8 rounded-full bg-brand shadow-[0_0_10px_var(--glow)]"
                transition={{ type: "spring", duration: 0.35, bounce: 0.15 }}
              />
            )}
            <Ic size={22} aria-hidden />
            {n.label}
            {n.href === "/app/alertas" && activeCount > 0 && (
              <span className="absolute top-2 left-[calc(50%+6px)] grid h-4 min-w-4 place-items-center rounded-full bg-brand-solid px-1 text-[10px] font-semibold text-on-brand">
                {activeCount}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
