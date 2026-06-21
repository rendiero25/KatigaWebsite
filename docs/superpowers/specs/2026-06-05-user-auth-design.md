# User Auth System Design
Date: 2026-06-05

## Overview
Add customer registration and login with Google OAuth (GIS), welcome email via Resend, proper post-auth redirects, and polished UI using shadcn two-column blocks with Emil design animations.

## Scope
- Email/password register + login (existing, enhanced)
- Google Sign-In via client-side Google Identity Services
- Welcome email on new user creation (Resend)
- Post-register → `/profil`, post-login → `/produk`
- Replace `Daftar.tsx` and `Masuk.tsx` UI with shadcn `signup-02` / `login-02`
- Basic `/profil` placeholder page
- Profile page full feature: out of scope (future)

---

## Backend

### `models/Customer.js` changes
- `phone`: remove `required: true`, add `default: ''`
- Add `googleId: { type: String, sparse: true, index: true }` — optional, unique where present

### `services/emailService.js` (new)
- Wraps Resend SDK
- Exports `sendWelcomeEmail(name: string, email: string): Promise<void>`
- Uses `RESEND_API_KEY` from `.env`
- Sends from a configured sender address (e.g. `noreply@katiga.id`)
- Called on new user creation only (register + google first-time)

### `routes/customerAuthRoutes.js` changes

**Existing endpoints** (keep as-is, small tweaks):
- `POST /api/customers/register` — after creating Customer, call `sendWelcomeEmail`. Return same shape.
- `POST /api/customers/login` — no change.
- `GET /api/customers/me` — no change.
- `PUT /api/customers/me` — no change.

**New endpoint:**
- `POST /api/customers/google`
  - Body: `{ credential: string }` (Google ID token)
  - Verify token via `GET https://oauth2.googleapis.com/tokeninfo?id_token=<credential>`
  - Extract `sub` (googleId), `email`, `name`, `picture` from response
  - Find Customer by `googleId` OR `email`
  - If found: return JWT (login flow)
  - If not found: create new Customer `{ name, email, googleId, phone: '' }`, call `sendWelcomeEmail`, return JWT (register flow)
  - Error if Google token invalid (401)

### `.env` additions
```
RESEND_API_KEY=<provided later>
GOOGLE_CLIENT_ID=<provided later>
```

### `client/.env` additions
```
VITE_GOOGLE_CLIENT_ID=<provided later>
```
Used by GIS `google.accounts.id.initialize({ client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID })`.

---

## Frontend

### `client/index.html`
Add Google GIS script tag:
```html
<script src="https://accounts.google.com/gsi/client" async defer></script>
```

### `client/src/services/api.ts`
Add method:
```ts
customerGoogleAuth: async (credential: string) => { ... }
```
POSTs `{ credential }` to `/api/customers/google`.

### `client/src/pages/Masuk.tsx` (full replace)
- Base: shadcn `login-02` block (two-column)
- Left column: brand gradient `from-[#4F68AF] to-[#2B3A67]`, Katiga logo + tagline
- Right column: email/password form + "Masuk dengan Google" button
- Google button: triggers `google.accounts.id.initialize` + `renderButton` or manual prompt
- On success: `localStorage.setItem('customerToken', ...)` + navigate to `/produk`
- On Google success: navigate to `/produk` (login context)
- Animations: staggered fade-in on form fields via `motion`, button hover micro-interaction

### `client/src/pages/Daftar.tsx` (full replace)
- Base: shadcn `signup-02` block (two-column)
- Same left column brand gradient
- Right column: name, email, phone, password, confirm password + "Daftar dengan Google" button
- On email/password success: navigate to `/profil`
- On Google success: navigate to `/profil` (register context → profile)
- Animations: same Emil pattern — staggered field entry, cover subtle parallax on mousemove

### `client/src/pages/Profil.tsx` (new, placeholder)
- Protected: if no `customerToken` in localStorage → redirect to `/masuk`
- Show: nama, email, tombol "Keluar" (clear localStorage, redirect to `/`)
- Full profile UI: future scope

### `client/src/App.tsx`
Add: `<Route path="/profil" element={<Profil />} />`

---

## Animation Spec (Emil design eng pattern)
- Form container: `initial={{ opacity: 0, y: 24 }}` → `animate={{ opacity: 1, y: 0 }}` duration 0.5s
- Each field: staggered `delay: index * 0.08s`
- Button: `whileHover={{ scale: 1.02, y: -1 }}` `whileTap={{ scale: 0.98 }}`
- Cover left column: subtle `mousemove` parallax — track cursor position, translate cover content ±8px
- All via `motion` package (already installed)

---

## Data Flow

```
[Google GIS SDK] → credential token
       ↓
[Frontend] POST /api/customers/google
       ↓
[Backend] verify via tokeninfo API
       ↓
find/create Customer in MongoDB
       ↓ (new user only)
sendWelcomeEmail via Resend
       ↓
return { token, customer }
       ↓
[Frontend] localStorage.setItem → navigate
```

---

## Error Handling
- Google token invalid → 401 "Token Google tidak valid"
- Email sudah ada (register) → 400 "Email sudah terdaftar"
- Resend failure → log error, do NOT block registration (fire-and-forget)
- Network error → user-facing toast/inline error

---

## Out of Scope
- Full profile edit page
- Password reset / forgot password
- Email change
- Account deletion
- Admin user management for customers
