"use client";

import { useState } from "react";
import { IconBrandTelegram, IconLogout, IconMail, IconMoon, IconRestore, IconSun, IconTrash } from "@tabler/icons-react";
import { useTheme, type Theme } from "@/components/theme";
import { Button, Card, cx, enter, Segmented, Switch } from "@/components/ui";
import { authClient } from "@/lib/auth-client";
import { useDemo, useIsAccount, type Freq } from "@/lib/store";
import { AccountProfile, PasswordCard } from "./profile";

const FREQS: { value: Freq; label: string; desc: string; pro?: boolean }[] = [
  { value: "15m", label: "Cada 15 minutos", desc: "Para ofertas relámpago.", pro: true },
  { value: "1h", label: "Cada hora", desc: "Recomendado para la mayoría de productos." },
  { value: "6h", label: "Cada 6 horas", desc: "Suficiente para precios estables." },
  { value: "24h", label: "Una vez al día", desc: "Una revisión cada 24 horas." },
];

const inputCls = "h-9 rounded-md border border-border-strong bg-surface px-2.5 text-[13px] text-text transition-colors focus:border-brand";

export default function AjustesPage() {
  const profile = useDemo((s) => s.profile);
  const setProfile = useDemo((s) => s.setProfile);
  const channels = useDemo((s) => s.channels);
  const setChannel = useDemo((s) => s.setChannel);
  const freq = useDemo((s) => s.freq);
  const setFreq = useDemo((s) => s.setFreq);
  const resetDemo = useDemo((s) => s.resetDemo);
  const { theme, setTheme } = useTheme();
  const isAccount = useIsAccount();
  const account = useDemo((s) => s.account);
  const productCount = useDemo((s) => s.products.length);
  const [name, setName] = useState(profile.name);
  const [email, setEmail] = useState(profile.email);

  // Refill the form when the saved demo profile loads
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
        {isAccount && account ? (
          <>
            <AccountProfile account={account} productCount={productCount} signOut={<SignOutButton />} />
            {account.provider === "email" && <PasswordCard />}
          </>
        ) : (
          <Card {...enter(1)}>
            <div className="border-b border-border p-4">
              <h2 className="m-0 text-sm font-semibold">Perfil</h2>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                // Empty fields keep the previous value
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
        )}

        <Card {...enter(2)}>
          <div className="border-b border-border p-4">
            <h2 className="m-0 text-sm font-semibold">Canales de aviso</h2>
            <p className="mt-0.5 mb-0 text-xs text-text-3">Se aplican por defecto a las alertas nuevas.</p>
          </div>
          {(
            [
              ["email", "Email", profile.email, IconMail],
              ["telegram", "Telegram", isAccount ? "Avisos por Telegram" : "Conectado como @aleix_demo", IconBrandTelegram],
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
              {isAccount && k === "telegram" ? (
                <span className="rounded bg-surface-3 px-1.5 py-0.5 text-[11px] font-semibold text-text-2">Próximamente</span>
              ) : (
                <Switch on={channels[k]} onChange={() => setChannel(k, !channels[k])} label={label} />
              )}
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
                  onClick={() => {
                    // The 15 min option is only shown as a Pro upsell
                    if (!o.pro) setFreq(o.value);
                  }}
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

        {isAccount ? (
          <Card {...enter(5, "flex flex-wrap items-center justify-between gap-3 p-4")}>
            <div>
              <h2 className="m-0 text-sm font-semibold">Eliminar cuenta</h2>
              <p className="mt-0.5 mb-0 text-xs text-text-3">Borra tu cuenta, tus productos y todo su histórico. No se puede deshacer.</p>
            </div>
            <DeleteAccountButton />
          </Card>
        ) : (
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
        )}
      </div>
    </>
  );
}

function SignOutButton() {
  const [busy, setBusy] = useState(false);
  return (
    <Button
      variant="secondary"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        await authClient.signOut();
        // Full reload on purpose, to clear the account state in memory
        // eslint-disable-next-line @next/next/no-location-assign-relative-destination
        window.location.href = "/";
      }}
    >
      <IconLogout size={15} aria-hidden />
      {busy ? "Cerrando…" : "Cerrar sesión"}
    </Button>
  );
}

// Two-step delete: the first click asks for confirmation
function DeleteAccountButton() {
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const showToast = useDemo((s) => s.showToast);

  let label = "Eliminar cuenta";
  if (busy) label = "Borrando…";
  else if (confirm) label = "Sí, borrar mi cuenta";

  return (
    <div className="flex items-center gap-2">
      {confirm && !busy && (
        <Button variant="ghost" onClick={() => setConfirm(false)}>
          Cancelar
        </Button>
      )}
      <Button
        variant="secondary"
        disabled={busy}
        className={cx(confirm && "border-up bg-up-soft text-up hover:bg-up-soft")}
        onClick={async () => {
          if (!confirm) {
            setConfirm(true);
            return;
          }
          setBusy(true);
          const { error } = await authClient.deleteUser();
          if (error) {
            setBusy(false);
            setConfirm(false);
            showToast("No hemos podido borrar la cuenta. Vuelve a entrar e inténtalo de nuevo.", "error");
            return;
          }
          // eslint-disable-next-line @next/next/no-location-assign-relative-destination
          window.location.href = "/";
        }}
      >
        <IconTrash size={15} aria-hidden />
        {label}
      </Button>
    </div>
  );
}
