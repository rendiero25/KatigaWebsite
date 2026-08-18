# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

KumaKuma Website — full-stack company profile + CMS for **katiga.id**. The backend (Express + MongoDB) and frontend (React + Vite) live in the same repo. Express serves the built React app in production.

The public site is mid-redesign. Homepage, `/tentang-kami`, and `/produk` follow the design language described under "Design System"; the remaining public pages (`/katalog`, `/produk/:id`, `/berita`, `/kontak`, cart/checkout/profile) still carry the old one and will be reworked page by page. When touching a page that has not been converted yet, do not half-convert it — either follow its existing conventions or redesign it fully against a spec in `docs/superpowers/specs/`.

## Commands

### Development (run both servers simultaneously)
```bash
npm run dev
```
This runs `nodemon server.js` (port 8000 — see `.env`'s `PORT`, also enforced by the `predev` script's `kill-port 8000`) and `cd client && npx vite` (port 5173) concurrently.

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
PORT=8000
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
CRON_SECRET=...
```

`CRON_SECRET` melindungi `GET /api/cron/sweep`, endpoint yang dipanggil Vercel Cron (lihat `crons` di `vercel.json`) untuk menjalankan `checkExpiringPromos`, `syncBiteshipDeliveries`, dan `syncPendingPayments`. Tanpa variabel ini endpoint membalas 503 — sengaja, supaya sapuan tidak bisa dipicu siapa pun. Vercel mengirimkannya sebagai `Authorization: Bearer <CRON_SECRET>`, jadi nilainya harus sama persis dengan yang disimpan di Environment Variables proyek.

`setInterval` di `server.js` hanya hidup saat aplikasi dijalankan sebagai proses sendiri (`npm start`, `nodemon`). Di Vercel timer itu tidak pernah berjalan, jadi cron adalah satu-satunya jaring pengaman ketika webhook Mayar atau Biteship tidak sampai.

The three `CLOUDINARY_*` keys are required — `middleware/upload.js` configures the Cloudinary SDK at import time, so every upload route fails without them.

Create `client/.env` for the frontend:
```
VITE_API_URL=http://localhost:8000
```

## Architecture

### Backend (root level, CommonJS)

- **`server.js`** — Express entry point. Registers all routes under `/api/*`. Still mounts `uploads/` as public static (`app.use('/uploads', …)`), but this is legacy: uploads now go to Cloudinary and no document in the database references a `/uploads/` path. In production (`NODE_ENV=production`) serves `client/dist/` as the React SPA with a `*` fallback.
- **`config/db.js`** — Mongoose connection using `MONGODB_URI`.
- **`middleware/auth.js`** — JWT verification middleware; attaches `req.admin` on success. Applied to all write routes.
- **`middleware/upload.js`** — Multer with `multer-storage-cloudinary` (`CloudinaryStorage`) — files are streamed straight to **Cloudinary**, never written to disk. Configures `cloudinary.v2` from the `CLOUDINARY_*` env vars. Exports the multer instance as the default export and the configured `cloudinary` client as `.cloudinary`.
  - Accepted: `jpeg`, `jpg`, `png`, `gif`, `webp`, `pdf`, `mp4`, `webm` — enforced twice, by a `fileFilter` regex (extension **and** mimetype must both match) and by Cloudinary's own `allowed_formats`.
  - Size limit: 50 MB.
  - Every asset lands in the `katiga` folder. `resource_type` is derived from the extension: `raw` for PDFs, `video` for `mp4`/`webm`, `image` for everything else.
  - No `public_id` is set, so Cloudinary assigns a random one — the original filename is **not** preserved.
  - Each entry in `req.file` / `req.files` carries `path` (the absolute `https://res.cloudinary.com/…` URL — this is what routes persist) and `filename` (the Cloudinary public_id, e.g. `katiga/rkkfwiukelwfnt5yzw10`). The raw Cloudinary response is also spread onto the entry, so `secure_url` is available as an alias of `path`.
- **`routes/`** — One file per resource (31 files). Public GET, private POST/PUT/DELETE (protected by `auth` middleware). Route order matters: literal paths must be registered above `/:id`, or Express reads them as an id (see `GET /api/products/best-sellers`).
- **`models/`** — Mongoose schemas, one per collection. `Admin` hashes passwords via a `pre('save')` hook and exposes `matchPassword()`.
- **`seeds/seedData.js`** — Populates all collections with initial data; creates the first admin account.

### Frontend (`client/`, ESM + TypeScript)

- **`client/src/services/api.ts`** — Single source of truth for all API calls. `VITE_API_URL` is normalised to always end with `/api`. `api.getImageUrl()` returns any value starting with `http` untouched (the normal case — stored media are absolute Cloudinary URLs) and only falls back to stripping `/api` from the base URL for legacy relative paths.
- **`client/src/hooks/useApi.ts`** — Custom hooks that wrap every `api.*` call with `useState`/`useEffect`. Pages should use these hooks, not call `api.*` directly. Any hook whose request depends on changing arguments (filters, ids, ranges) needs a `latestRequestIdRef` guard so a slower earlier response cannot overwrite a newer one — see `useProducts` and `useLiveCart`.
- **`client/src/App.tsx`** — All routes defined here. Public pages use Indonesian URL slugs (`/tentang-kami`, `/produk`, `/berita`, `/kontak`). Admin pages are all under `/admin/*` with no route-level auth guard — the guard is handled server-side.
- **`client/src/pages/admin/`** — One admin page per CMS section (Dashboard, Products, Hero, Partners, …). They call the API with a `Bearer` token stored in `localStorage`.
- **`client/src/components/`** — Page-section components (HeroSection, ProductsSection, etc.) consumed by the public-facing pages. Page-specific components live in a subfolder named after the page: `components/about/` for `/tentang-kami`, `components/products/` for `/produk`.

Public pages assemble sections; they do not hold markup themselves. A page fetches shared data, owns filter/UI state, and renders section components. Two conventions coexist and both are fine — pick per section:
- Section fetches its own data via a hook (`AboutTechSection`, `ProductSpotlightSection`). Use when the data belongs to that section alone.
- Section is presentational and receives props (`AboutBanner`, `ProductCard`, `ProductFilterBar`). Use when the parent already has the data, or when several sections share one payload.

Type-only named exports alongside the default export are allowed where a presentational component defines the shape its parent must pass (`CatalogProduct` in `ProductCard.tsx`, `SortKey` in `ProductFilterBar.tsx`). This is the one exception to "no named exports from component files" — types, never components.

### Data flow pattern

Each CMS section follows this consistent pattern:
1. **Model** (`models/`) defines the schema
2. **Route** (`routes/`) exposes GET (public) + POST/PUT/DELETE (auth-protected)
3. **API method** (`client/src/services/api.ts`) fetches the endpoint
4. **Hook** (`client/src/hooks/useApi.ts`) wraps the fetch in state
5. **Admin page** (`client/src/pages/admin/`) edits the data
6. **Public component** (`client/src/components/`) renders it

### Image handling

- Uploads go to **Cloudinary**, under the `katiga` folder. Nothing is written to the project's `uploads/` directory.
- Routes persist `req.file.path` / `file.path` verbatim, so **every media field in MongoDB holds an absolute URL** like `https://res.cloudinary.com/{cloud}/image/upload/v{version}/katiga/{public_id}.{ext}`. Verified against the live database: no collection contains a `/uploads/` path.
- `api.getImageUrl(path)` returns `/placeholder.jpg` for empty values, passes anything starting with `http` through unchanged, and otherwise prepends the server origin. Never construct image URLs manually — always use this helper.
- **Legacy:** `uploads/` at the project root still holds ~144 files from the pre-Cloudinary era, and `server.js` plus the `/uploads/(.*)` route in `vercel.json` still serve them. No live document points at them. `seeds/seedData.js` is also still written against the old scheme — it seeds relative `/uploads/{filename}` paths, so running the seed reintroduces broken image references.
- `multer` uses `upload.any()` on product routes to handle variable field names; `keptImages` in PUT body tracks which existing images to retain.
- On PUT routes, never drop an existing image when no new file is uploaded. Follow the established convention: keep the stored value unless the client explicitly clears it (`keptImage=''` on categories, `__file__<fieldname>` placeholders on hero slides).
- Deleting a record does **not** delete its Cloudinary asset — no route calls `cloudinary.uploader.destroy()`. Orphaned assets accumulate.

### Auth

- Single admin account only (`/api/auth/register` blocks if any admin already exists).
- JWT tokens expire in 7 days. Token is stored in `localStorage` on the frontend.
- `/api/auth/register` is intentionally left public for initial setup — there is no admin creation UI.

### Type checking

```bash
cd client && npx tsc -b
```

Strict mode is on (`"strict": true` in `tsconfig.app.json`). All type errors must be resolved — do not suppress them with `@ts-ignore` or `@ts-expect-error` unless there is a genuine upstream library bug, in which case leave a comment explaining why.

Must use `-b` (build mode), not `--noEmit`. `client/tsconfig.json` is solution-style (`"files": []` + `references`, no `include`), so plain `tsc --noEmit` type-checks nothing and always exits 0 — it will not catch real errors. `tsc -b` is also what `vercel-build` runs, so it's the only command that matches what actually ships.

### Linting

```bash
cd client && npm run lint
```

### Tests

There is **no test suite** in this project. Do not add test files unless explicitly asked. When verifying a change, run the dev server and test manually in the browser.

### Full verification before a commit

```bash
cd client && npx tsc -b && npm run lint
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
- **Do not use `style={{}}`** for anything that can be expressed as a Tailwind class. Inline styles are only acceptable for truly dynamic numeric values (e.g. a width percentage computed from data, or hotspot coordinates from a document).
- **Do not use `style={{ backgroundImage: url(...) }}`** for photography. Use a positioned `<img>` with `object-cover` so the browser can lazy-load, size, and cache it.
- **Do not reintroduce the retired visual language on public pages** — blue gradients, `rounded-full` buttons, heavy shadows, `font-bold` headings, `.glass`, `.gradient-text`.
- **Do not write base element rules outside `@layer base` in `index.css`.** Unlayered CSS beats Tailwind's utilities layer and will silently override `text-*` classes everywhere.
- **Do not style admin pages with the public design tokens**, and do not remove the `admin-shell` class from `AdminLayout.tsx`.
- **Do not fill empty CMS data with invented content** — no placeholder prose, no fake reviews, no external stock photos. Render a skeleton, a sized placeholder, or nothing.
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

### Design origin

The public site follows the visual language of https://littlepalmerhaus.com — editorial and quiet: neutral-dominant palette, small uppercase type with wide letter-spacing, square corners, near-zero shadows, and full-bleed photography carrying the weight. The brand blue is an **accent**, not a field colour. The old language (blue gradients, `rounded-full` pills, heavy shadows, oversized bold display type) has been removed from public pages — do not reintroduce it.

The admin panel deliberately opts out of this language. See "Admin Panel" below.

Per-page specs live in `docs/superpowers/specs/`. Read the relevant one before reworking a page.

### Fonts & Base

- Font family: **Nunito Sans** (weights 300–700), loaded via Google Fonts. Applied through `--font-primary` and the body default.
- Body: `14px`, `line-height 1.65`, colour `--color-ink` (`#6f6f71`) — not `gray-900`.
- `body` sets an explicit `background-color`. Without it, gaps between full-bleed blocks render transparent.
- Headings `h1`–`h6` are styled globally in `@layer base`: `font-weight 400`, `uppercase`, `letter-spacing 0.05em`, colour `--color-ink-strong`.

**These base rules must stay inside `@layer base`.** Unlayered CSS outranks Tailwind's `utilities` layer, so an unlayered `h1 { color }` beats every `text-*` colour utility and silently breaks headings site-wide.

### Color Tokens (`@theme` in `index.css`)

| Token | Value | Role |
|---|---|---|
| `--color-ink` | `#6f6f71` | body text |
| `--color-ink-strong` | `#1e1e1e` | headings |
| `--color-line` | `#e9e9ea` | borders, dividers |
| `--color-surface` | `#ffffff` | page background |
| `--color-surface-alt` | `#f9f7f2` | image placeholders, alternate blocks |
| `--color-primary` | `#4f68af` | accent — links, primary buttons, badges |
| `--color-primary-dark` | `#2b3a67` | accent hover, footer background |
| `--radius` | `0rem` | square corners everywhere on public pages |
| `--shadow-sm` | `0 2px 8px rgb(0 0 0 / 0.05)` | the only shadow in use |

Also defined: `--text-h1/h2/h3` (fluid `clamp`), `--tracking-heading` `.05em`, `--tracking-button` `.18em`, `--tracking-nav` `.12em`.

Sale/discount text uses `#AE4B4B` with no background fill.

Proportion matters as much as the values: roughly 90% neutral, 10% accent. Blue used across large areas turns the uppercase-and-square treatment stiff rather than elegant.

### Spacing & Layout

- **Page container**: `container mx-auto px-4 sm:px-10 lg:px-20 xl:px-30`
- **Between page sections**: the page's `<main>` owns the rhythm — `flex flex-col gap-15 md:gap-24`. Sections do not add their own outer margins.
- **Within a section**: `py-16`, or `pt-10 pb-20` where a heading needs less space above.
- **Full-bleed blocks** sit outside the container: hero `h-[calc(100vh-80px)] min-h-[560px]`, page banner `h-[320px] md:h-[440px]`, quote/about banner `h-[440px]`.

### Typography Scale

| Usage | Classes |
|---|---|
| Page / section heading | `text-2xl md:text-3xl` (uppercase comes from `@layer base`) |
| Eyebrow / label | `uppercase tracking-[0.18em] text-[13px] text-[#6F6F71]` |
| Nav link | `uppercase tracking-[0.12em] text-[13px]` |
| Product / card name | `uppercase text-[13px] text-[#1E1E1E]` |
| Body | `text-sm text-[#6F6F71] leading-relaxed` |
| Price, meta | `text-[13px] text-[#6F6F71]` |
| Chip, badge, caption | `text-[11px]` |

Do not set `font-bold` on public headings — weight 400 is the look. Do not force fixed heights on titles.

### Buttons

Square, uppercase, wide-tracked. No radius, no gradient, no shadow.

| Variant | Classes |
|---|---|
| Primary | `bg-[#4F68AF] text-white uppercase tracking-[0.18em] text-[13px] px-6 py-3 hover:bg-[#2B3A67] transition` |
| Outline (dark) | `border border-[#1E1E1E] uppercase tracking-[0.18em] text-[13px] px-8 py-4 hover:bg-[#1E1E1E] hover:text-white transition` |
| Outline (on photo) | `border border-white text-white uppercase tracking-[0.18em] text-[13px] px-8 py-4 hover:bg-white hover:text-[#1E1E1E] transition` |
| Chip / filter | `border border-[#E9E9EA] text-[11px] px-3 py-1 uppercase` |

### Cards & Images

- Product card: image `aspect-square bg-[#F9F7F2] overflow-hidden`, `<img>` hover `scale-105 transition duration-700`. No card border, no radius, no shadow.
- Category card: `aspect-[3/4]`, name centred in white `text-4xl md:text-5xl uppercase tracking-wide drop-shadow-lg`.
- Full-bleed photo blocks: `<img className="absolute inset-0 w-full h-full object-cover">` inside a `relative` wrapper. **Never** `style={{ backgroundImage: url(...) }}`.
- Maps and logos use `object-contain` so they are never cropped; photography uses `object-cover`.
- Missing image: render `bg-[#F9F7F2]` at the final height. Never a stock photo from an external URL, never fake text.

### Navigation

- One header style on every route: `sticky top-0 h-20 bg-white border-b border-[#E9E9EA]`. No per-page background branching, no `backdrop-blur`.
- Nav links `uppercase tracking-[0.12em] text-[13px] text-[#6F6F71]`, gap `28px`. Active: `text-[#1E1E1E]` plus a 1px underline.
- Icons: thin-line `react-icons/fi`, 20px, `text-[#6F6F71]`.
- Mobile: right-side sliding drawer (`fixed inset-y-0 right-0` + backdrop + `translate-x` transition), closable by backdrop and by an × button. Not a dropdown.
- Filter bars stick below the header at `sticky top-20 z-30`.

### Footer

`bg-[#2B3A67]`, text `text-white/80`, column headings `text-white uppercase tracking-[0.05em] text-[13px]`. Consultation CTA, then four columns (blurb + socials, navigation, help, contact + newsletter), then a copyright row separated by `border-t border-white/15`. Columns collapse into accordions on mobile.

### Motion

Restrained. Section reveal is `{ opacity: 0, y: 16 }` → `{ opacity: 1, y: 0 }` over `0.8s`, `viewport={{ once: true }}`. Image hover is `scale-105` over `700ms`. Avoid long travel distances and staggered cascades.

### Admin Panel

The admin UI keeps its own conventions and is isolated from the public design language by the `admin-shell` class on `SidebarProvider` in `AdminLayout.tsx`. That class restores `--radius: 0.5rem`, dark text, and normal-case headings and controls.

Do not apply public tokens (uppercase headings, radius 0, wide tracking) to admin pages, and do not remove `admin-shell`.

Layout: dark sidebar + light content, active sidebar item `bg-indigo-600 text-white`, main content `bg-gray-100`, admin header `bg-white border-b border-gray-200 h-16 sticky top-0 z-30`, content padding `p-6`.

### Empty & Missing Data

Every public section must survive empty data without crashing and without inventing content:
- Loading → `animate-pulse` skeleton shaped like the real content.
- Genuinely empty and meaningless when empty → `return null`.
- Empty but structurally needed (a banner awaiting its photo) → placeholder `bg-[#F9F7F2]` at the final height.
- A filtered list with no matches → a calm message plus a control that clears the filters. Never a bare empty grid.

Never ship placeholder prose, fake testimonials, or third-party stock images as stand-in content.

### Loading / Skeleton States

Use `animate-pulse` with gray placeholder shapes, sized like the content they stand in for — same grid, same aspect ratio, same number of items:
```tsx
<div className="h-8 bg-gray-200 w-1/3"></div>
<div className="aspect-square bg-gray-200"></div>
```
No `rounded-*` on public skeletons. The section wrapper keeps its normal background while loading.

### Custom Utility Classes (defined in `index.css`)

| Class | Effect |
|---|---|
| `.animate-fade-in-up` | Fade + slide up on mount (0.6s) |
| `.animate-float` | Gentle vertical float loop (3s) |
| `.no-scrollbar` | Hides the scrollbar on horizontal snap carousels |

`.glass` and `.gradient-text` were removed with the old design language. Do not add them back.
