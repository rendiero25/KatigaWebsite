# Copilot Instructions — KatigaWebsite

## Project Stack
- Backend: Express.js + MongoDB (Mongoose) — CommonJS, root level
- Frontend: React + Vite + TypeScript + Tailwind CSS v4 — in `client/`
- File storage: Cloudinary (via `multer-storage-cloudinary`)
- DB: MongoDB Atlas

## shadcn/ui

This project uses **shadcn/ui** with Tailwind CSS v4.

### Setup (already configured)
- `client/components.json` — shadcn config
- `client/src/lib/utils.ts` — exports `cn()` helper
- `client/src/components/ui/` — shadcn components live here
- Path alias: `@/` → `client/src/`

### Add a component
```bash
cd client && npx shadcn@latest add <component>
```

### Import
```tsx
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
```

### Rules
- Never edit files inside `client/src/components/ui/` — they are owned by shadcn
- Wrap/extend shadcn components in `client/src/components/` instead
- Use `cn()` from `@/lib/utils` for conditional classes
- Tailwind v4: no `tailwind.config.ts`, config is CSS-first in `client/src/index.css`

## Code Conventions

### Backend
- CommonJS (`require`/`module.exports`)
- Routes: `GET` public, `POST/PUT/DELETE` protected by `middleware/auth.js`
- File uploads: always via `middleware/upload.js` (Cloudinary) — `req.file.path` = Cloudinary URL
- Never construct image URLs manually — use route handler pattern from existing routes

### Frontend
- All API calls via `client/src/services/api.ts` — never fetch directly in components
- Use hooks from `client/src/hooks/useApi.ts` — never call `api.*` directly in components
- Images: always `api.getImageUrl(path)` — never construct URLs manually
- Styling: Tailwind `className` only — no inline `style={{}}` except truly dynamic values
- No `.css` files per component — only `client/src/index.css`
- No `any` types — use proper interfaces
- `import type` for all type-only imports

## Dev Commands
- Both servers: `npm run dev` (backend :8000, frontend :5173)
- Frontend only: `cd client && npm run dev`
- Type check: `cd client && npx tsc --noEmit`
- Lint: `cd client && npm run lint`
