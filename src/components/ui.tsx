"use client";

import { motion } from "motion/react";
import Image from "next/image";
import Link from "next/link";
import { useId, type ComponentProps, type ReactNode } from "react";
import {
  IconArmchair,
  IconBlender,
  IconCoffee,
  IconDeviceDesktop,
  IconDeviceMobile,
  IconDeviceSpeaker,
  IconDeviceTablet,
  IconDeviceWatch,
  IconHeadphones,
  IconKeyboard,
  IconLamp,
  IconMinus,
  IconMouse,
  IconRobot,
  IconToolsKitchen2,
  IconTrendingDown,
  IconTrendingUp,
  IconWind,
  type Icon,
} from "@tabler/icons-react";
import type { ProductIcon } from "@/lib/demo-data";
import { pctS } from "@/lib/format";

export const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");

/* ─── Marca ─────────────────────────────────────────────────── */

export function LogoMark({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <rect width="24" height="24" rx="6" fill="#ea580c" />
      <path d="M5 7.5c3 0 4 8.5 7 8.5s4-8.5 7-8.5" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" />
      <circle cx="12" cy="16" r="2.3" fill="#fff" />
    </svg>
  );
}

export function Logo({ size = 22, text = 16 }: { size?: number; text?: number }) {
  return (
    <span className="flex items-center gap-[9px]">
      <LogoMark size={size} />
      <span className="font-semibold tracking-[-0.025em]" style={{ fontSize: text }}>
        nadir
      </span>
    </span>
  );
}

/* ─── Botones ───────────────────────────────────────────────── */

type Variant = "primary" | "secondary" | "ghost";
type Size = "sm" | "md" | "lg";

const variants: Record<Variant, string> = {
  primary: "bg-brand-solid text-on-brand hover:bg-brand-solid-hover border border-transparent",
  secondary: "bg-surface text-text border border-border-strong shadow-sm hover:bg-surface-2",
  ghost: "bg-transparent text-text border border-transparent hover:bg-surface-3",
};
const sizes: Record<Size, string> = {
  sm: "h-8 px-3 text-[13px] rounded-md gap-1.5",
  md: "h-9 px-3.5 text-[13px] rounded-md gap-1.5",
  lg: "h-11 px-5 text-[15px] rounded-lg gap-2",
};

export const btn = (variant: Variant = "primary", size: Size = "sm", extra?: string) =>
  cx(
    "press inline-flex items-center justify-center font-medium whitespace-nowrap cursor-pointer disabled:cursor-not-allowed disabled:opacity-50",
    variants[variant],
    sizes[size],
    extra,
  );

export function Button({
  variant = "primary",
  size = "sm",
  className,
  ...props
}: ComponentProps<"button"> & { variant?: Variant; size?: Size }) {
  return <button type="button" className={btn(variant, size, className)} {...props} />;
}

export function ButtonLink({
  variant = "primary",
  size = "sm",
  className,
  ...props
}: ComponentProps<typeof Link> & { variant?: Variant; size?: Size }) {
  return <Link className={btn(variant, size, cx("no-underline", className))} {...props} />;
}

/* ─── Interruptor ───────────────────────────────────────────── */

export function Switch({ on, onChange, label }: { on: boolean; onChange: () => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={onChange}
      className={cx(
        "press flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-none p-0.5",
        on ? "bg-brand-solid" : "bg-border-strong",
      )}
    >
      <span
        className="size-4 rounded-full bg-white shadow-[0_1px_2px_rgba(0,0,0,.25)] transition-transform duration-200 ease-out-strong"
        style={{ transform: on ? "translateX(16px)" : "none" }}
      />
    </button>
  );
}

/* ─── Control segmentado con indicador deslizante ───────────── */

export interface SegOption<T extends string> {
  value: T;
  label: ReactNode;
  count?: string | number;
  icon?: Icon;
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  label,
  size = "md",
  role = "group",
  full,
}: {
  options: SegOption<T>[];
  value: T;
  onChange: (v: T) => void;
  label: string;
  size?: "sm" | "md";
  role?: "group" | "tablist";
  full?: boolean;
}) {
  const id = useId();
  return (
    <div
      role={role}
      aria-label={label}
      className={cx("inline-flex max-w-full gap-0.5 overflow-x-auto rounded-lg bg-surface-3 p-0.5", full && "flex w-full")}
    >
      {options.map((o) => {
        const on = o.value === value;
        const Ic = o.icon;
        return (
          <button
            key={o.value}
            type="button"
            role={role === "tablist" ? "tab" : undefined}
            aria-selected={role === "tablist" ? on : undefined}
            aria-pressed={role === "group" ? on : undefined}
            onClick={() => onChange(o.value)}
            className={cx(
              "relative inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-md border-none bg-transparent font-medium whitespace-nowrap transition-colors duration-150",
              size === "sm" ? "h-[26px] min-w-10 px-2 text-xs" : "h-9 px-2.5 text-[13px] desk:h-7",
              on ? "text-text" : "text-text-2 hover:text-text",
              full && "flex-1",
            )}
          >
            {on && (
              <motion.span
                layoutId={id}
                className="absolute inset-0 rounded-md bg-seg-active shadow-sm"
                transition={{ type: "spring", duration: 0.35, bounce: 0.1 }}
              />
            )}
            <span className="relative inline-flex items-center gap-1.5">
              {Ic && <Ic size={15} aria-hidden />}
              {o.label}
              {o.count != null && <span className="text-xs text-text-3">{o.count}</span>}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/* ─── Productos ─────────────────────────────────────────────── */

const PRODUCT_ICONS: Record<ProductIcon, Icon> = {
  headphones: IconHeadphones,
  phone: IconDeviceMobile,
  mouse: IconMouse,
  robot: IconRobot,
  coffee: IconCoffee,
  desktop: IconDeviceDesktop,
  keyboard: IconKeyboard,
  watch: IconDeviceWatch,
  kitchen: IconToolsKitchen2,
  tablet: IconDeviceTablet,
  speaker: IconDeviceSpeaker,
  lamp: IconLamp,
  blender: IconBlender,
  armchair: IconArmchair,
  wind: IconWind,
};

/** Miniatura del producto: su foto sobre blanco o, si no tiene, un icono. */
export function ProductThumb({
  icon,
  image,
  size = 40,
  radius = 8,
}: {
  icon: ProductIcon;
  image?: string;
  size?: number;
  radius?: number;
}) {
  if (image) {
    return (
      <span
        className="relative block shrink-0 overflow-hidden border border-border bg-white"
        style={{ width: size, height: size, borderRadius: radius }}
      >
        <Image
          src={image}
          alt=""
          fill
          sizes={`${size}px`}
          // Las fotos de las tiendas (cuentas reales) se cargan tal cual: pueden venir de cualquier dominio
          unoptimized={image.startsWith("http")}
          className="object-contain p-[6%]"
        />
      </span>
    );
  }
  const Ic = PRODUCT_ICONS[icon];
  return (
    <span
      className="grid shrink-0 place-items-center border border-border bg-surface-2 text-text-2"
      style={{ width: size, height: size, borderRadius: radius }}
      aria-hidden
    >
      <Ic size={Math.round(size * 0.46)} stroke={1.6} />
    </span>
  );
}

/** Pastilla de variación de precio: verde si baja, roja si sube. */
export function ChangeBadge({ ch, size = "md" }: { ch: number; size?: "sm" | "md" }) {
  const flat = Math.abs(ch) < 0.05;
  const Ic = flat ? IconMinus : ch < 0 ? IconTrendingDown : IconTrendingUp;
  return (
    <span
      className={cx(
        "inline-flex items-center gap-0.5 rounded px-[5px] font-semibold whitespace-nowrap",
        size === "sm" ? "h-[18px] text-[11px]" : "h-5 text-xs",
        flat ? "bg-surface-3 text-text-2" : ch < 0 ? "bg-down-soft text-down" : "bg-up-soft text-up",
      )}
    >
      <Ic size={12} aria-hidden />
      {pctS(ch)}
    </span>
  );
}

export function changeColor(ch: number) {
  return Math.abs(ch) < 0.05 ? "var(--text-2)" : ch < 0 ? "var(--down)" : "var(--up)";
}

/** Minigráfica de los últimos 8 días. */
export function Sparkline({ values, color, w = 60, h = 22, strokeWidth = 1.5 }: { values: number[]; color: string; w?: number; h?: number; strokeWidth?: number }) {
  const mn = Math.min(...values);
  const mx = Math.max(...values);
  const d = values
    .map((v, i) => (i ? "L" : "M") + (1 + (i * 58) / (values.length - 1)).toFixed(1) + " " + (mx === mn ? 11 : 3 + ((mx - v) / (mx - mn)) * 16).toFixed(1))
    .join(" ");
  return (
    <svg width={w} height={h} viewBox="0 0 60 22" aria-hidden>
      <path d={d} fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

/* ─── Varios ────────────────────────────────────────────────── */

export function Skeleton({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return <div className={cx("skeleton rounded", className)} style={style} />;
}

export function Card({ className, children, ...rest }: ComponentProps<"section">) {
  return (
    <section className={cx("rounded-[10px] border border-border bg-surface shadow-sm", className)} {...rest}>
      {children}
    </section>
  );
}

/** Aplica la animación de entrada escalonada: <div {...enter(2)}> */
export const enter = (i: number, className?: string) => ({
  className: cx("enter", className),
  style: { "--i": i } as React.CSSProperties,
});

export function EmptyMark() {
  return (
    <div className="mb-1.5 grid size-[52px] place-items-center rounded-[14px] bg-brand-soft">
      <svg width="28" height="28" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M3 6.5c4 0 5 10.5 9 10.5s5-10.5 9-10.5" fill="none" stroke="var(--brand)" strokeWidth="1.8" strokeLinecap="round" />
        <circle cx="12" cy="17" r="2.2" fill="var(--brand)" />
      </svg>
    </div>
  );
}

/** Barra de progreso que se llena al aparecer. */
export function ProgressBar({ value, delay = 0 }: { value: number; delay?: number }) {
  return (
    <span className="block h-1 w-full overflow-hidden rounded-sm bg-surface-3">
      <span
        className="block h-full origin-left rounded-sm bg-brand"
        style={{
          width: Math.round(value * 100) + "%",
          animation: `grow 700ms var(--ease-out-strong) ${delay}s both`,
        }}
      />
    </span>
  );
}
