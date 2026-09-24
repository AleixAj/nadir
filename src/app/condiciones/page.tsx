import type { Metadata } from "next";
import { LegalPage } from "@/components/legal/legal-page";

export const metadata: Metadata = { title: "Condiciones de uso" };

export default function CondicionesPage() {
  return (
    <LegalPage title="Condiciones de uso" updated="24 de septiembre de 2026">
      <section>
        <h2>Qué es Nadir</h2>
        <p>
          Nadir es un proyecto personal de portfolio, gratuito y sin ánimo de lucro, que permite seguir el precio de productos de
          tiendas online. No tiene relación con ninguna de las tiendas o marcas que aparecen.
        </p>
      </section>
      <section>
        <h2>Precios y avisos</h2>
        <p>
          Los precios se leen de las páginas públicas de las tiendas y pueden no estar actualizados o no incluir gastos de envío.
          Comprueba siempre el precio final en la tienda antes de comprar. En la demo, los precios son orientativos y el histórico
          está simulado.
        </p>
      </section>
      <section>
        <h2>Uso razonable</h2>
        <p>
          Cada cuenta puede seguir un número limitado de productos. No está permitido usar Nadir para sobrecargar a las tiendas ni
          para fines distintos a seguir precios de forma personal.
        </p>
      </section>
      <section>
        <h2>Sin garantías</h2>
        <p>
          Al ser un proyecto de portfolio, el servicio se ofrece tal cual, puede cambiar o dejar de estar disponible, y no se
          garantiza que los avisos lleguen a tiempo.
        </p>
      </section>
    </LegalPage>
  );
}
