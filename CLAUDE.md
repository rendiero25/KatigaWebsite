# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

KumaKuma Website — full-stack company profile + CMS for **katiga.id**. The backend (Express + MongoDB) and frontend (React + Vite) live in the same repo. Express serves the built React app in production.

## Commands

### Development (run both servers simultaneously)
```bash
npm run dev
```
This runs `nodemon server.js` (port 5000) and `cd client && npx vite` (port 5173) concurrently.

> **Run these before every commit** — lint and type-check must both pass.


### Frontend only
```bash
cd client && npm run dev
```

### Backend only
```bash
nodemon server.js
```

### Build for production
```bash
npm run build        # builds client/dist/
npm start            # serves everything from Express
```

### Seed the database
```bash
npm run seed
```

### Install all dependencies (first time setup)
```bash
npm run install:all
```

## Environment Variables

Create `.env` at the project root:
```
MONGODB_URI=mongodb+srv://...
JWT_SECRET=...
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
```

Create `client/.env` for the frontend:
```
VITE_API_URL=http://localhost:5000
```

## Architecture

### Backend (root level, CommonJS)

- **`server.js`** — Express entry point. Registers all routes under `/api/*`, serves `uploads/` as public static. In production (`NODE_ENV=production`) serves `client/dist/` as the React SPA with a `*` fallback.
- **`config/db.js`** — Mongoose connection using `MONGODB_URI`.
- **`middleware/auth.js`** — JWT verification middleware; attaches `req.admin` on success. Applied to all write routes.
- **`middleware/upload.js`** — Multer disk storage to `uploads/`. Accepts images, PDFs, and videos up to 50 MB. Files are named `{fieldname}-{timestamp}-{random}.{ext}`.
- **`routes/`** — One file per resource (18 routes). Public GET, private POST/PUT/DELETE (protected by `auth` middleware).
- **`models/`** — Mongoose schemas, one per collection. `Admin` hashes passwords via a `pre('save')` hook and exposes `matchPassword()`.
- **`seeds/seedData.js`** — Populates all collections with initial data; creates the first admin account.

### Frontend (`client/`, ESM + TypeScript)

- **`client/src/services/api.ts`** — Single source of truth for all API calls. `VITE_API_URL` is normalised to always end with `/api`. `api.getImageUrl()` strips `/api` from the base URL to build image paths pointing to `/uploads/`.
- **`client/src/hooks/useApi.ts`** — Custom hooks that wrap every `api.*` call with `useState`/`useEffect`. Pages should use these hooks, not call `api.*` directly.
- **`client/src/App.tsx`** — All routes defined here. Public pages use Indonesian URL slugs (`/tentang-kami`, `/produk`, `/berita`, `/kontak`). Admin pages are all under `/admin/*` with no route-level auth guard — the guard is handled server-side.
- **`client/src/pages/admin/`** — One admin page per CMS section (Dashboard, Products, Hero, Partners, …). They call the API with a `Bearer` token stored in `localStorage`.
- **`client/src/components/`** — Page-section components (HeroSection, ProductsSection, etc.) consumed by the public-facing pages.

### Data flow pattern

Each CMS section follows this consistent pattern:
1. **Model** (`models/`) defines the schema
2. **Route** (`routes/`) exposes GET (public) + POST/PUT/DELETE (auth-protected)
3. **API method** (`client/src/services/api.ts`) fetches the endpoint
4. **Hook** (`client/src/hooks/useApi.ts`) wraps the fetch in state
5. **Admin page** (`client/src/pages/admin/`) edits the data
6. **Public component** (`client/src/components/`) renders it

### Image handling

- Uploaded files land in `uploads/` at the project root and are stored as paths like `/uploads/{filename}` in MongoDB.
- `api.getImageUrl(path)` converts a stored path to an absolute URL by prepending the server origin. Never construct image URLs manually — always use this helper.
- `multer` uses `upload.any()` on product routes to handle variable field names; `keptImages` in PUT body tracks which existing images to retain.

### Auth

- Single admin account only (`/api/auth/register` blocks if any admin already exists).
- JWT tokens expire in 7 days. Token is stored in `localStorage` on the frontend.
- `/api/auth/register` is intentionally left public for initial setup — there is no admin creation UI.

### Type checking

```bash
cd client && npx tsc --noEmit
```

Strict mode is on (`"strict": true` in `tsconfig.app.json`). All type errors must be resolved — do not suppress them with `@ts-ignore` or `@ts-expect-error` unless there is a genuine upstream library bug, in which case leave a comment explaining why.

### Linting

```bash
cd client && npm run lint
```

### Tests

There is **no test suite** in this project. Do not add test files unless explicitly asked. When verifying a change, run the dev server and test manually in the browser.

### Full verification before a commit

```bash
cd client && npx tsc --noEmit && npm run lint
```

## TypeScript Conventions

- **No `any`** — use the real type, `unknown`, or a narrow union. The only exception is `product: any` in list renders where the API shape is not yet typed; fix it by adding a proper interface if you touch that file.
- **Prefer `interface` over `type`** for object shapes; use `type` only for unions and aliases.
- **`import type`** for all type-only imports (`import type { ReactNode } from 'react'`). `verbatimModuleSyntax` is on — mixing value/type imports in the same statement will fail.
- **No `enum`** — use `as const` objects or union string literals instead (`erasableSyntaxOnly` is on).
- **Props typing**: define a local `interface Props` at the top of every component file. Never use `React.FC` — just type the props argument directly.
- **Async fetch errors**: always check `res.ok` before calling `.json()` in `api.ts`; throw a descriptive `Error` on failure.
- Return type annotations are optional on private helpers but required on all exported functions in `api.ts`.

## Code Style

- **Imports order** (one blank line between groups):
  1. React + third-party packages
  2. Internal hooks (`../hooks/…`)
  3. Internal services/utils (`../services/…`)
  4. Internal components (`../components/…`)
  5. Assets (`../assets/…`)
- **Component file structure**:
  1. Imports
  2. Interface/type definitions
  3. Helper functions (if any)
  4. The default-exported component
  5. No named exports from component files — one component per file, exported as `default`.
- **Naming**:
  - Components: `PascalCase` (`HeroSection.tsx`)
  - Hooks: `camelCase` prefixed with `use` (`useHero`)
  - API methods: `camelCase` verbs (`getHero`, `updateHero`)
  - Route files (backend): `camelCase` noun (`hero.js`, `siteSettings.js`)
- **String quotes**: single in TSX/JS; double only inside JSX attribute values.
- **No `console.log`** left in committed code. Use them during debugging and remove before committing.

## Adding a New CMS Section

Follow this exact sequence — do not skip steps:

1. **Model** — create `models/MySectionName.js` (Mongoose schema, CommonJS).
2. **Route** — create `routes/mySectionName.js`. Public `GET /api/my-section-name`, auth-protected `POST`/`PUT`/`DELETE`.
3. **Register route** — add `app.use('/api/my-section-name', require('./routes/mySectionName'))` in `server.js`.
4. **API method** — add `getMySection` / `updateMySection` etc. to `client/src/services/api.ts`.
5. **Hook** — add `useMySection` to `client/src/hooks/useApi.ts`.
6. **Admin page** — create `client/src/pages/admin/MySection.tsx`. Register the route in `App.tsx` and add a sidebar entry in `AdminLayout.tsx`.
7. **Public component** — create `client/src/components/MySectionSection.tsx` and add it to the relevant public page.
8. **Seed** — add initial data to `seeds/seedData.js`.

## Commit Messages

Format: `<type>: <short imperative summary>` (≤72 chars, no period).

| Type | When to use |
|---|---|
| `feat` | new user-visible feature or CMS section |
| `fix` | bug fix |
| `style` | UI-only change (no logic change) |
| `refactor` | code change that is neither a fix nor a feature |
| `chore` | tooling, deps, config, seed data |
| `docs` | CLAUDE.md or README only |

Examples:
```
feat: add distribution section to about page
fix: correct image URL construction in products carousel
style: update hero CTA button gradient to match brand
chore: add tsconfig strict noEmit check to README
```

## DO NOT

These are explicit prohibitions — do not do any of these without first discussing:

- **Do not `npm install` a new client-side package** without confirming it is not already covered by an existing dependency (e.g. `motion` is installed; do not also add `framer-motion`).
- **Do not create `.css` files for individual components.** All component styling goes in `className`. Only `client/src/index.css` may contain CSS.
- **Do not use `style={{}}`** for anything that can be expressed as a Tailwind class. Inline styles are only acceptable for truly dynamic numeric values (e.g. a width percentage computed from data).
- **Do not hardcode API URLs.** Always use `API_BASE_URL` from `client/src/services/api.ts` and the `api.*` methods.
- **Do not construct image URLs manually.** Always use `api.getImageUrl(path)`.
- **Do not call `api.*` directly inside components.** Go through `useApi.ts` hooks.
- **Do not add a route-level auth guard on the frontend.** Auth is enforced server-side; the client-side check in `AdminLayout.tsx` is only a redirect convenience.
- **Do not modify `seeds/seedData.js` in a way that drops existing production data** — the seed script wipes collections before inserting.
- **Do not leave debugging `console.log` statements in committed code.**
- **Do not use `@ts-ignore`** without a comment explaining the upstream issue.
- **Do not create new files** when editing an existing one would suffice.
- **Do not add comments** that restate what the code already says — only comment on non-obvious *why*, not *what*.

## Design System

All styling **must** use Tailwind `className`. Never use inline `style={{}}` props except when a value is truly dynamic and cannot be expressed as a Tailwind class (e.g. percentage widths from data). Never use CSS modules or separate `.css` files for component-level styles — `client/src/index.css` is reserved for global resets, custom utilities, and `@theme` tokens only.

### Fonts & Base

- Font family: **Outfit** (variable weight 100–900), loaded via Google Fonts. Apply via `font-primary` token or the body default.
- Body text color: `text-gray-900` (`#111827`). Line height: `leading-relaxed` (1.6).
- Smooth scrolling is enabled globally via `html { scroll-behavior: smooth }`.

### Color Tokens (`@theme` in `index.css`)

| Token | Value | Tailwind class |
|---|---|---|
| `--color-primary` | `#4f68af` | `bg-primary`, `text-primary`, `border-primary` |
| `--color-primary-dark` | `#3730a3` | `bg-primary-dark`, etc. |
| `--color-black` | `#1e1e1e` | `text-black` (also used as `#1e1e1e`) |
| `--color-secondary` | `#ec4899` | `bg-secondary`, `text-secondary` |
| `--color-accent` | `#10b981` | `bg-accent`, `text-accent` |
| Gray scale | `gray-50` → `gray-900` | standard Tailwind gray classes |

Hardcoded hex values used in practice (use these exact values for consistency):
- Page/section background: `bg-[#F9F7F2]` (warm off-white)
- Deep navy (gradient end): `#212B49` or `#2B3A67`
- Brand gradient: `bg-gradient-to-br from-[#4F68AF] to-[#2B3A67]` (primary CTA buttons)

### Custom Utility Classes (defined in `index.css`)

| Class | Effect |
|---|---|
| `.gradient-text` | Pink→purple→blue gradient on text via `background-clip: text` |
| `.glass` | Frosted glass: `bg-white/80 backdrop-blur-[10px] border border-white/30` |
| `.animate-fade-in-up` | Fade + slide up on mount (0.6s) |
| `.animate-float` | Gentle vertical float loop (3s) |

### Spacing & Layout

- **Page container**: `container mx-auto px-4 sm:px-10 lg:px-20 xl:px-30`
- **Sections** (public pages): `pt-10` or `py-16` top padding; no horizontal padding on the section itself — applied on the inner container.
- **Max content width**: `max-w-7xl mx-auto` for content-heavy sections.
- **Section background**: public sections alternate between `bg-white` and `bg-[#F9F7F2]`.

### Typography Scale

| Usage | Classes |
|---|---|
| Hero title | `text-3xl md:text-5xl font-normal leading-tight text-[#1e1e1e]` |
| Section heading | `text-2xl md:text-3xl lg:text-4xl font-normal text-black leading-tight` |
| Section label / eyebrow | `text-lg font-bold text-black mb-4` |
| Card title | `text-2xl font-bold text-black leading-tight` |
| Body / description | `text-lg text-black/80 leading-relaxed` |
| Small body | `text-sm text-black/80 leading-relaxed` |
| Vertical display text | `text-[80px] xl:text-9xl font-black text-black leading-none tracking-tighter uppercase` |
| Footer / meta | `text-md text-black/80` |
| Nav links | `text-md font-medium` |

### Buttons

| Variant | Classes |
|---|---|
| Primary (CTA) | `inline-flex items-center px-10 py-4 bg-gradient-to-br from-[#4F68AF] to-[#2B3A67] text-white font-medium rounded-full shadow-[0_10px_20px_rgba(79,104,175,0.3)] hover:shadow-lg hover:-translate-y-1 transition-all duration-300 text-sm tracking-wide` |
| Secondary outline | `px-8 py-4 bg-linear-to-b from-primary to-[#212B49] text-white font-medium rounded-full hover:bg-primary transition shadow-lg text-lg` |
| Mobile nav CTA | `py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition` |
| Icon circle | `w-12 h-12 rounded-full border border-gray-300 flex items-center justify-center text-gray-600 hover:bg-primary hover:border-0 hover:text-white transition` |

### Cards & Images

- Product image card: `rounded-2xl bg-gray-100 overflow-hidden` with hover `scale-105 transition duration-500` on the `<img>`.
- Image overlay link button: `absolute bottom-4 right-4 w-10 h-10 bg-white/30 backdrop-blur-md rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition duration-300`.

### Navigation

- Desktop nav: black pill — `bg-black rounded-full px-1.5 py-1.5 gap-2` with link pills `px-3 py-1.5 rounded-full`.
- Active nav link: `bg-white text-black`; inactive: `text-white hover:text-gray-300`.
- Mobile nav active: `text-indigo-600`; inactive: `text-gray-800 hover:text-indigo-600`.
- Header height: `h-20 py-12`.
- Sticky/scroll header: `bg-white/80 backdrop-blur-md` when scrolled or on inner pages.

### Header backgrounds by page

| Condition | Header style |
|---|---|
| Home (not scrolled) | `bg-[#F9F7F2]` |
| Any inner page or scrolled | `bg-white/80 backdrop-blur-md` |
| Katalog (not scrolled) | `bg-transparent` (absolute positioned) |

### Admin Panel

The admin UI uses a dark sidebar + light content layout:
- Sidebar: `bg-gray-900 text-white w-64` fixed left.
- Active sidebar item: `bg-indigo-600 text-white`; parent with active child: `bg-indigo-900 text-white`.
- Inactive sidebar item: `text-gray-400 hover:bg-gray-800 hover:text-white`.
- Main content bg: `bg-gray-100`.
- Admin header: `bg-white border-b border-gray-200 h-16 sticky top-0 z-30`.
- Content padding: `p-6`.

### Loading / Skeleton States

Use `animate-pulse` with gray placeholder shapes:
```tsx
<div className="h-8 bg-gray-200 rounded w-1/3"></div>
<div className="h-4 bg-gray-200 rounded w-2/3"></div>
```
Section wrapper during load: `py-16 bg-gray-50` or match the section's normal background.
