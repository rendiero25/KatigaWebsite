# Admin Edit Review Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let admin edit a review's comment text and remove individual photos from the admin reviews list, for content moderation.

**Architecture:** One new admin-auth-protected `PATCH /api/admin/reviews/:id` endpoint that updates `comment`/`photos` on the `Review` document; a new `api.updateAdminReview()` method; an inline edit form in `admin/Reviews.tsx` that replaces the existing read-only expanded row when "Edit" is clicked.

**Tech Stack:** Express + Mongoose (backend), React + TypeScript + Tailwind (frontend). This project has no automated test suite (per `CLAUDE.md`) — verification is done via one-off Node scripts against the real dev DB/server and manual browser checks, not `pytest`/`jest`-style tests.

---

### Task 1: Backend — `PATCH /api/admin/reviews/:id`

**Files:**
- Modify: `routes/adminReviewRoutes.js:94` (insert the new route between the existing `PATCH /:id/visibility` and `DELETE /:id` routes)

- [ ] **Step 1: Add the route**

In `routes/adminReviewRoutes.js`, insert this new route immediately after the closing `});` of the `PATCH /:id/visibility` handler (i.e. right before the `// DELETE /api/admin/reviews/:id` comment on line 96):

```js
// PATCH /api/admin/reviews/:id — edit comment/photos (moderation; rating is never editable)
router.patch('/:id', auth, async (req, res) => {
  try {
    const { comment, photos } = req.body;
    const review = await Review.findById(req.params.id);
    if (!review) return res.status(404).json({ message: 'Review tidak ditemukan' });

    if (comment !== undefined) review.comment = String(comment).trim().slice(0, 1000);
    if (photos !== undefined) {
      if (!Array.isArray(photos) || !photos.every((p) => typeof p === 'string')) {
        return res.status(400).json({ message: 'photos harus berupa array string' });
      }
      review.photos = photos;
    }

    await review.save();
    res.json(review);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

```

- [ ] **Step 2: Verify against the running dev backend**

The backend (`nodemon server.js`) auto-restarts on save. Confirm it's up:

Run: `curl -s -o /dev/null -w "%{http_code}\n" http://localhost:8000/api/products`
Expected: `200`

Then run this one-off script to mint an admin token, pick any existing review, PATCH it, and confirm the change persisted:

```bash
cd "G:/WebsiteDevelopment/KatigaWebsite" && node -e "
require('dotenv').config();
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const Admin = require('./models/Admin');
  const Review = require('./models/Review');
  const admin = await Admin.findOne();
  const token = jwt.sign({ id: admin._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
  const review = await Review.findOne();
  console.log('testing against review:', review._id.toString(), 'original comment:', JSON.stringify(review.comment));

  const res = await fetch('http://localhost:8000/api/admin/reviews/' + review._id, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
    body: JSON.stringify({ comment: 'VERIFY_TEST_COMMENT', photos: [] }),
  });
  console.log('status:', res.status);
  console.log('body:', JSON.stringify(await res.json()));

  const reloaded = await Review.findById(review._id);
  console.log('comment in DB after patch:', JSON.stringify(reloaded.comment));

  // revert so this test doesn't leave permanent data changes
  reloaded.comment = review.comment;
  reloaded.photos = review.photos;
  await reloaded.save();
  console.log('reverted to original');
  process.exit(0);
}).catch(e => { console.error(e); process.exit(1); });
"
```

Expected: `status: 200`, `comment in DB after patch: "VERIFY_TEST_COMMENT"`, then `reverted to original`.

- [ ] **Step 3: Commit**

```bash
git add routes/adminReviewRoutes.js
git commit -m "feat: add admin endpoint to edit review comment/photos"
```

---

### Task 2: Frontend — `api.updateAdminReview()`

**Files:**
- Modify: `client/src/services/api.ts:748` (insert right after `submitReview`, before the `// Promotions` section comment)

- [ ] **Step 1: Add the method**

```ts
  // Reviews — admin
  updateAdminReview: async (id: string, data: { comment: string; photos: string[] }): Promise<{ comment: string; photos: string[] }> => {
    const token = localStorage.getItem('adminToken');
    const res = await fetch(`${API_BASE_URL}/admin/reviews/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error((err as { message?: string }).message || 'Gagal menyimpan perubahan ulasan');
    }
    return res.json();
  },

```

- [ ] **Step 2: Verify it compiles**

Run: `cd "G:/WebsiteDevelopment/KatigaWebsite/client" && npx tsc -b`
Expected: no output, exit code 0 (no type errors)

- [ ] **Step 3: Commit**

```bash
git add client/src/services/api.ts
git commit -m "feat: add updateAdminReview API method"
```

---

### Task 3: Frontend — Edit UI in `admin/Reviews.tsx`

**Files:**
- Modify: `client/src/pages/admin/Reviews.tsx`

- [ ] **Step 1: Update imports**

Replace the top import block:

```tsx
import React, { useState, useEffect, useCallback } from 'react';
import AdminLayout from '../../components/AdminLayout';
import { API_BASE_URL } from '../../services/api';
import StarRating from '../../components/StarRating';
import { Button } from '@/components/ui/button';
```

with:

```tsx
import React, { useState, useEffect, useCallback } from 'react';
import { X } from 'lucide-react';
import AdminLayout from '../../components/AdminLayout';
import api, { API_BASE_URL } from '../../services/api';
import StarRating from '../../components/StarRating';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
```

- [ ] **Step 2: Add edit state**

In the `AdminReviews` component, right after the existing `const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);` line, add:

```tsx
  const [editingId, setEditingId]     = useState<string | null>(null);
  const [editComment, setEditComment] = useState('');
  const [editPhotos, setEditPhotos]   = useState<string[]>([]);
  const [savingEdit, setSavingEdit]   = useState(false);
```

- [ ] **Step 3: Add edit handlers**

Right after the existing `deleteReview` function (after its closing `};`), add:

```tsx
  const startEdit = (review: AdminReview) => {
    setEditingId(review._id);
    setEditComment(review.comment);
    setEditPhotos(review.photos);
    setExpandedId(review._id);
  };

  const cancelEdit = () => setEditingId(null);

  const saveEdit = async (id: string) => {
    setSavingEdit(true);
    try {
      const data = await api.updateAdminReview(id, { comment: editComment.trim(), photos: editPhotos });
      setReviews((prev) =>
        prev.map((r) => (r._id === id ? { ...r, comment: data.comment, photos: data.photos } : r))
      );
      setEditingId(null);
    } finally {
      setSavingEdit(false);
    }
  };
```

- [ ] **Step 4: Add the "Edit" button**

In the Aksi `<td>`, the button group currently reads:

```tsx
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="xs"
                              onClick={() => toggleVisibility(review._id)}
                              className={review.isVisible ? '' : 'border-green-200 text-green-700 hover:bg-green-50'}
                            >
                              {review.isVisible ? 'Hide' : 'Show'}
                            </Button>
                            <Button
                              variant="destructive"
                              size="xs"
                              onClick={() => deleteReview(review._id)}
                            >
                              Hapus
                            </Button>
                          </div>
```

Add an "Edit" button before the "Hide/Show" button:

```tsx
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="xs"
                              onClick={() => startEdit(review)}
                            >
                              Edit
                            </Button>
                            <Button
                              variant="outline"
                              size="xs"
                              onClick={() => toggleVisibility(review._id)}
                              className={review.isVisible ? '' : 'border-green-200 text-green-700 hover:bg-green-50'}
                            >
                              {review.isVisible ? 'Hide' : 'Show'}
                            </Button>
                            <Button
                              variant="destructive"
                              size="xs"
                              onClick={() => deleteReview(review._id)}
                            >
                              Hapus
                            </Button>
                          </div>
```

- [ ] **Step 5: Make the expanded row show the edit form when editing**

The expanded row currently reads:

```tsx
                      {/* Expanded row */}
                      {expandedId === review._id && (
                        <tr className="bg-gray-50">
                          <td colSpan={8} className="px-6 py-4">
                            {review.comment && (
                              <p className="text-sm text-gray-700 mb-3 whitespace-pre-line">{review.comment}</p>
                            )}
                            {review.photos.length > 0 && (
                              <div className="flex flex-wrap gap-2">
                                {review.photos.map((photo, i) => (
                                  <button
                                    key={i}
                                    type="button"
                                    onClick={() => setLightboxSrc(photo)}
                                    className="w-20 h-20 rounded-lg overflow-hidden border border-gray-200 hover:opacity-80 transition cursor-zoom-in"
                                  >
                                    <img src={photo} alt="" className="w-full h-full object-cover" />
                                  </button>
                                ))}
                              </div>
                            )}
                            {!review.comment && review.photos.length === 0 && (
                              <p className="text-sm text-gray-400">Tidak ada komentar atau foto.</p>
                            )}
                          </td>
                        </tr>
                      )}
```

Replace it with:

```tsx
                      {/* Expanded row */}
                      {expandedId === review._id && (
                        <tr className="bg-gray-50">
                          <td colSpan={8} className="px-6 py-4">
                            {editingId === review._id ? (
                              <div className="space-y-3" onClick={(e) => e.stopPropagation()}>
                                <div>
                                  <label className="block text-xs font-medium text-gray-500 mb-1">Komentar</label>
                                  <Textarea
                                    value={editComment}
                                    onChange={(e) => setEditComment(e.target.value)}
                                    maxLength={1000}
                                    className="resize-none h-24 text-sm bg-white"
                                  />
                                  <p className="text-[11px] text-gray-400 text-right mt-1">{editComment.length}/1000</p>
                                </div>
                                {editPhotos.length > 0 && (
                                  <div>
                                    <label className="block text-xs font-medium text-gray-500 mb-1">Foto</label>
                                    <div className="flex flex-wrap gap-2">
                                      {editPhotos.map((photo, i) => (
                                        <div key={i} className="relative w-20 h-20">
                                          <img src={photo} alt="" className="w-full h-full object-cover rounded-lg border border-gray-200" />
                                          <button
                                            type="button"
                                            onClick={() => setEditPhotos((prev) => prev.filter((_, idx) => idx !== i))}
                                            className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-gray-800 text-white rounded-full flex items-center justify-center hover:bg-red-500 transition"
                                          >
                                            <X className="size-3" />
                                          </button>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                                <div className="flex gap-2 pt-1">
                                  <Button variant="outline" size="sm" onClick={cancelEdit} disabled={savingEdit}>
                                    Batal
                                  </Button>
                                  <Button size="sm" onClick={() => saveEdit(review._id)} disabled={savingEdit}>
                                    {savingEdit ? 'Menyimpan...' : 'Simpan'}
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <>
                                {review.comment && (
                                  <p className="text-sm text-gray-700 mb-3 whitespace-pre-line">{review.comment}</p>
                                )}
                                {review.photos.length > 0 && (
                                  <div className="flex flex-wrap gap-2">
                                    {review.photos.map((photo, i) => (
                                      <button
                                        key={i}
                                        type="button"
                                        onClick={() => setLightboxSrc(photo)}
                                        className="w-20 h-20 rounded-lg overflow-hidden border border-gray-200 hover:opacity-80 transition cursor-zoom-in"
                                      >
                                        <img src={photo} alt="" className="w-full h-full object-cover" />
                                      </button>
                                    ))}
                                  </div>
                                )}
                                {!review.comment && review.photos.length === 0 && (
                                  <p className="text-sm text-gray-400">Tidak ada komentar atau foto.</p>
                                )}
                              </>
                            )}
                          </td>
                        </tr>
                      )}
```

(The `onClick={(e) => e.stopPropagation()}` on the edit form wrapper prevents a click inside the textarea/buttons from bubbling up to the `<tr onClick>` on the row above it, which would otherwise collapse the row while editing.)

- [ ] **Step 6: Verify it compiles and lints**

Run: `cd "G:/WebsiteDevelopment/KatigaWebsite/client" && npx tsc -b && npm run lint`
Expected: both exit 0 with no errors

- [ ] **Step 7: Verify in the browser**

1. Ensure both dev servers are running (`Backend (Express)` on port 8000, `Frontend (Vite)` on port 5180 via the preview tools).
2. Mint an admin token and open the page with it pre-set, e.g.:

```bash
cd "G:/WebsiteDevelopment/KatigaWebsite" && node -e "
require('dotenv').config();
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const Admin = require('./models/Admin');
  const admin = await Admin.findOne();
  const token = jwt.sign({ id: admin._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
  console.log(token);
  process.exit(0);
}).catch(e => { console.error(e); process.exit(1); });
"
```

3. In the browser (via `preview_eval`), set `localStorage.setItem('adminToken', '<token>')` and navigate to `http://localhost:5180/admin/reviews`.
4. Find a row with both a comment and at least one photo. Click **Edit**.
5. Confirm the row expands into the edit form: textarea prefilled with the existing comment, photo thumbnails with a small ✕, Batal/Simpan buttons.
6. Change the comment text, remove one photo by clicking its ✕, click **Simpan**.
7. Confirm: the row collapses back to read-only view showing the new comment and one fewer photo, with no console errors (`preview_console_logs`).
8. Reload the page and re-expand the same row — confirm the edit persisted (comment and photo count match what was saved), proving it round-tripped through the backend, not just local state.
9. Click **Edit** again, change the comment, then click **Batal** — confirm the row reverts to showing the pre-edit comment (change was discarded, not saved).

- [ ] **Step 8: Commit**

```bash
git add client/src/pages/admin/Reviews.tsx
git commit -m "feat: let admin edit review comment and remove photos"
```
