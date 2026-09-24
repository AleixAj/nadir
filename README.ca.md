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
  <a href="README.md"><img src="docs/readme/lang-es.svg" alt="Español" width="170"></a>
  <a href="README.en.md"><img src="docs/readme/lang-en.svg" alt="English" width="170"></a>
  <img src="docs/readme/lang-ca-active.svg" alt="Català" width="170">
</p>

**Compra al punt més baix.** Nadir és un monitor de preus: segueix els productes que t'interessen en diverses botigues, en desa l'historial i t'avisa quan baixen del preu que tu tries.

El nom ve de *nadir*, el punt més baix d'una corba. És un projecte de portfolio construït com un producte SaaS real: disseny propi amb un sistema de tokens, tema clar i fosc, animacions acurades, lògica de domini aïllada i provada, i una demo a punt per fer servir sense registrar-se.

> **Demo:** prem **«Entrar como demo»** i entraràs en un compte que ja segueix 12 productes, amb alertes i un historial d'un any.
> El desplegament públic a Cloudflare és en camí. La interfície és en castellà.

## Què pots fer

- **Tauler** amb l'estalvi del mes, les alertes actives, les últimes baixades i els productes a prop del preu objectiu.
- **Els meus productes**: taula amb minigràfica de 7 dies, mínim històric, millor botiga i estat de l'alerta. Filtres per llista, cerca i quatre maneres d'ordenar.
- **Fitxa de producte**, la pantalla principal:
  - gràfica de l'historial dibuixada en SVG, amb períodes de 7 dies, 1 mes, 3 mesos i 1 any, tooltip, línia del preu objectiu i el punt *nadir* marcat;
  - comparativa de botigues ordenada pel preu final amb enviament, amb l'opció «Millor» destacada;
  - alerta de preu amb interruptor, dreceres (mínim històric, −5 %, −10 %) i canals d'avís;
  - resum del període: màxim, mitjana, mínim i variació.
- **Afegir un producte** enganxant la URL d'una botiga compatible o cercant-lo pel nom, amb una vista prèvia abans de confirmar.
- **Alertes** actives amb el progrés cap a l'objectiu, i un historial d'avisos enviats.
- **Botigues**: estat de cada botiga, última revisió i temps de resposta, amb un exemple de botiga caiguda i el botó de reintentar.
- **Configuració**: perfil, canals, freqüència de revisió, tema i un botó per restablir la demo.
- **Correu d'alerta**: vista prèvia del correu que arriba quan es compleix un objectiu.

Detalls de producte:

- Disseny responsive: al mòbil la barra lateral passa a ser una barra inferior, les taules es converteixen en llistes i els diàlegs s'obren des de baix.
- Estats de càrrega (esquelets), buit i error a totes les pantalles. Es poden forçar amb `?estado=vacio`, `?estado=cargando` o `?estado=error`.
- Tema clar i fosc sense parpelleig en carregar: un script al `<head>` aplica el tema abans de pintar la pàgina.
- Els canvis de la demo (alertes, productes afegits, configuració) es desen al navegador.
- Accessibilitat: rols ARIA a taules, pestanyes, interruptors i diàlegs; focus visible; `Escape` tanca el diàleg; es respecta `prefers-reduced-motion`.

## Stack tècnic

| Capa | Elecció | Motiu |
|---|---|---|
| Framework | Next.js 16 (App Router) | Rutes per carpetes, layouts niats i pàgines prerenderitzades. |
| UI | React 19 | Components, hooks i la versió actual de l'ecosistema. |
| Llenguatge | TypeScript 5 (estricte) | Models de domini tipats (`Product`, `ShopOffer`, `Chart`...). |
| Estils | Tailwind CSS 4 + tokens CSS | Els colors del disseny són variables CSS; Tailwind les exposa com a utilitats (`bg-surface`, `text-brand-text`). |
| Estat | Zustand 5 + `persist` | Estat global sense *boilerplate* i desat a `localStorage`. |
| Animació | Motion 13 + CSS | Motion per al que és interactiu (diàleg, toasts, indicadors lliscants); CSS per al que és previsible (entrades, dibuix de la gràfica). |
| Gràfiques | SVG propi | Control total del disseny (línia esglaonada, punt *nadir*, objectiu) sense dependre d'una llibreria. |
| Icones | Tabler Icons | Importades una a una, així només s'inclouen les que es fan servir. |
| Tests | Vitest | Tests unitaris ràpids de la lògica de preus. |
| Desplegament | Cloudflare (previst) | Amb l'adaptador OpenNext, com a subdomini del portfolio. |

## Arquitectura

La lògica no depèn de React: són funcions pures a `src/lib/` que es poden provar per separat. Els components només llegeixen l'estat i pinten.

```txt
src/lib/demo-data.ts     Productes, botigues i generador d'historials
        |
src/lib/store.ts         Zustand: estat de la demo + persistència
        |
src/lib/insights.ts      Ordenar, progrés cap a l'objectiu, estat de l'alerta
src/lib/chart.ts         Geometria de la gràfica: escales, eixos, nadir
src/lib/format.ts        Format espanyol de preus, percentatges i dates
        |
src/app/**               Pàgines: llegeixen de l'store i pinten
```

### Historials simulats

`makeSeries()` genera un any de preus diaris de manera **determinista**: amb la mateixa llavor surt sempre la mateixa sèrie, així que les dades no canvien entre visites. Hi ha quatre formes de corba perquè cada gràfica expliqui una cosa diferent:

- `launch`: surt car i baixa per esglaons (mòbils després del llançament).
- `volatile`: canvia de preu sovint (típic dels marketplaces).
- `stable`: gairebé no es mou.
- `random`: canvis de tant en tant.

A més, inclou baixades pel Black Friday i el Prime Day, i garanteix que el mínim històric, el preu de fa 7 dies i el preu actual coincideixen amb les dades del producte. Els tests comproven aquestes regles.

### Gràfica

`buildChart()` calcula tot el que cal dibuixar: passos d'eix «bonics» (1, 2, 2,5, 5 × 10ⁿ), la línia esglaonada (el preu es manté fins que canvia), l'àrea, les marques dels eixos, el punt més baix del període i si aquest punt és el mínim de tot l'historial. El component `PriceChart` només pinta l'SVG, mesura l'amplada amb `ResizeObserver` i gestiona el tooltip.

### Animacions

Segueixen unes regles senzilles:

- Només s'animen `transform` i `opacity`.
- La interfície fa servir corbes `ease-out` fortes i durades de menys de 300 ms.
- Tot el que es prem respon (`scale(0.97)`).
- Amb `prefers-reduced-motion` es treu el moviment.

Hi ha entrades esglaonades a cada pantalla, una línia de la gràfica que es dibuixa en canviar de període, indicadors que llisquen als controls segmentats i a la navegació, i un diàleg que al mòbil s'obre com un full des de baix.

## Estructura del projecte

```txt
src/
├── app/
│   ├── page.tsx              # Landing
│   ├── entrar/               # Accés (demo; Google, aviat)
│   ├── email/alerta/         # Vista prèvia del correu d'alerta
│   └── app/                  # L'aplicació
│       ├── layout.tsx        # Shell: barra lateral, capçaleres, diàleg, toasts
│       ├── page.tsx          # Tauler
│       ├── productos/        # Els meus productes + [id] (fitxa)
│       ├── alertas/
│       ├── tiendas/
│       └── ajustes/
├── components/
│   ├── ui.tsx                # Botons, Switch, Segmented, badges, esquelets...
│   ├── theme.tsx             # Tema clar/fosc sense parpelleig
│   └── app/                  # Shell, diàleg d'afegir producte, gràfica
└── lib/
    ├── demo-data.ts          # Dades de la demo i generador d'historials
    ├── store.ts              # Estat global (Zustand)
    ├── chart.ts              # Geometria de la gràfica
    ├── insights.ts           # Càlculs derivats
    ├── format.ts             # Format es-ES
    └── __tests__/            # Tests unitaris
```

## Arrencar en local

Cal Node.js 20 o superior.

```bash
npm install
npm run dev
```

L'aplicació queda a `http://localhost:3000`.

## Scripts

```bash
npm run dev        # servidor de desenvolupament
npm run build      # build de producció
npm run start      # serveix el build
npm run lint       # ESLint
npm run typecheck  # comprova TypeScript sense generar fitxers
npm test           # tests unitaris amb Vitest
```

## Full de ruta

- [x] **Fase 0 · Base**: Next.js, TypeScript, Tailwind, sistema de disseny i tema clar/fosc.
- [x] **Fase 1 · MVP amb demo**: totes les pantalles del disseny, demo sense registre, estats de càrrega, buit i error, i tests de la lògica.
- [ ] **Desplegament** a Cloudflare amb CI a GitHub Actions.
- [ ] **Comptes d'usuari** amb inici de sessió de Google i base de dades.
- [ ] **Fase 2 · Motor de preus**: tasca programada que revisa els preus i desa l'historial real.
- [ ] **Fase 3 · Avisos**: correus amb React Email + Resend i, després, Telegram.
- [ ] **Fase 4 · Poliment**: tests d'extrem a extrem amb Playwright, PWA instal·lable i captures en aquest README.

## Sobre les dades

Nadir és un projecte de portfolio i no té relació amb cap de les botigues o marques que hi apareixen. A la demo, les botigues i els productes són reals, però **els preus són orientatius i l'historial és simulat**: no es consulten en directe. Els comptes reals faran servir dades reals obtingudes de fonts que ho permetin.

---

Disseny i desenvolupament: [Aleix](https://github.com/AleixAj).
