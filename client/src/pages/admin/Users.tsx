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

  // eslint-disable-next-line react-hooks/set-state-in-effect
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
      <Sheet open={editOpen} onOpenChange={(open) => setEditOpen(open)}>
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
                onCheckedChange={(v) => setEditForm((f) => ({ ...f, suspended: v }))}
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
      <Sheet open={resetOpen} onOpenChange={(open) => setResetOpen(open)}>
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
