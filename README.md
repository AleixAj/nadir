<img src="public/icon.svg" alt="" width="56">

# Nadir

![Next.js](https://img.shields.io/badge/Next.js-16-000?logo=nextdotjs&logoColor=fff)
![React](https://img.shields.io/badge/React-19-61dafb?logo=react&logoColor=111)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6?logo=typescript&logoColor=fff)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06b6d4?logo=tailwindcss&logoColor=fff)
![Zustand](https://img.shields.io/badge/Zustand-5-443e38)
![Motion](https://img.shields.io/badge/Motion-13-ea580c?logo=framer&logoColor=fff)
![Vitest](https://img.shields.io/badge/Vitest-5-6e9f18?logo=vitest&logoColor=fff)

<p>
  <img src="docs/readme/lang-es-active.svg" alt="Español" width="170">
  <a href="README.en.md"><img src="docs/readme/lang-en.svg" alt="English" width="170"></a>
  <a href="README.ca.md"><img src="docs/readme/lang-ca.svg" alt="Català" width="170"></a>
</p>

**Compra en el punto más bajo.** Nadir es un monitor de precios: sigue los productos que te interesan en varias tiendas, guarda su histórico y te avisa cuando bajan del precio que tú eliges.

El nombre viene de *nadir*, el punto más bajo de una curva. Es un proyecto de portfolio construido como un producto SaaS real: diseño propio con sistema de tokens, modo claro y oscuro, animaciones cuidadas, lógica de dominio aislada y probada, y una demo lista para usar sin registrarse.

> **Demo:** pulsa **«Entrar como demo»** y entrarás en una cuenta que ya sigue 12 productos, con alertas e histórico de un año.
> El despliegue público en Cloudflare está en camino.

## Qué puedes hacer

- **Panel** con el ahorro del mes, alertas activas, últimas bajadas y productos cerca de su precio objetivo.
- **Mis productos**: tabla con minigráfica de 7 días, mínimo histórico, mejor tienda y estado de la alerta. Filtros por lista, búsqueda y cuatro formas de ordenar.
- **Ficha de producto**, la pantalla principal:
  - gráfica del histórico dibujada en SVG, con periodos de 7 días, 1 mes, 3 meses y 1 año, tooltip, línea del precio objetivo y el punto *nadir* marcado;
  - comparativa de tiendas ordenada por precio final con envío, con la opción «Mejor» destacada;
  - alerta de precio con interruptor, atajos (mínimo histórico, −5 %, −10 %) y canales de aviso;
  - resumen del periodo: máximo, media, mínimo y variación.
- **Añadir producto** pegando la URL de una tienda compatible o buscándolo por nombre, con vista previa antes de confirmar.
- **Alertas** activas con su progreso hacia el objetivo, y un historial de avisos enviados.
- **Tiendas**: estado de cada tienda, última revisión y tiempo de respuesta, con un ejemplo de tienda caída y el botón de reintentar.
- **Ajustes**: perfil, canales, frecuencia de revisión, tema y un botón para restablecer la demo.
- **Email de alerta**: vista previa del correo que llega cuando se cumple un objetivo.

Detalles de producto:

- Diseño responsive: en móvil la barra lateral pasa a ser una barra inferior, las tablas se convierten en listas y los modales se abren desde abajo.
- Estados de carga (esqueletos), vacío y error en todas las pantallas. Se pueden forzar con `?estado=vacio`, `?estado=cargando` o `?estado=error`.
- Tema claro y oscuro sin parpadeo al cargar: un script en `<head>` aplica el tema antes de pintar la página.
- Los cambios de la demo (alertas, productos añadidos, ajustes) se guardan en el navegador.
- Accesibilidad: roles ARIA en tablas, pestañas, interruptores y diálogos; foco visible; `Escape` cierra el modal; se respeta `prefers-reduced-motion`.

## Stack técnico

| Capa | Elección | Motivo |
|---|---|---|
| Framework | Next.js 16 (App Router) | Rutas por carpetas, layouts anidados y páginas prerenderizadas. |
| UI | React 19 | Componentes, hooks y la versión actual del ecosistema. |
| Lenguaje | TypeScript 5 (estricto) | Modelos de dominio tipados (`Product`, `ShopOffer`, `Chart`...). |
| Estilos | Tailwind CSS 4 + tokens CSS | Los colores del diseño son variables CSS; Tailwind las expone como utilidades (`bg-surface`, `text-brand-text`). |
| Estado | Zustand 5 + `persist` | Estado global sin *boilerplate* y guardado en `localStorage`. |
| Animación | Motion 13 + CSS | Motion para lo interactivo (modal, toasts, indicadores deslizantes); CSS para lo predecible (entradas, dibujo de la gráfica). |
| Gráficas | SVG propio | Control total del diseño (línea escalonada, punto *nadir*, objetivo) sin depender de una librería. |
| Iconos | Tabler Icons | Importados uno a uno, así solo se incluyen los que se usan. |
| Tests | Vitest | Tests unitarios rápidos de la lógica de precios. |
| Despliegue | Cloudflare (previsto) | Con el adaptador OpenNext, como subdominio del portfolio. |

## Arquitectura

La lógica no depende de React: son funciones puras en `src/lib/` que se pueden probar por separado. Los componentes solo leen el estado y pintan.

```txt
src/lib/demo-data.ts     Productos, tiendas y generador de históricos
        |
src/lib/store.ts         Zustand: estado de la demo + persistencia
        |
src/lib/insights.ts      Ordenar, progreso al objetivo, estado de alerta
src/lib/chart.ts         Geometría de la gráfica: escalas, ejes, nadir
src/lib/format.ts        Formato español de precios, porcentajes y fechas
        |
src/app/**               Páginas: leen del store y pintan
```

### Históricos simulados

`makeSeries()` genera un año de precios diarios de forma **determinista**: con la misma semilla sale siempre la misma serie, así que los datos no cambian entre visitas. Hay cuatro formas de curva para que cada gráfica cuente algo distinto:

- `launch`: sale caro y baja por escalones (móviles tras su lanzamiento).
- `volatile`: cambia de precio a menudo (típico de marketplaces).
- `stable`: casi no se mueve.
- `random`: cambios de vez en cuando.

Además incluye bajadas en Black Friday y Prime Day, y garantiza que el mínimo histórico, el precio de hace 7 días y el precio actual coinciden con los datos del producto. Los tests comprueban estas reglas.

### Gráfica

`buildChart()` calcula todo lo que hay que dibujar: pasos de eje «bonitos» (1, 2, 2,5, 5 × 10ⁿ), la línea escalonada (el precio se mantiene hasta que cambia), el área, las marcas de los ejes, el punto más bajo del periodo y si ese punto es el mínimo de todo el histórico. El componente `PriceChart` solo pinta el SVG, mide su ancho con `ResizeObserver` y gestiona el tooltip.

### Animaciones

Siguen unas reglas sencillas:

- Solo se animan `transform` y `opacity`.
- Se usan curvas `ease-out` fuertes y duraciones de menos de 300 ms en la interfaz.
- Todo lo que se pulsa responde (`scale(0.97)`).
- Con `prefers-reduced-motion` se quita el movimiento.

Hay entradas escalonadas en cada pantalla, una línea de la gráfica que se dibuja al cambiar de periodo, indicadores que se deslizan en los controles segmentados y la navegación, y un modal que en móvil se abre como una hoja desde abajo.

## Estructura del proyecto

```txt
src/
├── app/
│   ├── page.tsx              # Landing
│   ├── entrar/               # Acceso (demo; Google, próximamente)
│   ├── email/alerta/         # Vista previa del email de alerta
│   └── app/                  # La aplicación
│       ├── layout.tsx        # Shell: barra lateral, cabeceras, modal, toasts
│       ├── page.tsx          # Panel
│       ├── productos/        # Mis productos + [id] (ficha)
│       ├── alertas/
│       ├── tiendas/
│       └── ajustes/
├── components/
│   ├── ui.tsx                # Botones, Switch, Segmented, badges, esqueletos...
│   ├── theme.tsx             # Tema claro/oscuro sin parpadeo
│   └── app/                  # Shell, modal de añadir producto, gráfica
└── lib/
    ├── demo-data.ts          # Datos de la demo y generador de históricos
    ├── store.ts              # Estado global (Zustand)
    ├── chart.ts              # Geometría de la gráfica
    ├── insights.ts           # Cálculos derivados
    ├── format.ts             # Formato es-ES
    └── __tests__/            # Tests unitarios
```

## Arrancar en local

Requiere Node.js 20 o superior.

```bash
npm install
npm run dev
```

La app queda en `http://localhost:3000`.

## Scripts

```bash
npm run dev        # servidor de desarrollo
npm run build      # build de producción
npm run start      # sirve el build
npm run lint       # ESLint
npm run typecheck  # comprueba TypeScript sin generar archivos
npm test           # tests unitarios con Vitest
```

## Hoja de ruta

- [x] **Fase 0 · Base**: Next.js, TypeScript, Tailwind, sistema de diseño y tema claro/oscuro.
- [x] **Fase 1 · MVP con demo**: todas las pantallas del diseño, demo sin registro, estados de carga, vacío y error, y tests de la lógica.
- [ ] **Despliegue** en Cloudflare con CI en GitHub Actions.
- [ ] **Cuentas de usuario** con inicio de sesión de Google y base de datos.
- [ ] **Fase 2 · Motor de precios**: tarea programada que revisa los precios y guarda el histórico real.
- [ ] **Fase 3 · Avisos**: emails con React Email + Resend y, después, Telegram.
- [ ] **Fase 4 · Pulido**: tests de extremo a extremo con Playwright, PWA instalable y capturas en este README.

## Sobre los datos

Nadir es un proyecto de portfolio y no tiene relación con ninguna de las tiendas o marcas que aparecen. En la demo, las tiendas y los productos son reales, pero **los precios son orientativos y el histórico está simulado**: no se consultan en directo. Las cuentas reales usarán datos reales obtenidos de fuentes que lo permitan.

---

Diseño y desarrollo: [Aleix](https://github.com/AleixAj).
