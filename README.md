<img src="public/logo-256.png" alt="Nadir" width="64">

# Nadir

![Next.js](https://img.shields.io/badge/Next.js-16-000?logo=nextdotjs&logoColor=fff)
![React](https://img.shields.io/badge/React-19-61dafb?logo=react&logoColor=111)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6?logo=typescript&logoColor=fff)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06b6d4?logo=tailwindcss&logoColor=fff)
![Zustand](https://img.shields.io/badge/Zustand-5-443e38)
![Motion](https://img.shields.io/badge/Motion-13-ea580c?logo=framer&logoColor=fff)
![Vitest](https://img.shields.io/badge/Vitest-5-6e9f18?logo=vitest&logoColor=fff)
![Postgres](https://img.shields.io/badge/Neon-Postgres-00e599?logo=postgresql&logoColor=fff)
![Drizzle](https://img.shields.io/badge/Drizzle-ORM-c5f74f?logo=drizzle&logoColor=111)
![Cloudflare](https://img.shields.io/badge/Cloudflare-Workers-f38020?logo=cloudflare&logoColor=fff)

<p>
  <img src="docs/readme/lang-es-active.svg" alt="Español" width="170">
  <a href="README.en.md"><img src="docs/readme/lang-en.svg" alt="English" width="170"></a>
  <a href="README.ca.md"><img src="docs/readme/lang-ca.svg" alt="Català" width="170"></a>
</p>

**Compra en el punto más bajo.** Nadir es un monitor de precios: sigue los productos que te interesan en varias tiendas, guarda su histórico y te avisa cuando bajan del precio que tú eliges.

El nombre viene de *nadir*, el punto más bajo de una curva. Es un proyecto de portfolio construido como un producto SaaS real: diseño propio con sistema de tokens, cuentas con Google, base de datos, tareas programadas, lógica de dominio probada y desplegado en producción.

> **Web:** [nadir.aleixaj.com](https://nadir.aleixaj.com)
> **Demo sin registro:** pulsa «Entrar como demo» y entrarás en una cuenta que ya sigue 12 productos, con alertas e histórico de un año.
> **Cuenta real:** entra con Google, busca cualquier producto del catálogo y empieza a seguir su precio.

## Qué puedes hacer

- **Panel** con las bajadas de la semana, alertas activas, últimas bajadas y productos cerca de su precio objetivo.
- **Buscar y añadir productos por nombre**, con sugerencias y fotos mientras escribes y navegación con el teclado. También se puede pegar el enlace de una tienda.
- **Mis productos**: tabla con minigráfica de 7 días, mínimo histórico, mejor tienda y estado de la alerta. Filtros por lista, búsqueda y cuatro formas de ordenar.
- **Ficha de producto**, la pantalla principal:
  - gráfica del histórico dibujada en SVG, con periodos de 7 días, 1 mes, 3 meses y 1 año, tooltip, línea del precio objetivo y el punto *nadir* marcado;
  - comparativa de tiendas ordenada por precio final, con la opción «Mejor» destacada;
  - alerta de precio con interruptor, atajos (mínimo histórico, −5 %, −10 %) y canales de aviso;
  - resumen del periodo, «Revisar el precio ahora» y «Dejar de seguir».
- **Alertas** activas con su progreso hacia el objetivo, e historial de avisos generados.
- **Tiendas**: estado de cada tienda, última revisión y reintento si falla.
- **Ajustes**: cuenta de Google, canales, frecuencia de revisión, tema, cerrar sesión y eliminar la cuenta con todos sus datos.
- **Instalable como app** (PWA) en el móvil o el escritorio.

## Catálogo de prueba

Las grandes tiendas (Amazon, PcComponentes, MediaMarkt…) no permiten leer sus páginas de forma automática; en producción los datos llegarían de sus **programas de afiliados** (catálogos oficiales con precios diarios). Para simularlo de forma honesta:

1. `scripts/seed-catalog.ts` hace **una sola vez** 63 búsquedas en Google Shopping España (API de SerpApi) y se queda con los productos de **tiendas conocidas y tiendas oficiales de marca**, sin accesorios ni precios atípicos.
2. Para sumar tiendas, busca cada producto por su nombre (API de Serper) y solo acepta resultados que sean **exactamente el mismo modelo**: no mezcla un iPhone 17 con un 17 Pro, ni capacidades distintas, ni reacondicionados.
3. Solo entran tiendas **fiables**: cadenas conocidas o tiendas con buena valoración y muchas opiniones; nunca marketplaces, segunda mano ni operadoras. Se descartan los precios muy alejados del resto y se juntan los productos repetidos.
4. Se quitan los productos que se quedan con una sola tienda (sin comparativa no aportan). Las fotos se convierten a WebP (`public/catalog/`) y todo se guarda en Postgres.

El resultado son **347 productos reales, todos con precio en 2 tiendas o más** (casi 1.500 precios), sobre todo tecnología. La comparativa de la ficha se ordena por precio final, con envío. Al seguir un producto, su precio parte del real y **evoluciona de forma simulada** en cada revisión automática, con cambios pequeños y ofertas de vez en cuando. La web lo indica siempre con el aviso «Entorno de prueba» y la etiqueta «Precio simulado».

## Stack técnico

| Capa | Elección | Motivo |
|---|---|---|
| Framework | Next.js 16 (App Router) | Server Components, Server Actions, layouts anidados y rutas prerenderizadas. |
| UI | React 19 | Componentes, hooks y la versión actual del ecosistema. |
| Lenguaje | TypeScript 5 (estricto) | Modelos de dominio tipados de punta a punta, del esquema de la base de datos a la interfaz. |
| Estilos | Tailwind CSS 4 + tokens CSS | Los colores del diseño son variables CSS; Tailwind las expone como utilidades (`bg-surface`, `text-brand-text`). |
| Estado | Zustand 5 | Un único estado con dos modos: demo (en `localStorage`) y cuenta real (sincronizado con el servidor). |
| Animación | Motion 13 + CSS | Motion para lo interactivo (modal, toasts, indicadores); CSS para lo predecible (entradas, brillos, dibujo de la gráfica). |
| Base de datos | Neon (Postgres) + Drizzle ORM | Postgres sin servidor, consultas tipadas y migraciones versionadas. |
| Login | Better Auth + Google | Sesiones guardadas en nuestra base de datos, sin contraseñas. |
| Servidor | Server Actions + Zod | Cada acción comprueba la sesión, la propiedad del dato y valida la entrada. |
| Tests | Vitest | Tests unitarios de la lógica de precios, gráfica, lectura de páginas, seguridad de URLs y catálogo. |
| Despliegue | Cloudflare Workers (OpenNext) | Despliegue continuo desde GitHub y un Cron Trigger que revisa los precios. |

## Arquitectura

```txt
                 ┌──────────────────────── Cloudflare Worker ────────────────────────┐
 Navegador ────► │ Next.js (OpenNext)                                                 │
                 │  ├─ Páginas y layouts (Server Components)                          │
                 │  ├─ Server Actions  ── Zod ──► Drizzle ──► Neon Postgres (UE)     │
                 │  ├─ /api/auth/*  Better Auth + Google                              │
                 │  └─ /api/cron/check  ◄── Cron Trigger (con clave)                  │
                 └────────────────────────────────────────────────────────────────────┘
```

- **La lógica no depende de React.** Son funciones puras en `src/lib/` con sus tests: geometría de la gráfica, históricos, lectura de páginas de producto, catálogo y simulación de precios.
- **Una misma interfaz para la demo y las cuentas reales.** El servidor convierte las filas de la base de datos al mismo modelo `Product` que usa la demo, así que las pantallas no distinguen de dónde vienen los datos.
- **El servidor es la fuente de verdad.** Cada acción devuelve el estado actualizado de la cuenta y la interfaz lo sustituye; los cambios pequeños (activar una alerta) se aplican al instante y se deshacen si el servidor falla.
- **Importes en céntimos** (enteros) para evitar errores de coma flotante.

### Lectura de páginas de producto

Si se pega un enlace, `fetchProduct()` descarga la página y `parseProductPage()` saca nombre, foto y precio de los **datos estructurados de schema.org (JSON-LD)** o de las etiquetas **Open Graph**, las mismas que usan buscadores y redes sociales. Antes de descargar nada, `checkPublicUrl()` bloquea direcciones internas, IPs privadas y puertos raros (protección contra **SSRF**), y las redirecciones se siguen a mano validando cada salto.

### Gráfica e históricos

`buildChart()` calcula escalas con pasos «bonitos», la línea escalonada (el precio se mantiene hasta que cambia), el punto más bajo del periodo y si es el mínimo de todo el histórico. `makeSeries()` genera históricos deterministas con cuatro formas de curva (lanzamiento, volátil, estable, aleatoria) y ofertas de Black Friday y Prime Day.

### Seguridad

- Sesiones de Better Auth en cookies firmadas; cada Server Action comprueba la sesión y que el producto sea del usuario.
- Validación de todas las entradas con Zod y consultas parametrizadas con Drizzle.
- Ruta de revisión automática protegida con clave secreta; claves guardadas como *secrets* de Cloudflare.
- Cabeceras de seguridad (HSTS, `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`).
- Borrado de cuenta con sus datos en cascada, y páginas de privacidad y condiciones.

### Rendimiento y calidad

- Páginas públicas prerenderizadas; la app se genera en el servidor solo cuando depende de la sesión.
- Iconos importados uno a uno, fuente con `next/font`, imágenes en WebP de pocos KB.
- Animaciones solo con `transform` y `opacity`, efectos de *hover* solo con ratón y todo desactivado con `prefers-reduced-motion`.
- Metadatos para buscadores y redes sociales (Open Graph), `robots.txt`, `sitemap.xml` y manifiesto PWA.

## Estructura del proyecto

```txt
src/
├── app/
│   ├── page.tsx              # Landing
│   ├── entrar/               # Acceso con Google o demo
│   ├── app/                  # La aplicación (panel, productos, ficha, alertas, tiendas, ajustes)
│   ├── api/auth/             # Better Auth
│   ├── api/cron/check/       # Revisión automática de precios
│   ├── privacidad/, condiciones/, email/alerta/
│   └── manifest.ts, robots.ts, sitemap.ts
├── components/               # UI base, shell de la app, modal de añadir, gráfica
├── db/                       # Esquema y conexión (Drizzle + Neon)
├── server/                   # Server Actions, carga de la cuenta, revisiones, simulación, lector de páginas
└── lib/                      # Lógica pura y tests (gráfica, históricos, catálogo, formato…)
scripts/seed-catalog.ts       # Carga del catálogo de prueba
drizzle/                      # Migraciones SQL
worker.ts, wrangler.jsonc     # Worker de Cloudflare y Cron Trigger
```

## Arrancar en local

Requiere Node.js 20 o superior.

```bash
npm install
npm run dev
```

La demo funciona sin configurar nada. Para las cuentas reales: copia `.env.example` como `.env.local`, rellena la base de datos y las claves de Google, y ejecuta `npm run db:migrate`. Para cargar el catálogo de prueba hacen falta además claves de SerpApi y Serper y `npm run catalog:seed` (las búsquedas se guardan en caché y no se repiten).

## Scripts

```bash
npm run dev           # servidor de desarrollo
npm run build         # build de producción
npm run lint          # ESLint
npm run typecheck     # comprueba TypeScript
npm test              # tests unitarios con Vitest
npm run db:migrate    # aplica las migraciones a la base de datos
npm run catalog:seed  # carga el catálogo de prueba (usa caché: no repite búsquedas)
npm run preview       # prueba la app en el entorno de Cloudflare
npm run deploy        # despliega en Cloudflare Workers
```

## Hoja de ruta

- [x] **Base y MVP**: diseño, todas las pantallas, demo sin registro, estados de carga, vacío y error.
- [x] **Cuentas reales**: Google, base de datos, datos por usuario, borrado de cuenta.
- [x] **Motor de precios**: lectura de páginas, catálogo de prueba, histórico, revisión programada y avisos en la app.
- [x] **Despliegue** en [nadir.aleixaj.com](https://nadir.aleixaj.com) con despliegue continuo.
- [ ] **Avisos por email** con React Email + Resend y, después, Telegram.
- [ ] **Datos de producción**: catálogos de afiliados de las tiendas en lugar del catálogo de prueba.
- [ ] **Tests de extremo a extremo** con Playwright y capturas en este README.

## Sobre los datos

Nadir es un proyecto de portfolio y no tiene relación con ninguna de las tiendas o marcas que aparecen. En la demo, los precios son orientativos y el histórico está simulado. En las cuentas reales, el catálogo es real (septiembre de 2026) pero la evolución de los precios se simula, y así se indica en la web. Las fotos de producto proceden de las propias tiendas y pertenecen a sus respectivos titulares.

---

Diseño y desarrollo: [Aleix](https://github.com/AleixAj).
