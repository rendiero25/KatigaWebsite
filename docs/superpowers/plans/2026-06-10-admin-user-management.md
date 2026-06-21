# Admin User Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a full-CRUD user management section to the admin dashboard, allowing admins to list, edit, suspend, delete, and reset passwords for registered customers.

**Architecture:** New backend route file `routes/adminCustomerRoutes.js` protected by admin JWT middleware exposes 5 REST endpoints under `/api/admin/customers`. The frontend page `Users.tsx` manages its own fetch state (following the Orders.tsx pattern) and uses Sheet components for edit and reset-password actions, with inline delete confirmation.

**Tech Stack:** Express + Mongoose (backend); React + TypeScript + Tailwind + shadcn Sheet/Badge/Button/Input/Label/Switch (frontend)

---

## File Map

| Action | File |
|---|---|
| Modify | `models/Customer.js` |
| Create | `routes/adminCustomerRoutes.js` |
| Modify | `server.js` |
| Modify | `client/src/services/api.ts` |
| Modify | `client/src/hooks/useApi.ts` |
| Create | `client/src/pages/admin/Users.tsx` |
| Modify | `client/src/components/AdminLayout.tsx` |
| Modify | `client/src/App.tsx` |

---

## Task 1: Add `suspended` field to Customer model

**Files:**
- Modify: `models/Customer.js`

- [ ] **Step 1: Add field**

In `models/Customer.js`, add `suspended` to the schema (after the `googleId` line):

```js
suspended: { type: Boolean, default: false },
```

The schema block after edit:

```js
const customerSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, default: '' },
  phone: { type: String, default: '', trim: true },
  googleId: { type: String, default: '', index: true },
  suspended: { type: Boolean, default: false },
  defaultAddress: {
    // ... unchanged
  }
}, { timestamps: true });
```

- [ ] **Step 2: Verify server starts**

```bash
node -e "require('./models/Customer')" && echo "OK"
```

Expected: `OK`

- [ ] **Step 3: Commit**

```bash
git add models/Customer.js
git commit -m "feat: add suspended field to Customer model"
```

---

## Task 2: Create adminCustomerRoutes.js

**Files:**
- Create: `routes/adminCustomerRoutes.js`

- [ ] **Step 1: Create the file**

```js
const express = require('express');
const router = express.Router();
const Customer = require('../models/Customer');
const auth = require('../middleware/auth');

// GET /api/admin/customers?search=&page=1&limit=20
router.get('/', auth, async (req, res) => {
  try {
    const { search = '', page = 1, limit = 20 } = req.query;
    const query = search
      ? { $or: [
          { name: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } },
        ]}
      : {};
    const total = await Customer.countDocuments(query);
    const customers = await Customer.find(query)
      .select('-password')
      .sort({ createdAt: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit));
    res.json({ customers, total, page: Number(page), pages: Math.ceil(total / Number(limit)) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/admin/customers/:id
router.get('/:id', auth, async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id).select('-password');
    if (!customer) return res.status(404).json({ message: 'User tidak ditemukan' });
    res.json(customer);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/admin/customers/:id
router.put('/:id', auth, async (req, res) => {
  try {
    const { name, email, phone, suspended } = req.body;
    const customer = await Customer.findByIdAndUpdate(
      req.params.id,
      { name, email, phone, suspended },
      { new: true, runValidators: true }
    ).select('-password');
    if (!customer) return res.status(404).json({ message: 'User tidak ditemukan' });
    res.json(customer);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /api/admin/customers/:id
router.delete('/:id', auth, async (req, res) => {
  try {
    const customer = await Customer.findByIdAndDelete(req.params.id);
    if (!customer) return res.status(404).json({ message: 'User tidak ditemukan' });
    res.json({ message: 'User berhasil dihapus' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/admin/customers/:id/reset-password
router.post('/:id/reset-password', auth, async (req, res) => {
  try {
    const { password } = req.body;
    if (!password || password.length < 6) {
      return res.status(400).json({ message: 'Password minimal 6 karakter' });
    }
    const customer = await Customer.findById(req.params.id);
    if (!customer) return res.status(404).json({ message: 'User tidak ditemukan' });
    customer.password = password;
    await customer.save();
    res.json({ message: 'Password berhasil direset' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
```

- [ ] **Step 2: Verify syntax**

```bash
node -e "require('./routes/adminCustomerRoutes')" && echo "OK"
```

Expected: `OK`

- [ ] **Step 3: Commit**

```bash
git add routes/adminCustomerRoutes.js
git commit -m "feat: add adminCustomerRoutes with list/get/update/delete/reset-password"
```

---

## Task 3: Register route in server.js

**Files:**
- Modify: `server.js`

- [ ] **Step 1: Add the route registration**

In `server.js`, after the `app.use('/api/orders', ...)` line, add:

```js
app.use('/api/admin/customers', require('./routes/adminCustomerRoutes'));
```

- [ ] **Step 2: Smoke-test the endpoint**

Start the backend (or let nodemon restart), then:

```bash
curl -s -o /dev/null -w "%{http_code}" http://localhost:8000/api/admin/customers
```

Expected: `401` (unauthenticated — route is wired up but correctly protected)

- [ ] **Step 3: Commit**

```bash
git add server.js
git commit -m "feat: register adminCustomerRoutes in server"
```

---

## Task 4: Add API methods to api.ts

**Files:**
- Modify: `client/src/services/api.ts`

- [ ] **Step 1: Add methods**

In `client/src/services/api.ts`, inside the `api` object (after `updateOrderStatus`), add:

```ts
// Admin Customer Management
getAdminCustomers: async (params?: { search?: string; page?: number; limit?: number }) => {
  const token = localStorage.getItem('adminToken');
  const qs = params ? `?${new URLSearchParams(params as Record<string, string>).toString()}` : '';
  const res = await fetch(`${API_BASE_URL}/admin/customers${qs}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Failed to fetch customers');
  return res.json();
},

getAdminCustomer: async (id: string) => {
  const token = localStorage.getItem('adminToken');
  const res = await fetch(`${API_BASE_URL}/admin/customers/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Failed to fetch customer');
  return res.json();
},

updateAdminCustomer: async (id: string, data: object) => {
  const token = localStorage.getItem('adminToken');
  const res = await fetch(`${API_BASE_URL}/admin/customers/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to update customer');
  return res.json();
},

deleteAdminCustomer: async (id: string) => {
  const token = localStorage.getItem('adminToken');
  const res = await fetch(`${API_BASE_URL}/admin/customers/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Failed to delete customer');
  return res.json();
},

resetCustomerPassword: async (id: string, password: string) => {
  const token = localStorage.getItem('adminToken');
  const res = await fetch(`${API_BASE_URL}/admin/customers/${id}/reset-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ password }),
  });
  if (!res.ok) throw new Error('Failed to reset password');
  return res.json();
},
```

- [ ] **Step 2: Type-check**

```bash
cd client && npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add client/src/services/api.ts
git commit -m "feat: add admin customer API methods to api.ts"
```

---

## Task 5: Add useAdminCustomers hook

**Files:**
- Modify: `client/src/hooks/useApi.ts`

- [ ] **Step 1: Add interface and hook at the end of the file**

```ts
interface CustomerData {
  _id: string
  name: string
  email: string
  phone: string
  suspended: boolean
  googleId: string
  createdAt: string
}

interface CustomersResponse {
  customers: CustomerData[]
  total: number
  pages: number
  page: number
}

export function useAdminCustomers(params?: { search?: string; page?: number; limit?: number }) {
  const [data, setData] = useState<CustomersResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    api.getAdminCustomers(params)
      .then(setData)
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [params?.search, params?.page, params?.limit]);

  return { data, loading, error };
}
```

- [ ] **Step 2: Type-check**

```bash
cd client && npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add client/src/hooks/useApi.ts
git commit -m "feat: add useAdminCustomers hook"
```

---

## Task 6: Create Users.tsx admin page

**Files:**
- Create: `client/src/pages/admin/Users.tsx`

- [ ] **Step 1: Create the file**

```tsx
import { useState, useEffect, useCallback } from 'react'
import AdminLayout from '../../components/AdminLayout'
import { API_BASE_URL } from '../../services/api'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'

interface Customer {
  _id: string
  name: string
  email: string
  phone: string
  suspended: boolean
  googleId: string
  createdAt: string
}

interface CustomersResponse {
  customers: Customer[]
  total: number
  pages: number
  page: number
}

interface EditForm {
  name: string
  email: string
  phone: string
  suspended: boolean
}

export default function AdminUsers() {
  const token = localStorage.getItem('adminToken')
  const [data, setData] = useState<CustomersResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  const [editTarget, setEditTarget] = useState<Customer | null>(null)
  const [editForm, setEditForm] = useState<EditForm>({ name: '', email: '', phone: '', suspended: false })
  const [editOpen, setEditOpen] = useState(false)
  const [editSaving, setEditSaving] = useState(false)

  const [resetTarget, setResetTarget] = useState<Customer | null>(null)
  const [resetOpen, setResetOpen] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [resetSaving, setResetSaving] = useState(false)

  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  const fetchCustomers = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      params.set('page', String(page))
      params.set('limit', '20')
      const res = await fetch(`${API_BASE_URL}/admin/customers?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const json: CustomersResponse = await res.json()
      setData(json)
    } finally {
      setLoading(false)
    }
  }, [search, page, token])

  useEffect(() => { fetchCustomers() }, [fetchCustomers])

  const openEdit = (c: Customer) => {
    setEditTarget(c)
    setEditForm({ name: c.name, email: c.email, phone: c.phone, suspended: c.suspended })
    setEditOpen(true)
  }

  const saveEdit = async () => {
    if (!editTarget) return
    setEditSaving(true)
    try {
      const res = await fetch(`${API_BASE_URL}/admin/customers/${editTarget._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(editForm),
      })
      if (!res.ok) throw new Error('Gagal menyimpan')
      setEditOpen(false)
      showToast('User berhasil diperbarui')
      fetchCustomers()
    } catch {
      showToast('Gagal menyimpan perubahan', 'error')
    } finally {
      setEditSaving(false)
    }
  }

  const openReset = (c: Customer) => {
    setResetTarget(c)
    setNewPassword('')
    setResetOpen(true)
  }

  const saveReset = async () => {
    if (!resetTarget || newPassword.length < 6) return
    setResetSaving(true)
    try {
      const res = await fetch(`${API_BASE_URL}/admin/customers/${resetTarget._id}/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ password: newPassword }),
      })
      if (!res.ok) throw new Error('Gagal reset')
      setResetOpen(false)
      showToast('Password berhasil direset')
    } catch {
      showToast('Gagal mereset password', 'error')
    } finally {
      setResetSaving(false)
    }
  }

  const confirmDelete = async (id: string) => {
    setDeleteLoading(true)
    try {
      const res = await fetch(`${API_BASE_URL}/admin/customers/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error('Gagal hapus')
      setDeleteTarget(null)
      showToast('User berhasil dihapus')
      fetchCustomers()
    } catch {
      showToast('Gagal menghapus user', 'error')
    } finally {
      setDeleteLoading(false)
    }
  }

  return (
    <AdminLayout title="Manajemen User">
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg text-white text-sm shadow-lg transition-all ${
            toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'
          }`}
        >
          {toast.msg}
        </div>
      )}

      <div className="flex items-center justify-between mb-6">
        <input
          type="text"
          placeholder="Cari nama atau email..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1) }}
          className="px-4 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 w-72"
        />
        <span className="text-sm text-gray-500">{data?.total ?? 0} user</span>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50 text-left text-gray-500">
                <th className="px-4 py-3 font-medium">User</th>
                <th className="px-4 py-3 font-medium">Telepon</th>
                <th className="px-4 py-3 font-medium">Metode</th>
                <th className="px-4 py-3 font-medium">Bergabung</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-gray-400">
                    Memuat...
                  </td>
                </tr>
              ) : !data?.customers.length ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-gray-400">
                    Tidak ada user
                  </td>
                </tr>
              ) : (
                data.customers.map((c) => (
                  <tr key={c._id} className="border-b border-gray-100 hover:bg-gray-50 last:border-0">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-semibold text-xs shrink-0">
                          {c.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">{c.name}</div>
                          <div className="text-xs text-gray-400">{c.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{c.phone || '—'}</td>
                    <td className="px-4 py-3">
                      <Badge variant={c.googleId ? 'secondary' : 'outline'}>
                        {c.googleId ? 'Google' : 'Email'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {new Date(c.createdAt).toLocaleDateString('id-ID', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={c.suspended ? 'destructive' : 'default'}>
                        {c.suspended ? 'Suspended' : 'Aktif'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEdit(c)}
                          className="px-3 py-1 text-xs bg-indigo-50 text-indigo-700 rounded-lg hover:bg-indigo-100 transition"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => openReset(c)}
                          className="px-3 py-1 text-xs bg-yellow-50 text-yellow-700 rounded-lg hover:bg-yellow-100 transition"
                        >
                          Reset PW
                        </button>
                        {deleteTarget === c._id ? (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => confirmDelete(c._id)}
                              disabled={deleteLoading}
                              className="px-3 py-1 text-xs bg-red-600 text-white rounded-lg hover:bg-red-700 transition disabled:opacity-50"
                            >
                              {deleteLoading ? '...' : 'Hapus?'}
                            </button>
                            <button
                              onClick={() => setDeleteTarget(null)}
                              className="px-3 py-1 text-xs bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition"
                            >
                              Batal
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setDeleteTarget(c._id)}
                            className="px-3 py-1 text-xs bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition"
                          >
                            Hapus
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {data && data.pages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-4 py-1.5 text-sm border rounded-lg disabled:opacity-40 hover:bg-gray-50 transition"
            >
              Sebelumnya
            </button>
            <span className="text-sm text-gray-500">
              Hal {page} / {data.pages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(data.pages, p + 1))}
              disabled={page === data.pages}
              className="px-4 py-1.5 text-sm border rounded-lg disabled:opacity-40 hover:bg-gray-50 transition"
            >
              Berikutnya
            </button>
          </div>
        )}
      </div>

      {/* Edit Sheet */}
      <Sheet open={editOpen} onOpenChange={setEditOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Edit User</SheetTitle>
          </SheetHeader>
          <div className="mt-6 space-y-4 px-4">
            <div className="space-y-1.5">
              <Label htmlFor="edit-name">Nama</Label>
              <Input
                id="edit-name"
                value={editForm.name}
                onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-email">Email</Label>
              <Input
                id="edit-email"
                type="email"
                value={editForm.email}
                onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-phone">Telepon</Label>
              <Input
                id="edit-phone"
                value={editForm.phone}
                onChange={(e) => setEditForm((f) => ({ ...f, phone: e.target.value }))}
              />
            </div>
            <div className="flex items-center justify-between py-2">
              <Label htmlFor="edit-suspended">Suspend Akun</Label>
              <Switch
                id="edit-suspended"
                checked={editForm.suspended}
                onCheckedChange={(v: boolean) => setEditForm((f) => ({ ...f, suspended: v }))}
              />
            </div>
          </div>
          <div className="mt-8 flex gap-3 px-4">
            <Button onClick={saveEdit} disabled={editSaving} className="flex-1">
              {editSaving ? 'Menyimpan...' : 'Simpan'}
            </Button>
            <Button variant="outline" onClick={() => setEditOpen(false)} className="flex-1">
              Batal
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Reset Password Sheet */}
      <Sheet open={resetOpen} onOpenChange={setResetOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Reset Password</SheetTitle>
          </SheetHeader>
          <div className="mt-6 space-y-4 px-4">
            <p className="text-sm text-gray-500">
              Set password baru untuk{' '}
              <span className="font-medium text-gray-900">{resetTarget?.name}</span>
            </p>
            <div className="space-y-1.5">
              <Label htmlFor="new-password">Password Baru</Label>
              <Input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Minimal 6 karakter"
              />
            </div>
          </div>
          <div className="mt-8 flex gap-3 px-4">
            <Button
              onClick={saveReset}
              disabled={resetSaving || newPassword.length < 6}
              className="flex-1"
            >
              {resetSaving ? 'Mereset...' : 'Reset Password'}
            </Button>
            <Button variant="outline" onClick={() => setResetOpen(false)} className="flex-1">
              Batal
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </AdminLayout>
  )
}
```

- [ ] **Step 2: Type-check**

```bash
cd client && npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add client/src/pages/admin/Users.tsx
git commit -m "feat: add admin Users management page"
```

---

## Task 7: Add sidebar entry to AdminLayout.tsx

**Files:**
- Modify: `client/src/components/AdminLayout.tsx`

- [ ] **Step 1: Add Users icon import**

In `AdminLayout.tsx`, add `Users as UsersIcon` to the lucide-react import:

```ts
import {
  LayoutDashboard,
  Home,
  Info,
  Package,
  BookOpen,
  Newspaper,
  Phone,
  Settings,
  LogOut,
  ChevronRight,
  Layers,
  ShoppingCart,
  ExternalLink,
  Users as UsersIcon,
} from 'lucide-react'
```

- [ ] **Step 2: Add nav item**

In the `navItems` array, after the `{ path: '/admin/orders', icon: ShoppingCart, label: 'Pesanan' }` line, add:

```ts
{ path: '/admin/users', icon: UsersIcon, label: 'Users' },
```

- [ ] **Step 3: Type-check**

```bash
cd client && npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add client/src/components/AdminLayout.tsx
git commit -m "feat: add Users nav item to admin sidebar"
```

---

## Task 8: Add route to App.tsx

**Files:**
- Modify: `client/src/App.tsx`

- [ ] **Step 1: Add import**

After the `AdminOrderDetail` import line, add:

```ts
import AdminUsers from './pages/admin/Users'
```

- [ ] **Step 2: Add route**

In the admin routes section of `App.tsx`, after the `<Route path="/admin/orders/:id" ...>` line, add:

```tsx
<Route path="/admin/users" element={<AdminUsers />} />
```

- [ ] **Step 3: Type-check + lint**

```bash
cd client && npx tsc --noEmit && npm run lint 2>&1 | head -30
```

Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add client/src/App.tsx
git commit -m "feat: add /admin/users route"
```

---

## Task 9: Manual Verification

- [ ] **Step 1: Start dev server**

```bash
npm run dev
```

- [ ] **Step 2: Verify in browser**

1. Navigate to `http://localhost:5173/admin/users`
2. Table loads with customer list
3. Search by name/email filters results
4. Click **Edit** → Sheet opens with pre-filled form; save updates the row
5. Click **Reset PW** → Sheet opens; enter 6+ char password; submit succeeds
6. Click **Hapus** → confirms inline; click confirm deletes the row
7. Badge shows **Aktif** / **Suspended** correctly after toggling suspended in edit
8. Pagination appears when > 20 users

- [ ] **Step 3: Final commit if any fixes needed**

```bash
git add -p
git commit -m "fix: <describe any fix>"
```
