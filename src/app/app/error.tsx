"use client";

import { useEffect } from "react";
import { IconHome, IconRefresh, IconAlertTriangle } from "@tabler/icons-react";
import { Button, ButtonLink } from "@/components/ui";

// Shown inside the app shell when a page crashes
export default function AppError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div role="alert" className="enter flex flex-col items-center gap-2 rounded-[10px] border border-border bg-surface px-6 py-12 text-center">
      <span className="mb-1 grid size-11 place-items-center rounded-xl bg-up-soft text-up">
        <IconAlertTriangle size={22} aria-hidden />
      </span>
      <h1 className="m-0 text-base font-semibold">Algo ha fallado al cargar esta página</h1>
      <p className="m-0 max-w-[420px] text-[13px] text-text-2">
        Ha sido un error nuestro, no tuyo. Tus productos y alertas siguen guardados. Prueba otra vez o vuelve al panel.
      </p>
      {error.digest && <p className="m-0 text-xs text-text-3">Código: {error.digest}</p>}
      <div className="mt-2 flex flex-wrap justify-center gap-2.5">
        <Button onClick={() => retry()}>
          <IconRefresh size={15} aria-hidden />
          Reintentar
        </Button>
        <ButtonLink href="/app" variant="secondary">
          <IconHome size={15} aria-hidden />
          Ir al panel
        </ButtonLink>
      </div>
    </div>
  );
}
