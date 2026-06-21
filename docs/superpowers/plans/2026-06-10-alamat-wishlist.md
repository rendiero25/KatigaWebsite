# Alamat & Wishlist Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Activate the Alamat (`/profil/alamat`) and Wishlist (`/profil/wishlist`) nav items in the user dashboard, including a heart toggle on product pages.

**Architecture:** Alamat reuses the existing `PUT /api/customers/me` endpoint with no backend changes. Wishlist adds a `wishlist` array field to the Customer model, three new endpoints in `customerAuthRoutes.js`, new API methods and a `useWishlist` hook, a reusable `WishlistButton` component used by Products/ProductDetail pages, and a dedicated wishlist page. Both routes are added to `App.tsx` and `UserLayout.tsx` is updated to activate the nav items.

**Tech Stack:** Node.js/Express/Mongoose (backend), React 18 + TypeScript + Vite, Tailwind CSS, lucide-react icons, react-router-dom v6.

---

## File Map

| File | Action |
|---|---|
| `models/Customer.js` | Add `wishlist` field |
| `routes/customerAuthRoutes.js` | Add 3 wishlist endpoints |
| `client/src/types/ecommerce.ts` | Add `WishlistProduct` interface |
| `client/src/services/api.ts` | Add `getWishlist`, `addToWishlist`, `removeFromWishlist` |
| `client/src/hooks/useApi.ts` | Add `useWishlist` hook |
| `client/src/components/WishlistButton.tsx` | New — heart toggle button |
| `client/src/pages/Products.tsx` | Add wishlist hook + WishlistButton on each card |
| `client/src/pages/ProductDetail.tsx` | Add WishlistButton on main image |
| `client/src/pages/AlamatSaya.tsx` | New — address edit page |
| `client/src/pages/WishlistSaya.tsx` | New — wishlist list page |
| `client/src/components/UserLayout.tsx` | Activate Alamat + Wishlist nav, remove NAV_SOON |
| `client/src/App.tsx` | Add 2 new routes |

---

### Task 1: Backend — wishlist field + endpoints

No test suite in this project. Verify manually by running `npm run dev` and calling the endpoints.

**Files:**
- Modify: `models/Customer.js`
- Modify: `routes/customerAuthRoutes.js`

- [ ] **Step 1: Add `wishlist` field to Customer model**

Open `models/Customer.js`. After the `defaultAddress` block (line 20, before `}, { timestamps: true }`), add:

```js
  wishlist: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }]
```

The full schema ending becomes:
```js
  defaultAddress: {
    recipientName: { type: String, default: '' },
    phone:         { type: String, default: '' },
    street:        { type: String, default: '' },
    city:          { type: String, default: '' },
    province:      { type: String, default: '' },
    postalCode:    { type: String, default: '' },
    areaId:        { type: String, default: '' },
    areaName:      { type: String, default: '' },
  },
  wishlist: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }]
}, { timestamps: true });
```

- [ ] **Step 2: Add wishlist endpoints to `routes/customerAuthRoutes.js`**

Append these three routes before `module.exports = router;` (currently line 111):

```js
// GET /api/customers/wishlist
router.get('/wishlist', customerAuth, async (req, res) => {
  try {
    const customer = await Customer.findById(req.customer._id)
      .populate('wishlist', '_id name image images priceNumeric');
    const wishlist = (customer.wishlist || []).filter(Boolean);
    res.json({ wishlist });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/customers/wishlist/:productId
router.post('/wishlist/:productId', customerAuth, async (req, res) => {
  try {
    const { productId } = req.params;
    const customer = await Customer.findById(req.customer._id);
    const alreadyIn = customer.wishlist.some(id => id.toString() === productId);
    if (!alreadyIn) {
      customer.wishlist.push(productId);
      await customer.save();
    }
    res.json({ message: 'OK' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /api/customers/wishlist/:productId
router.delete('/wishlist/:productId', customerAuth, async (req, res) => {
  try {
    const { productId } = req.params;
    const customer = await Customer.findById(req.customer._id);
    customer.wishlist = customer.wishlist.filter(id => id.toString() !== productId);
    await customer.save();
    res.json({ message: 'OK' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});
```

- [ ] **Step 3: Manual verification**

Start dev server: `npm run dev`

Test with curl (replace TOKEN with a real customer JWT from localStorage after logging in):
```bash
# Should return { wishlist: [] }
curl -H "Authorization: Bearer TOKEN" http://localhost:8000/api/customers/wishlist

# Should return { message: 'OK' }
curl -X POST -H "Authorization: Bearer TOKEN" http://localhost:8000/api/customers/wishlist/SOME_PRODUCT_ID

# Should return { wishlist: [{ _id, name, image, images, priceNumeric }] }
curl -H "Authorization: Bearer TOKEN" http://localhost:8000/api/customers/wishlist
```

- [ ] **Step 4: Commit**

```bash
git add models/Customer.js routes/customerAuthRoutes.js
git commit -m "feat: add wishlist field and endpoints to customer routes"
```

---

### Task 2: Frontend types + API methods + hook

**Files:**
- Modify: `client/src/types/ecommerce.ts`
- Modify: `client/src/services/api.ts`
- Modify: `client/src/hooks/useApi.ts`

- [ ] **Step 1: Add `WishlistProduct` interface to `client/src/types/ecommerce.ts`**

Append at the end of the file (after line 113):

```ts
export interface WishlistProduct {
  _id: string
  name: string
  image: string
  images: string[]
  priceNumeric: number
}
```

- [ ] **Step 2: Add wishlist methods to `client/src/services/api.ts`**

After `updateCustomerProfile` (after line 210, before the `// Shipping` comment), add:

```ts
  getWishlist: async (): Promise<{ wishlist: import('./types/ecommerce').WishlistProduct[] }> => {
    const token = localStorage.getItem('customerToken');
    const res = await fetch(`${API_BASE_URL}/customers/wishlist`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Failed to fetch wishlist');
    return res.json();
  },

  addToWishlist: async (productId: string): Promise<void> => {
    const token = localStorage.getItem('customerToken');
    const res = await fetch(`${API_BASE_URL}/customers/wishlist/${productId}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Failed to add to wishlist');
  },

  removeFromWishlist: async (productId: string): Promise<void> => {
    const token = localStorage.getItem('customerToken');
    const res = await fetch(`${API_BASE_URL}/customers/wishlist/${productId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Failed to remove from wishlist');
  },
```

**Note on import path:** The `getWishlist` return type uses an inline import. To keep it clean, add an import at the top of `api.ts` for the type instead:

Actually api.ts does not have imports at the top. Use `unknown` cast and rely on the return type annotation. Better: import the interface at the top.

Add at the very top of `api.ts` (line 1, before the existing comment):
```ts
import type { WishlistProduct } from './types/ecommerce';
```

Wait — `api.ts` is at `client/src/services/api.ts` and `ecommerce.ts` is at `client/src/types/ecommerce.ts`. The relative path from `services/` to `types/` is `../types/ecommerce`. Fix:

Add at the very top of `api.ts`:
```ts
import type { WishlistProduct } from '../types/ecommerce';
```

Then the return type becomes:
```ts
  getWishlist: async (): Promise<{ wishlist: WishlistProduct[] }> => {
```

- [ ] **Step 3: Add `useWishlist` hook to `client/src/hooks/useApi.ts`**

Add at the top of `useApi.ts` (after line 1 `import { useState, useEffect } from 'react';`):
```ts
import { useState, useEffect, useCallback } from 'react';
```
(Replace the existing import line.)

Add the `WishlistProduct` import after the existing api import:
```ts
import type { WishlistProduct } from '../types/ecommerce';
```

Append this hook at the end of `useApi.ts`:

```ts
export function useWishlist() {
  const [wishlist, setWishlist] = useState<WishlistProduct[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!localStorage.getItem('customerToken')) return
    setLoading(true)
    api.getWishlist()
      .then(d => setWishlist(d.wishlist ?? []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const wishlistIds = new Set(wishlist.map(p => p._id))

  const add = useCallback(async (productId: string) => {
    setWishlist(prev =>
      prev.some(p => p._id === productId)
        ? prev
        : [...prev, { _id: productId, name: '', image: '', images: [], priceNumeric: 0 }]
    )
    await api.addToWishlist(productId).catch(() => {
      setWishlist(prev => prev.filter(p => !(p._id === productId && p.name === '')))
    })
  }, [])

  const remove = useCallback(async (productId: string) => {
    setWishlist(prev => prev.filter(p => p._id !== productId))
    await api.removeFromWishlist(productId).catch(() => {})
  }, [])

  return { wishlist, wishlistIds, loading, add, remove }
}
```

- [ ] **Step 4: Type-check**

```bash
cd client && npx tsc --noEmit
```

Expected: no errors. If errors appear, fix them before proceeding.

- [ ] **Step 5: Commit**

```bash
git add client/src/types/ecommerce.ts client/src/services/api.ts client/src/hooks/useApi.ts
git commit -m "feat: add wishlist API methods and useWishlist hook"
```

---

### Task 3: WishlistButton component

**Files:**
- Create: `client/src/components/WishlistButton.tsx`

- [ ] **Step 1: Create `client/src/components/WishlistButton.tsx`**

```tsx
import { Heart } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

interface Props {
  productId: string
  inWishlist: boolean
  onToggle: (productId: string, inWishlist: boolean) => void
  size?: 'sm' | 'md'
}

export default function WishlistButton({ productId, inWishlist, onToggle, size = 'sm' }: Props) {
  const navigate = useNavigate()
  const iconSize = size === 'sm' ? 14 : 16

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!localStorage.getItem('customerToken')) {
      navigate('/masuk')
      return
    }
    onToggle(productId, inWishlist)
  }

  return (
    <button
      onClick={handleClick}
      aria-label={inWishlist ? 'Hapus dari wishlist' : 'Tambah ke wishlist'}
      className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full bg-white/80 backdrop-blur-sm flex items-center justify-center shadow-sm transition hover:bg-white cursor-pointer"
    >
      <Heart
        size={iconSize}
        className={inWishlist ? 'fill-red-500 text-red-500' : 'text-gray-400 hover:text-red-400'}
      />
    </button>
  )
}
```

- [ ] **Step 2: Type-check**

```bash
cd client && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add client/src/components/WishlistButton.tsx
git commit -m "feat: add WishlistButton component"
```

---

### Task 4: Heart button on Products page

**Files:**
- Modify: `client/src/pages/Products.tsx`

- [ ] **Step 1: Add imports to `Products.tsx`**

After `import { useProducts, useCategories } from "../hooks/useApi";` (line 6), add:
```ts
import { useWishlist } from "../hooks/useApi";
import WishlistButton from "../components/WishlistButton";
```

- [ ] **Step 2: Call `useWishlist` inside the component**

In the `Products` component body, after the existing `const [currentPage, setCurrentPage] = useState(1);` line (~line 33), add:

```ts
  const { wishlistIds, add, remove } = useWishlist()

  const handleToggleWishlist = async (productId: string, currentlyInWishlist: boolean) => {
    if (currentlyInWishlist) {
      await remove(productId)
    } else {
      await add(productId)
    }
  }
```

- [ ] **Step 3: Add `WishlistButton` to product card**

Find the product card image container (around line 234):
```tsx
<div className="relative aspect-square rounded-2xl overflow-hidden bg-gray-100 mb-4">
  <img
    src={api.getImageUrl(product.image)}
    alt={product.name}
    className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
  />
</div>
```

Replace with:
```tsx
<div className="relative aspect-square rounded-2xl overflow-hidden bg-gray-100 mb-4">
  <img
    src={api.getImageUrl(product.image)}
    alt={product.name}
    className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
  />
  <WishlistButton
    productId={product._id}
    inWishlist={wishlistIds.has(product._id)}
    onToggle={handleToggleWishlist}
  />
</div>
```

- [ ] **Step 4: Type-check and lint**

```bash
cd client && npx tsc --noEmit && npm run lint
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add client/src/pages/Products.tsx
git commit -m "feat: add wishlist heart button to product cards"
```

---

### Task 5: Heart button on ProductDetail page

**Files:**
- Modify: `client/src/pages/ProductDetail.tsx`

- [ ] **Step 1: Add imports to `ProductDetail.tsx`**

Find the existing imports block. Add after any existing `useApi` import (or the api import):
```ts
import { useWishlist } from "../hooks/useApi";
import WishlistButton from "../components/WishlistButton";
```

- [ ] **Step 2: Call `useWishlist` inside the component**

In the `ProductDetail` component body (after existing state declarations near the top), add:

```ts
  const { wishlistIds, add, remove } = useWishlist()

  const handleToggleWishlist = async (productId: string, currentlyInWishlist: boolean) => {
    if (currentlyInWishlist) {
      await remove(productId)
    } else {
      await add(productId)
    }
  }
```

- [ ] **Step 3: Add `WishlistButton` to the main product image**

Find the main image container (line ~159):
```tsx
<div className="bg-gray-50 rounded-2xl overflow-hidden relative aspect-square">
  <img
    ...
  />
  <span className="absolute top-4 left-4 ...">
```

Add `WishlistButton` after the `<img>` element (before the `<span>`):
```tsx
<div className="bg-gray-50 rounded-2xl overflow-hidden relative aspect-square">
  <img
    src={...}
    alt={...}
    className="..."
  />
  {product && (
    <WishlistButton
      productId={product._id}
      inWishlist={wishlistIds.has(product._id)}
      onToggle={handleToggleWishlist}
      size="md"
    />
  )}
  <span className="absolute top-4 left-4 ...">
```

- [ ] **Step 4: Type-check and lint**

```bash
cd client && npx tsc --noEmit && npm run lint
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add client/src/pages/ProductDetail.tsx
git commit -m "feat: add wishlist heart button to product detail page"
```

---

### Task 6: Alamat page

**Files:**
- Create: `client/src/pages/AlamatSaya.tsx`

- [ ] **Step 1: Create `client/src/pages/AlamatSaya.tsx`**

```tsx
import { useEffect, useState } from 'react'
import { MapPin, Save, CheckCircle } from 'lucide-react'
import type { CustomerProfile } from '../types/ecommerce'
import api from '../services/api'
import UserLayout from '../components/UserLayout'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'

interface AddressForm {
  recipientName: string
  phone: string
  street: string
  city: string
  province: string
  postalCode: string
}

export default function AlamatSaya() {
  const [customer, setCustomer] = useState<CustomerProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState<AddressForm>({
    recipientName: '',
    phone: '',
    street: '',
    city: '',
    province: '',
    postalCode: '',
  })
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    ;(api.getCustomerProfile() as Promise<CustomerProfile & { message?: string }>)
      .then((data) => {
        if (data._id) {
          setCustomer(data)
          const addr = data.defaultAddress
          if (addr) {
            setForm({
              recipientName: addr.recipientName || '',
              phone: addr.phone || '',
              street: addr.street || '',
              city: addr.city || '',
              province: addr.province || '',
              postalCode: addr.postalCode || '',
            })
          }
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setMsg(null)
    try {
      const fullAddress = {
        ...customer?.defaultAddress,
        recipientName: form.recipientName.trim(),
        phone: form.phone.trim(),
        street: form.street.trim(),
        city: form.city.trim(),
        province: form.province.trim(),
        postalCode: form.postalCode.trim(),
      }
      const updated = await (api.updateCustomerProfile({ defaultAddress: fullAddress }) as Promise<CustomerProfile & { message?: string }>)
      if (updated._id) {
        setCustomer(updated)
        setMsg({ type: 'success', text: 'Alamat berhasil disimpan' })
      } else {
        setMsg({ type: 'error', text: updated.message || 'Gagal menyimpan alamat' })
      }
    } catch {
      setMsg({ type: 'error', text: 'Terjadi kesalahan, coba lagi' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <UserLayout title="Alamat">
      <div className="w-full max-w-2xl space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <MapPin className="size-5 text-primary" />
              Alamat Pengiriman Default
            </CardTitle>
            <CardDescription>
              Alamat ini digunakan sebagai alamat pengiriman default saat checkout.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-24 w-full" />
                <div className="grid grid-cols-2 gap-4">
                  <Skeleton className="h-10" />
                  <Skeleton className="h-10" />
                </div>
              </div>
            ) : (
              <form onSubmit={handleSave} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="recipientName">Nama Penerima</Label>
                  <Input
                    id="recipientName"
                    name="recipientName"
                    value={form.recipientName}
                    onChange={handleChange}
                    placeholder="Nama lengkap penerima"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">No. Telepon Penerima</Label>
                  <Input
                    id="phone"
                    name="phone"
                    type="tel"
                    value={form.phone}
                    onChange={handleChange}
                    placeholder="08xxxxxxxxxx"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="street">Jalan / Alamat Lengkap</Label>
                  <Textarea
                    id="street"
                    name="street"
                    value={form.street}
                    onChange={handleChange}
                    placeholder="Nama jalan, nomor rumah, RT/RW, kelurahan, kecamatan"
                    rows={3}
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="city">Kota / Kabupaten</Label>
                    <Input
                      id="city"
                      name="city"
                      value={form.city}
                      onChange={handleChange}
                      placeholder="Jakarta Selatan"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="province">Provinsi</Label>
                    <Input
                      id="province"
                      name="province"
                      value={form.province}
                      onChange={handleChange}
                      placeholder="DKI Jakarta"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2 max-w-[200px]">
                  <Label htmlFor="postalCode">Kode Pos</Label>
                  <Input
                    id="postalCode"
                    name="postalCode"
                    value={form.postalCode}
                    onChange={handleChange}
                    placeholder="12345"
                    maxLength={10}
                  />
                </div>

                {msg && (
                  <div className={`flex items-center gap-2 text-sm ${msg.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
                    {msg.type === 'success' && <CheckCircle className="size-4" />}
                    {msg.text}
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={saving}
                  className="bg-gradient-to-br from-[#4F68AF] to-[#2B3A67] text-white hover:opacity-90"
                >
                  <Save className="size-4 mr-2" />
                  {saving ? 'Menyimpan...' : 'Simpan Alamat'}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </UserLayout>
  )
}
```

- [ ] **Step 2: Check that `Textarea` exists in UI components**

```bash
ls client/src/components/ui/textarea.tsx 2>/dev/null || echo "MISSING"
```

If output is `MISSING`, run:
```bash
cd client && npx shadcn@latest add textarea
```

- [ ] **Step 3: Type-check**

```bash
cd client && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add client/src/pages/AlamatSaya.tsx
git commit -m "feat: add alamat page for default shipping address"
```

---

### Task 7: Wishlist page

**Files:**
- Create: `client/src/pages/WishlistSaya.tsx`

- [ ] **Step 1: Create `client/src/pages/WishlistSaya.tsx`**

```tsx
import { Heart } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useWishlist } from '../hooks/useApi'
import api from '../services/api'
import UserLayout from '../components/UserLayout'
import WishlistButton from '../components/WishlistButton'

export default function WishlistSaya() {
  const { wishlist, wishlistIds, loading, remove } = useWishlist()

  const handleToggle = async (productId: string, currentlyInWishlist: boolean) => {
    if (currentlyInWishlist) {
      await remove(productId)
    }
  }

  return (
    <UserLayout title="Wishlist">
      <div className="w-full space-y-6">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Wishlist Saya</h2>
          <p className="text-sm text-gray-500 mt-1">
            {loading ? '...' : `${wishlist.length} produk tersimpan`}
          </p>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="bg-gray-200 aspect-square rounded-2xl mb-3" />
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
                <div className="h-3 bg-gray-200 rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : wishlist.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Heart className="size-12 text-gray-300 mb-4" />
            <p className="text-gray-500 font-medium">Belum ada produk di wishlist</p>
            <p className="text-gray-400 text-sm mt-1">Mulai jelajahi produk kami</p>
            <Link
              to="/produk"
              className="mt-6 inline-flex items-center px-6 py-2.5 bg-gradient-to-br from-[#4F68AF] to-[#2B3A67] text-white text-sm font-medium rounded-full hover:opacity-90 transition"
            >
              Lihat Produk
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
            {wishlist.map((product) => (
              <div key={product._id} className="group">
                <Link to={`/produk/${product._id}`} className="block">
                  <div className="relative aspect-square rounded-2xl overflow-hidden bg-gray-100 mb-3">
                    <img
                      src={api.getImageUrl(
                        (product.images && product.images.length > 0)
                          ? product.images[0]
                          : product.image
                      )}
                      alt={product.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                    />
                    <WishlistButton
                      productId={product._id}
                      inWishlist={wishlistIds.has(product._id)}
                      onToggle={handleToggle}
                    />
                  </div>
                  <h3 className="text-sm font-semibold text-gray-900 leading-tight line-clamp-2">
                    {product.name}
                  </h3>
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </UserLayout>
  )
}
```

- [ ] **Step 2: Type-check**

```bash
cd client && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add client/src/pages/WishlistSaya.tsx
git commit -m "feat: add wishlist page"
```

---

### Task 8: Wire up routes and nav

**Files:**
- Modify: `client/src/components/UserLayout.tsx`
- Modify: `client/src/App.tsx`

- [ ] **Step 1: Update `UserLayout.tsx`**

Replace the current `NAV_MAIN` and `NAV_SOON` declarations (lines 29–38):

```ts
const NAV_MAIN = [
  { label: 'Beranda', icon: LayoutDashboard, href: '/profil' },
  { label: 'Pesanan Saya', icon: Package, href: '/pesanan' },
  { label: 'Alamat', icon: MapPin, href: '/profil/alamat' },
  { label: 'Wishlist', icon: Heart, href: '/profil/wishlist' },
  { label: 'Pengaturan', icon: Settings, href: '/profil/pengaturan' },
]
```

Delete the entire `NAV_SOON` array:
```ts
// DELETE these lines:
const NAV_SOON = [
  { label: 'Alamat', icon: MapPin },
  { label: 'Wishlist', icon: Heart },
]
```

Delete the JSX block that renders `NAV_SOON` (lines 115–143 — the second `<SidebarGroup>` block with disabled buttons and "Segera" badge). The block starts with:
```tsx
<SidebarGroup>
  <SidebarGroupContent>
    <SidebarMenu>
      {NAV_SOON.map((item) => {
```
and ends with:
```tsx
    </SidebarMenu>
  </SidebarGroupContent>
</SidebarGroup>
```

Also remove the `Badge` import from `@/components/ui/badge` (line 22) — it's no longer used.

- [ ] **Step 2: Update `App.tsx`**

Add imports after the `PengaturanAkun` import (line 40):
```ts
import AlamatSaya from './pages/AlamatSaya'
import WishlistSaya from './pages/WishlistSaya'
```

Add routes after `<Route path="/profil/pengaturan" element={<PengaturanAkun />} />` (line 64):
```tsx
<Route path="/profil/alamat" element={<AlamatSaya />} />
<Route path="/profil/wishlist" element={<WishlistSaya />} />
```

- [ ] **Step 3: Type-check and lint**

```bash
cd client && npx tsc --noEmit && npm run lint
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add client/src/components/UserLayout.tsx client/src/App.tsx
git commit -m "feat: activate alamat and wishlist nav in user dashboard"
```

---

### Task 9: Manual end-to-end verification

- [ ] **Step 1: Start dev server**

```bash
npm run dev
```

- [ ] **Step 2: Verify Alamat page**

1. Navigate to `http://localhost:5173/profil/alamat` (must be logged in as customer)
2. Confirm: Alamat form loads with existing address data (or empty fields)
3. Fill in all fields and click "Simpan Alamat"
4. Confirm: success message appears
5. Refresh page and confirm: saved data reloads correctly

- [ ] **Step 3: Verify Wishlist on Products page**

1. Navigate to `http://localhost:5173/produk`
2. Confirm: heart icon appears on top-right of each product card image
3. Click a heart icon (logged in): heart fills red
4. Click again: heart empties

- [ ] **Step 4: Verify Wishlist on ProductDetail page**

1. Navigate to a product detail page
2. Confirm: heart icon appears on the main product image (top-right)
3. Toggle works correctly

- [ ] **Step 5: Verify Wishlist page**

1. Navigate to `http://localhost:5173/profil/wishlist`
2. Confirm: wishlisted products appear in a grid
3. Confirm: clicking heart removes the product immediately (optimistic)
4. Confirm: empty state shows when list is empty

- [ ] **Step 6: Verify sidebar nav**

1. Open `http://localhost:5173/profil`
2. Confirm: sidebar shows Alamat and Wishlist as active links (no "Segera" badge)
3. Click each link — confirm navigation works
