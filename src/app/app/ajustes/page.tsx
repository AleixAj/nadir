"use client";

import { useState } from "react";
import { IconBrandTelegram, IconMail, IconMoon, IconRestore, IconSun } from "@tabler/icons-react";
import { useTheme, type Theme } from "@/components/theme";
import { Button, Card, cx, enter, Segmented, Switch } from "@/components/ui";
import { useDemo, type Freq } from "@/lib/store";

const FREQS: { value: Freq; label: string; desc: string; pro?: boolean }[] = [
  { value: "15m", label: "Cada 15 minutos", desc: "Para ofertas relámpago.", pro: true },
  { value: "1h", label: "Cada hora", desc: "Recomendado para la mayoría de productos." },
  { value: "6h", label: "Cada 6 horas", desc: "Suficiente para precios estables." },
  { value: "24h", label: "Una vez al día", desc: "Revisión diaria a las 08:00." },
];

const inputCls = "h-9 rounded-md border border-border-strong bg-surface px-2.5 text-[13px] text-text transition-colors focus:border-brand";

export default function AjustesPage() {
  const { profile, setProfile, channels, setChannel, freq, setFreq, resetDemo } = useDemo();
  const { theme, setTheme } = useTheme();
  const [name, setName] = useState(profile.name);
  const [email, setEmail] = useState(profile.email);

  // Al recuperar la demo guardada, rellena el formulario
  const [seen, setSeen] = useState(profile);
  if (seen !== profile) {
    setSeen(profile);
    setName(profile.name);
    setEmail(profile.email);
  }

  return (
    <>
      <h1 {...enter(0, "m-0 text-xl font-semibold tracking-[-0.015em]")}>Ajustes</h1>
      <div className="flex max-w-[760px] flex-col gap-4">
        <Card {...enter(1)}>
          <div className="border-b border-border p-4">
            <h2 className="m-0 text-sm font-semibold">Perfil</h2>
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setProfile({ name: name.trim() || profile.name, email: email.trim() || profile.email });
            }}
          >
            <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-4 p-4">
              <label className="flex flex-col gap-1.5 text-xs font-medium text-text-2">
                Nombre
                <input value={name} onChange={(e) => setName(e.target.value)} className={inputCls} />
              </label>
              <label className="flex flex-col gap-1.5 text-xs font-medium text-text-2">
                Email
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} />
              </label>
            </div>
            <div className="flex items-center justify-between gap-3 rounded-b-[10px] border-t border-border bg-surface-2 px-4 py-3">
              <span className="text-xs text-text-3">Plan gratuito · hasta 25 productos</span>
              <Button type="submit">Guardar cambios</Button>
            </div>
          </form>
        </Card>

        <Card {...enter(2)}>
          <div className="border-b border-border p-4">
            <h2 className="m-0 text-sm font-semibold">Canales de aviso</h2>
            <p className="mt-0.5 mb-0 text-xs text-text-3">Se aplican por defecto a las alertas nuevas.</p>
          </div>
          {(
            [
              ["email", "Email", profile.email, IconMail],
              ["telegram", "Telegram", "Conectado como @ana_demo", IconBrandTelegram],
            ] as const
          ).map(([k, label, sub, Ic], i) => (
            <div key={k} className={cx("flex items-center gap-3 px-4 py-3.5", i > 0 && "border-t border-border")}>
              <span className="grid size-[34px] place-items-center rounded-lg border border-border bg-surface-2 text-text-2">
                <Ic size={18} aria-hidden />
              </span>
              <span className="flex flex-1 flex-col">
                <span className="text-[13px] font-medium">{label}</span>
                <span className="text-xs text-text-3">{sub}</span>
              </span>
              <Switch on={channels[k]} onChange={() => setChannel(k, !channels[k])} label={label} />
            </div>
          ))}
        </Card>

        <Card {...enter(3)}>
          <div className="border-b border-border p-4">
            <h2 className="m-0 text-sm font-semibold">Frecuencia de revisión</h2>
            <p className="mt-0.5 mb-0 text-xs text-text-3">Cada cuánto consultamos el precio en las tiendas.</p>
          </div>
          <div role="radiogroup" aria-label="Frecuencia de revisión" className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-2 p-3">
            {FREQS.map((o) => {
              const on = freq === o.value;
              return (
                <button
                  key={o.value}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  aria-disabled={o.pro}
                  onClick={() => !o.pro && setFreq(o.value)}
                  className={cx(
                    "press flex items-start gap-2.5 rounded-lg border p-3 text-left",
                    on ? "border-brand-solid bg-brand-soft" : "border-border bg-surface",
                    o.pro ? "cursor-not-allowed opacity-60" : "cursor-pointer hover:border-border-strong",
                  )}
                >
                  <span
                    className={cx(
                      "mt-px grid size-4 shrink-0 place-items-center rounded-full border-[1.5px] transition-colors",
                      on ? "border-brand-solid" : "border-border-strong",
                    )}
                  >
                    <span
                      className="size-2 rounded-full bg-brand-solid transition-[opacity,transform] duration-200 ease-out-strong"
                      style={{ opacity: on ? 1 : 0, transform: on ? "scale(1)" : "scale(0.4)" }}
                    />
                  </span>
                  <span className="flex flex-col gap-0.5">
                    <span className="flex items-center gap-1.5 text-[13px] font-medium">
                      {o.label}
                      {o.pro && (
                        <span className="inline-flex h-[18px] items-center rounded bg-surface-3 px-1.5 text-[11px] font-semibold text-text-2">Plan Pro</span>
                      )}
                    </span>
                    <span className="text-xs text-text-3">{o.desc}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </Card>

        <Card {...enter(4, "flex flex-wrap items-center justify-between gap-3 p-4")}>
          <div>
            <h2 className="m-0 text-sm font-semibold">Apariencia</h2>
            <p className="mt-0.5 mb-0 text-xs text-text-3">Tema de la interfaz en este dispositivo.</p>
          </div>
          <Segmented<Theme>
            label="Tema"
            value={theme}
            onChange={setTheme}
            options={[
              { value: "light", label: "Claro", icon: IconSun },
              { value: "dark", label: "Oscuro", icon: IconMoon },
            ]}
          />
        </Card>

        <Card {...enter(5, "flex flex-wrap items-center justify-between gap-3 p-4")}>
          <div>
            <h2 className="m-0 text-sm font-semibold">Datos de la demo</h2>
            <p className="mt-0.5 mb-0 text-xs text-text-3">Tus cambios se guardan en este navegador. Puedes volver a los datos de ejemplo.</p>
          </div>
          <Button variant="secondary" onClick={resetDemo}>
            <IconRestore size={15} aria-hidden />
            Restablecer demo
          </Button>
        </Card>
      </div>
    </>
  );
}
