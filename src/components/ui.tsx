"use client";

import { animate, motion, useReducedMotion } from "motion/react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useId, useRef, type ComponentProps, type ReactNode } from "react";
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

// Joins class names and skips the falsy ones
export const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");

// Brand

// Uses the 64px image for small sizes and the 256px one for the rest
export function LogoMark({ size = 22 }: { size?: number }) {
  return (
    <Image
      src={size <= 32 ? "/logo-64.png" : "/logo-256.png"}
      alt=""
      width={size}
      height={size}
      className="shrink-0 select-none"
      draggable={false}
      priority
    />
  );
}

export function Logo({ size = 22, text = 16 }: { size?: number; text?: number }) {
  return (
    <span className="logo-tilt flex items-center gap-[9px]">
      <LogoMark size={size} />
      <span className="font-semibold tracking-[-0.025em]" style={{ fontSize: text }}>
        nadir
      </span>
    </span>
  );
}

// Buttons

type Variant = "primary" | "secondary" | "ghost";
type Size = "sm" | "md" | "lg";

const variants: Record<Variant, string> = {
  primary: "btn-glow bg-brand-solid text-on-brand hover:bg-brand-solid-hover border border-transparent",
  secondary: "bg-surface text-text border border-border-strong shadow-sm hover:border-brand-soft-border hover:bg-surface-2",
  ghost: "bg-transparent text-text border border-transparent hover:bg-surface-3",
};
const sizes: Record<Size, string> = {
  sm: "h-8 px-3 text-[13px] rounded-md gap-1.5",
  md: "h-9 px-3.5 text-[13px] rounded-md gap-1.5",
  lg: "h-11 px-5 text-[15px] rounded-lg gap-2",
};

// Button classes, also used on links that should look like buttons
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

// Toggle switch

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
        on ? "bg-brand-solid shadow-[0_0_14px_-3px_var(--glow)]" : "bg-border-strong",
      )}
    >
      <span
        className="size-4 rounded-full bg-white shadow-[0_1px_2px_rgba(0,0,0,.25)] transition-transform duration-200 ease-out-strong"
        style={{ transform: on ? "translateX(16px)" : "none" }}
      />
    </button>
  );
}

// Segmented control with a sliding highlight

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
  // Unique layoutId so each control animates its own highlight
  const id = useId();
  const isTabs = role === "tablist";
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
            role={isTabs ? "tab" : undefined}
            aria-selected={isTabs ? on : undefined}
            aria-pressed={isTabs ? undefined : on}
            onClick={() => onChange(o.value)}
            className={cx(
              "relative inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-md border-none bg-transparent font-medium whitespace-nowrap transition-colors duration-150",
              size === "sm" ? "h-[26px] min-w-10 px-2 text-xs" : "h-9 px-2.5 text-[13px] desk:h-7",
              on ? "text-brand-text" : "text-text-2 hover:text-text",
              full && "flex-1",
            )}
          >
            {on && (
              <motion.span
                layoutId={id}
                className="absolute inset-0 rounded-md border border-brand-soft-border bg-seg-active shadow-sm"
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

// Products

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

// Product photo on a white square, or an icon if there's no photo
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
          // Store photos (real accounts) can come from any domain, so skip the optimizer
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

type Trend = "flat" | "down" | "up";

// Very small changes count as flat
function trendOf(ch: number): Trend {
  if (Math.abs(ch) < 0.05) return "flat";
  return ch < 0 ? "down" : "up";
}

const TREND_ICON: Record<Trend, Icon> = { flat: IconMinus, down: IconTrendingDown, up: IconTrendingUp };
const TREND_CLASS: Record<Trend, string> = {
  flat: "bg-surface-3 text-text-2",
  down: "bg-down-soft text-down",
  up: "bg-up-soft text-up",
};
const TREND_COLOR: Record<Trend, string> = { flat: "var(--text-2)", down: "var(--down)", up: "var(--up)" };

// Price change pill: green when it goes down, red when it goes up
export function ChangeBadge({ ch, size = "md" }: { ch: number; size?: "sm" | "md" }) {
  const trend = trendOf(ch);
  const Ic = TREND_ICON[trend];
  return (
    <span
      className={cx(
        "inline-flex items-center gap-0.5 rounded px-[5px] font-semibold whitespace-nowrap",
        size === "sm" ? "h-[18px] text-[11px]" : "h-5 text-xs",
        TREND_CLASS[trend],
      )}
    >
      <Ic size={12} aria-hidden />
      {pctS(ch)}
    </span>
  );
}

export function changeColor(ch: number) {
  return TREND_COLOR[trendOf(ch)];
}

// Tiny line chart of the last few days. Drawn in a 60x22 box and scaled with viewBox.
export function Sparkline({ values, color, w = 60, h = 22, strokeWidth = 1.5 }: { values: number[]; color: string; w?: number; h?: number; strokeWidth?: number }) {
  // With a single price (just added product) draw a flat line
  const vals = values.length > 1 ? values : [values[0] ?? 0, values[0] ?? 0];
  const mn = Math.min(...vals);
  const mx = Math.max(...vals);

  const xAt = (i: number) => 1 + (i * 58) / (vals.length - 1);
  // Highest price at y=3, lowest at y=19; flat line in the middle
  const yAt = (v: number) => (mx === mn ? 11 : 3 + ((mx - v) / (mx - mn)) * 16);

  const d = vals.map((v, i) => `${i === 0 ? "M" : "L"}${xAt(i).toFixed(1)} ${yAt(v).toFixed(1)}`).join(" ");
  return (
    <svg width={w} height={h} viewBox="0 0 60 22" aria-hidden>
      <path d={d} fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

// Misc

export function Skeleton({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return <div className={cx("skeleton rounded", className)} style={style} />;
}

export function Card({ className, children, ...rest }: ComponentProps<"section">) {
  return (
    <section className={cx("surface-grad rounded-[10px] border border-border bg-surface shadow-sm", className)} {...rest}>
      {children}
    </section>
  );
}

// Staggered entrance animation, e.g. <div {...enter(2)}>
export const enter = (i: number, className?: string) => ({
  className: cx("enter", className),
  style: { "--i": i } as React.CSSProperties,
});

// Big glowing logo for empty states
export function EmptyMark() {
  return (
    <div className="mb-1.5 rounded-[14px] shadow-[0_10px_30px_-8px_var(--glow)]">
      <LogoMark size={52} />
    </div>
  );
}

// Progress bar that fills up when it appears (value from 0 to 1)
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

// Number that counts up from 0 (and animates between values when it changes).
// It writes straight to the DOM so React doesn't re-render on every frame.
export function CountUp({ value, format = (n) => String(Math.round(n)), duration = 0.9 }: { value: number; format?: (n: number) => string; duration?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const from = useRef(0);
  const reduce = useReducedMotion();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (reduce) {
      el.textContent = format(value);
      from.current = value;
      return;
    }
    const controls = animate(from.current, value, {
      duration,
      ease: [0.23, 1, 0.32, 1],
      onUpdate: (v) => {
        el.textContent = format(v);
      },
    });
    from.current = value;
    return () => controls.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, reduce]);

  // The rendered text never changes, so React won't overwrite the animated value
  return <span ref={ref}>{format(0)}</span>;
}
