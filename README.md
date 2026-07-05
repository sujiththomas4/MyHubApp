# Hub — Flexible Admin (Vite + React)

A personal admin hub with a **left sidebar**, a **topbar**, and a live **Theme
Customizer** that changes layout, structure, color scheme, and accent color on
the fly. Inspired by the Velzon layout; built as clean, original code you own.

- **Vite + React 18**
- **Bootstrap 5.3** (native light/dark via `data-bs-theme`)
- **Poppins** font (same family as the reference site)
- **Remix Icons**, **ApexCharts**, **SimpleBar**
- Theme settings persist to **localStorage** (one swap-point for a backend later)

## Getting started

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # production build → dist/
npm run preview  # preview the build
```

> Requires Node 18+.

## How the theme engine works

Every setting is written to the `<html>` element as a `data-*` attribute, and
the CSS reacts to it — so switching is instant, no reload:

| Setting            | Attribute                 | Values                                   |
| ------------------ | ------------------------- | ---------------------------------------- |
| Layout             | `data-layout`             | vertical · horizontal · twocolumn · semibox |
| Color scheme       | `data-bs-theme`           | light · dark                             |
| Accent color       | `data-preset`             | green · default · blue · purple · orange · teal |
| Topbar color       | `data-topbar`             | light · dark                             |
| Sidebar color      | `data-sidebar`            | light · dark · gradient                  |
| Sidebar size       | `data-sidebar-size`       | lg · md · sm · sm-hover                   |
| Sidebar visibility | `data-sidebar-visibility` | show · hidden                            |
| Layout width       | `data-layout-width`       | fluid · boxed                            |
| Layout position    | `data-layout-position`    | fixed · scrollable                       |

Everything is driven from **`src/config/themeConfig.js`** — the customizer panel
is generated from it. Add an option there + a matching CSS rule and it shows up
automatically.

## Project structure

```
src/
├─ config/themeConfig.js      # all customizer options + defaults (source of truth)
├─ context/ThemeContext.jsx   # state, localStorage, writes data-* attributes
├─ styles/
│  ├─ index.css               # imports + base + Poppins tokens
│  ├─ theme.css               # color schemes, accent presets, chrome colors
│  ├─ layout.css              # sidebar/topbar structure + all layout variants
│  └─ components.css          # cards, tables, widgets, the customizer panel
├─ data/
│  ├─ menu.js                 # sidebar navigation model
│  └─ dashboardData.js        # mock data for the dashboard (replace with API)
├─ layouts/MainLayout.jsx     # assembles chrome + <Outlet/>
├─ components/
│  ├─ layout/                 # Topbar, Sidebar, HorizontalMenu, Footer, ThemeCustomizer
│  └─ dashboard/              # widgets, charts, tables
└─ pages/
   ├─ Dashboard.jsx           # the one fully-built screen
   └─ Placeholder.jsx         # stub for every other route
```

## Adding a new screen

1. Create `src/pages/MyScreen.jsx`.
2. Add a route in `src/App.jsx`:
   ```jsx
   <Route path="/my-screen" element={<MyScreen />} />
   ```
3. Point a menu item's `to` at `/my-screen` in `src/data/menu.js`.

## Wiring in a backend (later)

- **API base URL**: set `VITE_API_BASE_URL` in `.env` (see `.env.example`) and
  read it with `import.meta.env.VITE_API_BASE_URL`.
- **Dev proxy**: uncomment the `proxy` block in `vite.config.js` to forward
  `/api` to your server and avoid CORS in development.
- **Persisting settings server-side**: the only persistence seam is `persist()`
  in `src/context/ThemeContext.jsx`. Change that one function to also PUT the
  settings to your API — nothing else needs to move.
- **Dashboard data**: replace the imports from `src/data/dashboardData.js` with
  `fetch`/react-query calls. The components only depend on the data shapes.
```
