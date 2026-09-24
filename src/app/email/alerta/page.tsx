import type { Metadata } from "next";
import Link from "next/link";
import { LogoMark } from "@/components/ui";

export const metadata: Metadata = { title: "Email de alerta" };

// Preview of the email sent when a price drops below the target.
// Later this will be built with React Email and sent with Resend.
export default function EmailAlertaPage() {
  // Shared class for the "other stores" table cells
  const td = "border-t border-border py-2";
  return (
    <div className="min-h-screen bg-surface-2 px-3 py-8">
      <div className="mx-auto mb-3 flex max-w-[600px] flex-col gap-0.5 text-xs text-text-3">
        <span>
          <strong className="font-semibold text-text">Nadir</strong> &lt;avisos@nadir.app&gt; · para aleix@ejemplo.com
        </span>
        <span>
          Asunto: <strong className="font-semibold text-text">Sony WH-1000XM6 bajó a 349 € en Amazon</strong>
        </span>
      </div>
      <article className="enter mx-auto max-w-[600px] overflow-hidden rounded-xl border border-border bg-surface">
        <div className="flex items-center gap-2 border-b border-border px-8 py-6">
          <LogoMark />
          <span className="text-base font-semibold tracking-[-0.025em]">nadir</span>
        </div>
        <div className="px-8 pt-8 pb-2">
          <p className="m-0 mb-2 text-[13px] font-semibold text-down">Tu precio objetivo se ha cumplido</p>
          <h1 className="m-0 text-2xl leading-[1.25] font-semibold tracking-[-0.02em]">Sony WH-1000XM6 ha bajado a 349 € en Amazon</h1>
          <p className="mt-3 mb-0 text-[15px] leading-[1.6] text-text-2">
            Está 10 € por debajo del objetivo que marcaste (359 €) y es el precio más bajo que hemos registrado para este producto.
          </p>
        </div>
        <div className="px-8 py-5">
          <div className="rounded-[10px] border border-border">
            <div className="flex flex-wrap justify-between gap-4 p-5">
              <div>
                <div className="text-xs font-medium text-text-2">Precio ahora en Amazon</div>
                <div className="mt-1 text-[34px] font-semibold tracking-[-0.03em]">349,00 €</div>
                <div className="mt-1 text-[13px] text-text-3">
                  <s>379,00 €</s> · <span className="font-semibold text-down">−7,9 %</span> · Envío gratis
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs font-medium text-text-2">Tu objetivo</div>
                <div className="mt-1 text-xl font-semibold text-brand-text">359 €</div>
                <div className="mt-3.5 text-xs font-medium text-text-2">Mínimo anterior</div>
                <div className="mt-0.5 text-sm font-semibold">354,99 €</div>
              </div>
            </div>
            <div className="px-5 pb-5">
              <svg width="100%" height="72" viewBox="0 0 520 72" preserveAspectRatio="none" role="img" aria-label="Evolución del precio en los últimos 3 meses">
                <path
                  d="M0 22 H70 V30 H150 V16 H230 V26 H300 V36 H380 V20 H460 V62 H520"
                  fill="none"
                  stroke="#ea580c"
                  strokeWidth="2"
                  vectorEffect="non-scaling-stroke"
                />
                <line x1="0" x2="520" y1="48" y2="48" stroke="var(--text-3)" strokeWidth="1" strokeDasharray="4 4" vectorEffect="non-scaling-stroke" />
              </svg>
              <div className="flex justify-between text-[11px] text-text-3">
                <span>28 jun</span>
                <span>Objetivo 359 € (línea discontinua)</span>
                <span>Hoy</span>
              </div>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 px-8 pt-1 pb-2">
          <a href="#" className="rounded-lg bg-brand-solid px-5 py-3 text-[15px] font-semibold text-on-brand">
            Ver en Amazon
          </a>
          <Link href="/app/productos/sony-wh-1000xm6" className="px-4 py-3 text-sm font-medium text-text">
            Ver el histórico en Nadir
          </Link>
        </div>
        <div className="px-8 pt-6 pb-2">
          <div className="mb-2 text-[13px] font-semibold">Otras tiendas</div>
          <table className="w-full border-collapse text-[13px]">
            <tbody>
              <tr>
                <td className={td}>PcComponentes</td>
                <td className={`${td} text-text-3`}>374,90 € + 5,99 € envío</td>
                <td className={`${td} text-right font-semibold`}>380,89 €</td>
              </tr>
              <tr>
                <td className={td}>MediaMarkt</td>
                <td className={`${td} text-text-3`}>Recogida gratis</td>
                <td className={`${td} text-right font-semibold`}>385,00 €</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="m-0 px-8 pt-6 pb-8 text-xs leading-[1.6] text-text-3">
          Precio comprobado el 28 jul a las 11:20. Los precios pueden cambiar en cualquier momento; confirma el importe final en la tienda.
        </p>
        <div className="border-t border-border bg-surface-2 px-8 py-5 text-xs leading-[1.6] text-text-3">
          Recibes este correo porque tienes una alerta activa para este producto en Nadir.
          <br />
          <a href="#" className="text-text-2 underline">
            Pausar esta alerta
          </a>{" "}
          ·{" "}
          <Link href="/app/ajustes" className="text-text-2 underline">
            Gestionar avisos
          </Link>{" "}
          ·{" "}
          <a href="#" className="text-text-2 underline">
            Darse de baja
          </a>
        </div>
      </article>
    </div>
  );
}
