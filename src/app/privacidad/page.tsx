import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage } from "@/components/legal/legal-page";

export const metadata: Metadata = { title: "Política de privacidad" };

export default function PrivacidadPage() {
  return (
    <LegalPage title="Política de privacidad" updated="24 de septiembre de 2026">
      <section>
        <p>
          Nadir es un proyecto personal de portfolio desarrollado por Aleix. Esta página explica qué datos guarda la aplicación,
          para qué y cómo puedes borrarlos.
        </p>
      </section>
      <section>
        <h2>Qué datos guardamos</h2>
        <ul>
          <li>
            <strong>De tu cuenta de Google:</strong> tu nombre, tu email y tu foto de perfil. Solo pedimos estos datos básicos; no
            accedemos a tu correo, tus archivos ni ningún otro servicio de Google.
          </li>
          <li>
            <strong>De tu uso de Nadir:</strong> los productos que sigues (su dirección web, nombre, foto y precio), el histórico de
            precios, tus precios objetivo y tus ajustes.
          </li>
          <li>
            <strong>Datos técnicos de la sesión:</strong> la dirección IP y el navegador desde el que entras, para mantener la sesión
            iniciada de forma segura.
          </li>
        </ul>
      </section>
      <section>
        <h2>Para qué los usamos</h2>
        <p>
          Únicamente para que la aplicación funcione: identificarte, guardar tus productos, revisar sus precios y avisarte cuando
          bajen. No vendemos ni compartimos tus datos con terceros, no mostramos publicidad y no usamos herramientas de seguimiento.
        </p>
      </section>
      <section>
        <h2>Dónde se guardan</h2>
        <p>
          En una base de datos de Neon (Postgres) alojada en la Unión Europea (Fráncfort). La web se sirve a través de Cloudflare.
        </p>
      </section>
      <section>
        <h2>Cookies y almacenamiento local</h2>
        <p>
          Usamos una única cookie técnica para mantener tu sesión iniciada. El navegador también guarda el tema claro u oscuro que
          elijas y, si usas la demo, los cambios que hagas en ella. No hay cookies de publicidad ni de analítica.
        </p>
      </section>
      <section>
        <h2>Tus derechos</h2>
        <p>
          Puedes borrar tu cuenta y todos sus datos en cualquier momento desde <Link href="/app/ajustes">Ajustes</Link>. También
          puedes pedir acceso, corrección o borrado de tus datos escribiendo a través del perfil de GitHub del autor:{" "}
          <a href="https://github.com/AleixAj" target="_blank" rel="noreferrer">
            github.com/AleixAj
          </a>
          .
        </p>
      </section>
    </LegalPage>
  );
}
