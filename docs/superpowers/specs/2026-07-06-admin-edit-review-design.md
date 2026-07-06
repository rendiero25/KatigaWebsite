# Admin Edit Review — Design Spec

**Date:** 2026-07-06
**Status:** Approved

## Summary

Let admin moderate a customer review's **comment text** and **remove individual photos** from the admin reviews list — a lightweight tool for cleaning up inappropriate words/images without touching the customer's actual star rating. No new photo uploads, no public "edited by admin" indicator (edits are silent, matching how the existing Hide/Show visibility toggle already works without notifying the customer).

---

## Current State

- `client/src/pages/admin/Reviews.tsx` renders reviews as a table. Clicking a row expands it (`expandedId` state) to show the full comment and photo thumbnails, read-only.
- The Aksi column has two actions per row: **Hide/Show** (`PATCH /api/admin/reviews/:id/visibility`) and **Hapus** (`DELETE /api/admin/reviews/:id`) — both called via raw `fetch()` directly in the component (pre-existing pattern in this file; not something this change needs to fix).
- `routes/adminReviewRoutes.js` has no endpoint for editing review content — only list, visibility toggle, and delete.
- `models/Review.js` has no fields to track an edit (and per this design, none are added).
- The customer-facing `ReviewForm.tsx` already has the exact removable-photo-thumbnail pattern (image + small ✕ button) this design reuses visually.

---

## Backend

### New endpoint: `PATCH /api/admin/reviews/:id` (auth-protected)

1. Load review by id; 404 if not found.
2. Accept `{ comment, photos }` in the body:
   - `comment` — trimmed, capped at 1000 chars (matches the schema's `maxlength`).
   - `photos` — replaces `review.photos` wholesale with the array sent. The client only ever sends a subset of the review's existing photo URLs (removals), never a new URL — no upload handling needed on this route.
3. Save and return the updated review document.
4. No `recalc()` call — rating and visibility are untouched, so the product's aggregate stats don't change.

---

## Admin — `client/src/pages/admin/Reviews.tsx`

### "Edit" button

- Added to the Aksi column, alongside Hide/Show and Hapus.
- On click: sets `editingId` to the review's id and ensures the row is expanded (`setExpandedId` to the same id), replacing the read-only expanded content with an edit form. Only one row can be in edit mode at a time.

### Edit form (replaces the read-only expanded content for that row)

- **Comment**: a `Textarea`, prefilled with the current comment, 1000-char cap with a `{length}/1000` counter — same style as `ReviewForm.tsx`'s comment field.
- **Photos**: existing photos rendered as thumbnails, each with a small ✕ overlay button to remove it from local edit state (no "add photo" control). Removed photos disappear from the grid immediately; nothing is deleted server-side until Save.
- **Simpan** / **Batal** buttons:
  - Batal: discards local edit state, exits edit mode, returns to the normal read-only expanded row.
  - Simpan: calls `api.updateAdminReview(id, { comment, photos })`, updates that review in the `reviews` list state with the response, exits edit mode.

### No changes to

- Hide/Show and Hapus actions.
- The expand/collapse-on-row-click behavior for rows not being edited.
- Filters, pagination, lightbox.

---

## API additions

| Layer | Addition |
|---|---|
| `api.ts` | `updateAdminReview(id, data: { comment: string; photos: string[] }): Promise<{ comment: string; photos: string[] }>` → `PATCH /admin/reviews/:id`, throws on non-ok response with server message. Narrower than `AdminReview` deliberately: the backend returns the raw (unpopulated) `Review` document, where `customer`/`product` are plain ObjectId strings, not the aggregated `customerDoc`/`productDoc` shape `AdminReview` expects — so the return type is limited to the two fields the endpoint actually needs to hand back accurately. |

`Reviews.tsx`'s existing actions call `fetch()` directly rather than going through `api.ts`; this new action follows the project's documented convention (`api.ts` as the single source of truth for API calls) instead of copying that pre-existing shortcut, since it's a new call being added fresh.

---

## Out of Scope

- Editing rating.
- Uploading new/replacement photos.
- Any public-facing "edited by admin" indicator or audit trail.
- Refactoring the existing Hide/Show/Hapus actions to go through `api.ts`.
