"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { motion, useReducedMotion, type Variants } from "motion/react";
import { IconArrowRight, IconBell, IconBuildingStore, IconChartLine } from "@tabler/icons-react";
import { useTheme } from "@/components/theme";
import { btn, ButtonLink, Logo } from "@/components/ui";
import { authClient } from "@/lib/auth-client";
import { FEATURED_ID } from "@/lib/demo-data";

const EASE = [0.23, 1, 0.32, 1] as const;

const FEATURES = [
  {
    icon: IconBuildingStore,
    title: "Todas las tiendas en una vista",
    text: "Compara precio, envío y plazo en Amazon, PcComponentes, MediaMarkt y otras tiendas. Marcamos la opción más barata con el envío incluido.",
  },
  {
    icon: IconChartLine,
    title: "El histórico completo",
    text: "Consulta cómo ha cambiado cada precio durante el último año y cuál fue su mínimo real antes de decidir si es buen momento.",
  },
  {
    icon: IconBell,
    title: "Avisos a tu precio",
    text: "Elige tu precio objetivo y recibe un email o un mensaje de Telegram en cuanto una tienda lo alcance.",
  },
];

export default function Landing() {
  const reduce = useReducedMotion();
  const hero: Variants = {
    hidden: {},
    show: { transition: { staggerChildren: 0.07, delayChildren: 0.05 } },
  };
  const item: Variants = {
    hidden: reduce ? { opacity: 0 } : { opacity: 0, transform: "translateY(12px)", filter: "blur(4px)" },
    show: { opacity: 1, transform: "translateY(0px)", filter: "blur(0px)", transition: { duration: 0.6, ease: EASE } },
  };

  return (
    <div className="flex min-h-screen flex-col bg-bg text-text">
      <header className="sticky top-0 z-10 border-b border-border bg-bg/80 backdrop-blur-md">
        <div className="mx-auto flex h-[60px] max-w-[1200px] items-center gap-6 px-4 desk:px-8">
          <Link href="/" aria-label="Nadir, inicio" className="text-text">
            <Logo size={24} text={17} />
          </Link>
          <nav className="hidden gap-1 desk:flex">
            <a href="#ventajas" className="rounded-md px-2.5 py-1.5 text-[13px] font-medium text-text-2 transition-colors hover:bg-surface-3 hover:text-text">
              Cómo funciona
            </a>
            <Link href="/email/alerta" className="rounded-md px-2.5 py-1.5 text-[13px] font-medium text-text-2 transition-colors hover:bg-surface-3 hover:text-text">
              Avisos
            </Link>
          </nav>
          <div className="flex-1" />
          <HeaderActions />
        </div>
      </header>

      <main className="flex-1">
        <motion.section
          variants={hero}
          initial="hidden"
          animate="show"
          className="relative mx-auto flex max-w-[1200px] flex-col items-center gap-5 px-4 pt-12 pb-9 text-center desk:px-8 desk:pt-24 desk:pb-14"
        >
          <HeroCurve />
          <motion.span
            variants={item}
            className="relative inline-flex h-7 items-center gap-2 rounded-full border border-border bg-surface px-3 text-xs font-medium whitespace-nowrap text-text-2"
          >
            <span className="size-[7px] rounded-full bg-brand shadow-[0_0_0_3px_var(--brand-soft)]" />
            Nadir: el punto más bajo de una curva
          </motion.span>
          <motion.h1
            variants={item}
            className="relative m-0 max-w-[820px] text-[42px] leading-[1.04] font-semibold tracking-[-0.04em] text-balance desk:text-[72px]"
          >
            Compra en el punto más bajo.
          </motion.h1>
          <motion.p variants={item} className="relative m-0 max-w-[600px] text-base leading-[1.55] text-pretty text-text-2 desk:text-lg">
            Nadir vigila el precio de los productos que te interesan en varias tiendas, guarda su histórico y te avisa cuando bajan del
            precio que tú eliges.
          </motion.p>
          <motion.div variants={item} className="relative mt-1.5 flex w-full flex-col justify-center gap-2.5 desk:w-auto desk:flex-row">
            <ButtonLink href="/app?demo=1" size="lg" className="group">
              Entrar como demo
              <IconArrowRight size={17} aria-hidden className="transition-transform duration-200 ease-out-strong group-hover:translate-x-0.5" />
            </ButtonLink>
            <ButtonLink href="/entrar?modo=registro" variant="secondary" size="lg">
              Crear cuenta
            </ButtonLink>
          </motion.div>
          <motion.p variants={item} className="relative m-0 text-[13px] text-text-3">
            Sin registro. La cuenta de demostración ya sigue 12 productos.
          </motion.p>
        </motion.section>

        <section aria-label="Vista previa de la aplicación" className="mx-auto max-w-[1200px] px-4 desk:px-8">
          <motion.div
            initial={reduce ? { opacity: 0 } : { opacity: 0, transform: "translateY(32px) scale(0.98)" }}
            animate={{ opacity: 1, transform: "translateY(0px) scale(1)" }}
            transition={{ duration: 0.9, ease: EASE, delay: 0.35 }}
            className="rounded-2xl border border-border bg-surface-2 p-1.5 desk:p-2.5"
          >
            <AppPreview />
          </motion.div>
        </section>

        <section id="ventajas" className="mx-auto max-w-[1200px] scroll-mt-20 px-4 py-12 desk:px-8 desk:py-[88px]">
          <div className="grid grid-cols-[repeat(auto-fit,minmax(260px,1fr))] gap-7 desk:gap-10">
            {FEATURES.map((f, i) => (
              <motion.div
                key={f.title}
                initial={reduce ? { opacity: 0 } : { opacity: 0, transform: "translateY(16px)" }}
                whileInView={{ opacity: 1, transform: "translateY(0px)" }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: 0.6, ease: EASE, delay: i * 0.08 }}
                className="flex flex-col gap-2.5 border-t border-border pt-5"
              >
                <span className="grid size-9 place-items-center rounded-[9px] bg-brand-soft text-brand-text">
                  <f.icon size={19} aria-hidden />
                </span>
                <h2 className="mt-1 mb-0 text-[17px] font-semibold tracking-[-0.015em]">{f.title}</h2>
                <p className="m-0 text-sm leading-[1.6] text-pretty text-text-2">{f.text}</p>
              </motion.div>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-[1200px] flex-wrap items-start justify-between gap-6 px-4 py-8 desk:px-8">
          <div className="flex max-w-[360px] flex-col gap-2">
            <Logo size={20} text={15} />
            <p className="m-0 text-xs text-text-3">Proyecto de portfolio sin relación con las tiendas mencionadas. Los precios de la demo son orientativos y el histórico está simulado.</p>
          </div>
          <nav aria-label="Pie de página" className="flex flex-wrap gap-5 text-[13px]">
            <Link href="/app?demo=1" className="text-text-2 hover:text-text">
              Demo
            </Link>
            <Link href="/entrar" className="text-text-2 hover:text-text">
              Iniciar sesión
            </Link>
            <Link href="/email/alerta" className="text-text-2 hover:text-text">
              Email de alerta
            </Link>
            <Link href="/privacidad" className="text-text-2 hover:text-text">
              Privacidad
            </Link>
            <Link href="/condiciones" className="text-text-2 hover:text-text">
              Condiciones
            </Link>
          </nav>
          <span className="text-xs text-text-3">© 2026 Nadir</span>
        </div>
      </footer>
    </div>
  );
}

/** Con sesión: acceso directo al panel. Sin sesión: entrar y demo. */
function HeaderActions() {
  const { data: session } = authClient.useSession();
  if (session) {
    return (
      <ButtonLink href="/app" className="h-[34px] px-3.5">
        Ir a mi panel
      </ButtonLink>
    );
  }
  return (
    <>
      <Link href="/entrar" className={btn("ghost", "sm", "hidden desk:inline-flex")}>
        Iniciar sesión
      </Link>
      <ButtonLink href="/app?demo=1" className="h-[34px] px-3.5">
        Entrar como demo
      </ButtonLink>
    </>
  );
}

/** Curva decorativa detrás del titular: se dibuja y marca su punto más bajo. */
function HeroCurve() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 1200 360"
      preserveAspectRatio="none"
      className="pointer-events-none absolute inset-x-0 top-6 h-[300px] w-full opacity-60 desk:top-10 desk:h-[380px]"
    >
      <defs>
        <linearGradient id="fade" x1="0" x2="1">
          <stop offset="0" stopColor="var(--brand)" stopOpacity="0" />
          <stop offset=".5" stopColor="var(--brand)" stopOpacity=".35" />
          <stop offset="1" stopColor="var(--brand)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path
        d="M0 70 C 260 70, 380 300, 600 300 S 940 70, 1200 70"
        fill="none"
        stroke="url(#fade)"
        strokeWidth="1.5"
        pathLength={1}
        className="draw"
        style={{ animationDuration: "1.6s", animationDelay: "0.2s" }}
      />
    </svg>
  );
}

/** La ficha real de la app, a escala y sin interacción, dentro de un marco. */
function AppPreview() {
  const { theme } = useTheme();
  const ref = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(1100);
  const [mobile, setMobile] = useState(false);
  // El iframe solo se crea en el cliente, para que use el tema real y no el del servidor
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const src = mounted ? `/app/productos/${FEATURED_ID}?embed=1&demo=1&theme=${theme}` : null;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => {
      setW(Math.round(e.contentRect.width));
      setMobile(window.innerWidth < 820);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const IW = mobile ? 390 : 1280;
  const IH = mobile ? 1100 : 800;
  const scale = w / IW;

  return (
    <div
      ref={ref}
      className="relative w-full overflow-hidden rounded-[10px] border border-border bg-surface shadow-lg"
      style={{ height: Math.round(IH * scale * (mobile ? 0.62 : 1)) }}
    >
      {src && (
        <iframe
          key={src}
          src={src}
          title="Ficha de producto en Nadir"
          tabIndex={-1}
          loading="lazy"
          className="pointer-events-none absolute top-0 left-0 border-0"
          style={{ width: IW, height: IH, transform: `scale(${scale})`, transformOrigin: "0 0" }}
        />
      )}
    </div>
  );
}
