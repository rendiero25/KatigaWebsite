import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2, PencilLine } from "lucide-react";

import { useProducts, useCategories } from "../../hooks/useApi";
import api from "../../services/api";
import type { AdminVoucher, VoucherPayload, VoucherScope } from "../../types/ecommerce";

import AdminLayout from "../../components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";

interface ProductOption {
  _id: string;
  name: string;
}

interface CategoryOption {
  _id: string;
  name: string;
}

const fmtRp = (n: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n);

const toDateInput = (value: string) => (value ? String(value).slice(0, 10) : "");

const emptyForm: VoucherPayload = {
  code: "",
  name: "",
  description: "",
  discountValue: 10,
  minOrderAmount: 0,
  maxDiscount: null,
  usageLimit: 0,
  perUserLimit: 0,
  startDate: "",
  endDate: "",
  isActive: true,
  appliesTo: "all",
  products: [],
  categories: [],
};

const SCOPE_OPTIONS: { value: VoucherScope; label: string }[] = [
  { value: "all", label: "Semua produk" },
  { value: "products", label: "Produk tertentu" },
  { value: "categories", label: "Kategori tertentu" },
];

export default function AdminVouchers() {
  const [vouchers, setVouchers] = useState<AdminVoucher[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<VoucherPayload>(emptyForm);
  const [pickerSearch, setPickerSearch] = useState("");

  const { data: productData } = useProducts();
  const { data: categoryData } = useCategories();
  const products = useMemo(
    () => (Array.isArray(productData) ? (productData as ProductOption[]) : []),
    [productData],
  );
  const categories = useMemo(
    () => (Array.isArray(categoryData) ? (categoryData as CategoryOption[]) : []),
    [categoryData],
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setVouchers(await api.getAdminVouchers());
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal memuat voucher");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setPickerSearch("");
    setShowForm(true);
  };

  const openEdit = (v: AdminVoucher) => {
    setEditingId(v._id);
    setForm({
      code: v.code,
      name: v.name,
      description: v.description || "",
      discountValue: v.discountValue,
      minOrderAmount: v.minOrderAmount,
      maxDiscount: v.maxDiscount,
      usageLimit: v.usageLimit,
      perUserLimit: v.perUserLimit,
      startDate: toDateInput(v.startDate),
      endDate: toDateInput(v.endDate),
      isActive: v.isActive,
      appliesTo: v.appliesTo || "all",
      products: (v.products || []).map((p) => p._id),
      categories: (v.categories || []).map((c) => c._id),
    });
    setPickerSearch("");
    setShowForm(true);
  };

  const update = (patch: Partial<VoucherPayload>) => setForm((prev) => ({ ...prev, ...patch }));

  const toggleId = (key: "products" | "categories", id: string) => {
    setForm((prev) => {
      const list = prev[key];
      return { ...prev, [key]: list.includes(id) ? list.filter((x) => x !== id) : [...list, id] };
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.saveVoucher(form, editingId ?? undefined);
      toast.success(editingId ? "Voucher diperbarui" : "Voucher dibuat");
      setShowForm(false);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menyimpan voucher");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (v: AdminVoucher) => {
    if (!window.confirm(`Hapus voucher ${v.code}? Tindakan ini tidak bisa dibatalkan.`)) return;
    try {
      await api.deleteVoucher(v._id);
      toast.success("Voucher dihapus");
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menghapus voucher");
    }
  };

  const pickerList = form.appliesTo === "products" ? products : categories;
  const filteredPicker = pickerList.filter((x) =>
    x.name.toLowerCase().includes(pickerSearch.toLowerCase()),
  );
  const selectedIds = form.appliesTo === "products" ? form.products : form.categories;

  return (
    <AdminLayout title="Kode Voucher">
      <div className="sticky top-0 z-20 -mx-6 -mt-6 mb-5 flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-gray-200 bg-white px-6 py-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-gray-800">{vouchers.length} voucher</p>
          <p className="text-xs text-gray-400">Nilai voucher selalu berupa persen.</p>
        </div>
        <Button size="sm" onClick={openCreate} className="ml-auto">
          <Plus className="size-4" />
          Buat Voucher
        </Button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
      ) : vouchers.length === 0 ? (
        <Card className="ring-gray-200">
          <CardContent className="flex flex-col items-center gap-3 py-14 text-center">
            <p className="text-sm font-medium text-gray-700">Belum ada voucher</p>
            <p className="text-xs text-gray-400">
              Kode voucher yang kamu buat di sini bisa dipakai pembeli saat checkout.
            </p>
            <Button size="sm" variant="outline" onClick={openCreate}>
              <Plus className="size-4" />
              Buat Voucher
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {vouchers.map((v) => {
            const expired = new Date(v.endDate) < new Date();
            const habis = v.usageLimit > 0 && v.usedCount >= v.usageLimit;
            return (
              <Card key={v._id} className="gap-0 py-0 ring-gray-200">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-gray-200 bg-gray-50 px-4 py-2.5">
                  <span className="font-mono text-sm font-semibold text-gray-900">{v.code}</span>
                  <Badge className="bg-indigo-600 text-white hover:bg-indigo-700">
                    {v.discountValue}%
                  </Badge>
                  {!v.isActive && <Badge className="bg-gray-200 text-gray-600">Nonaktif</Badge>}
                  {expired && <Badge className="bg-red-100 text-red-700">Kedaluwarsa</Badge>}
                  {habis && <Badge className="bg-amber-100 text-amber-700">Kuota habis</Badge>}
                  <div className="ml-auto flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7 text-gray-500 hover:text-gray-900"
                      onClick={() => openEdit(v)}
                      aria-label={`Ubah voucher ${v.code}`}
                    >
                      <PencilLine className="size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7 text-gray-500 hover:bg-red-50 hover:text-red-600"
                      onClick={() => handleDelete(v)}
                      aria-label={`Hapus voucher ${v.code}`}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </div>

                <div className="grid gap-x-6 gap-y-1.5 px-4 py-3 text-xs text-gray-500 sm:grid-cols-2 lg:grid-cols-4">
                  <p className="text-gray-800">{v.name}</p>
                  <p>
                    Berlaku {toDateInput(v.startDate)} s/d {toDateInput(v.endDate)}
                  </p>
                  <p>
                    Cakupan:{" "}
                    {v.appliesTo === "products"
                      ? `${v.products?.length || 0} produk`
                      : v.appliesTo === "categories"
                        ? `${v.categories?.length || 0} kategori`
                        : "semua produk"}
                  </p>
                  <p>
                    Dipakai {v.usedCount}
                    {v.usageLimit > 0 ? ` / ${v.usageLimit}` : ""}
                    {v.perUserLimit > 0 ? ` · maks ${v.perUserLimit}/pembeli` : ""}
                  </p>
                  {v.minOrderAmount > 0 && <p>Min. belanja {fmtRp(v.minOrderAmount)}</p>}
                  {v.maxDiscount ? <p>Maks. potongan {fmtRp(v.maxDiscount)}</p> : null}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/40" onClick={() => setShowForm(false)} />
          <div className="relative flex max-h-[90vh] w-full max-w-2xl flex-col overflow-y-auto rounded-lg bg-white shadow-2xl">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-200 bg-white px-6 py-4">
              <h3 className="text-lg font-semibold">
                {editingId ? "Ubah Voucher" : "Buat Voucher"}
              </h3>
              <Button variant="ghost" size="icon-sm" onClick={() => setShowForm(false)}>
                &times;
              </Button>
            </div>

            <div className="space-y-5 px-6 py-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="v-code" className="text-xs text-gray-500">
                    Kode Voucher
                  </Label>
                  <Input
                    id="v-code"
                    value={form.code}
                    onChange={(e) => update({ code: e.target.value.toUpperCase() })}
                    className="h-9 font-mono text-sm"
                    placeholder="HEMAT10"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="v-name" className="text-xs text-gray-500">
                    Nama Voucher
                  </Label>
                  <Input
                    id="v-name"
                    value={form.name}
                    onChange={(e) => update({ name: e.target.value })}
                    className="h-9 text-sm"
                    placeholder="Diskon Agustus"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="v-desc" className="text-xs text-gray-500">
                  Deskripsi
                </Label>
                <Textarea
                  id="v-desc"
                  value={form.description}
                  onChange={(e) => update({ description: e.target.value })}
                  rows={2}
                  className="resize-none text-sm"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-1.5">
                  <Label htmlFor="v-value" className="text-xs text-gray-500">
                    Diskon (%)
                  </Label>
                  <Input
                    id="v-value"
                    type="number"
                    min={1}
                    max={100}
                    value={form.discountValue}
                    onChange={(e) => update({ discountValue: Number(e.target.value) })}
                    className="h-9 text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="v-max" className="text-xs text-gray-500">
                    Maks. Potongan (Rp)
                  </Label>
                  <Input
                    id="v-max"
                    type="number"
                    min={0}
                    value={form.maxDiscount ?? ""}
                    onChange={(e) =>
                      update({ maxDiscount: e.target.value === "" ? null : Number(e.target.value) })
                    }
                    className="h-9 text-sm"
                    placeholder="kosong = tanpa batas"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="v-min" className="text-xs text-gray-500">
                    Min. Belanja (Rp)
                  </Label>
                  <Input
                    id="v-min"
                    type="number"
                    min={0}
                    value={form.minOrderAmount}
                    onChange={(e) => update({ minOrderAmount: Number(e.target.value) })}
                    className="h-9 text-sm"
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-4">
                <div className="space-y-1.5">
                  <Label htmlFor="v-start" className="text-xs text-gray-500">
                    Mulai
                  </Label>
                  <Input
                    id="v-start"
                    type="date"
                    value={form.startDate}
                    onChange={(e) => update({ startDate: e.target.value })}
                    className="h-9 text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="v-end" className="text-xs text-gray-500">
                    Berakhir
                  </Label>
                  <Input
                    id="v-end"
                    type="date"
                    value={form.endDate}
                    onChange={(e) => update({ endDate: e.target.value })}
                    className="h-9 text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="v-limit" className="text-xs text-gray-500">
                    Kuota Total
                  </Label>
                  <Input
                    id="v-limit"
                    type="number"
                    min={0}
                    value={form.usageLimit}
                    onChange={(e) => update({ usageLimit: Number(e.target.value) })}
                    className="h-9 text-sm"
                    placeholder="0 = tanpa batas"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="v-peruser" className="text-xs text-gray-500">
                    Kuota / Pembeli
                  </Label>
                  <Input
                    id="v-peruser"
                    type="number"
                    min={0}
                    value={form.perUserLimit}
                    onChange={(e) => update({ perUserLimit: Number(e.target.value) })}
                    className="h-9 text-sm"
                    placeholder="0 = tanpa batas"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs text-gray-500">Berlaku Untuk</Label>
                <div className="flex flex-wrap gap-2">
                  {SCOPE_OPTIONS.map((opt) => (
                    <Button
                      key={opt.value}
                      type="button"
                      size="sm"
                      variant={form.appliesTo === opt.value ? "default" : "outline"}
                      onClick={() => update({ appliesTo: opt.value })}
                    >
                      {opt.label}
                    </Button>
                  ))}
                </div>
                <p className="text-[11px] text-gray-400">
                  Diskon dihitung hanya dari item yang memenuhi cakupan, bukan seluruh keranjang.
                </p>
              </div>

              {form.appliesTo !== "all" && (
                <div className="space-y-2">
                  <Input
                    value={pickerSearch}
                    onChange={(e) => setPickerSearch(e.target.value)}
                    className="h-9 text-sm"
                    placeholder={
                      form.appliesTo === "products" ? "Cari produk..." : "Cari kategori..."
                    }
                  />
                  <div className="max-h-52 overflow-y-auto rounded-md border border-gray-200 divide-y divide-gray-100">
                    {filteredPicker.length === 0 ? (
                      <p className="px-3 py-6 text-center text-xs text-gray-400">
                        Tidak ada hasil.
                      </p>
                    ) : (
                      filteredPicker.map((item) => (
                        <label
                          key={item._id}
                          className="flex cursor-pointer items-center gap-3 px-3 py-2 text-sm hover:bg-gray-50"
                        >
                          <input
                            type="checkbox"
                            checked={selectedIds.includes(item._id)}
                            onChange={() =>
                              toggleId(
                                form.appliesTo === "products" ? "products" : "categories",
                                item._id,
                              )
                            }
                            className="size-4"
                          />
                          <span className="truncate">{item.name}</span>
                        </label>
                      ))
                    )}
                  </div>
                  <p className="text-[11px] text-gray-400">{selectedIds.length} dipilih</p>
                </div>
              )}

              <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) => update({ isActive: e.target.checked })}
                  className="size-4"
                />
                Voucher aktif
              </label>
            </div>

            <div className="sticky bottom-0 flex justify-end gap-2 border-t border-gray-200 bg-white px-6 py-4">
              <Button variant="outline" onClick={() => setShowForm(false)}>
                Batal
              </Button>
              <Button onClick={handleSave} disabled={saving} className="min-w-[130px]">
                {saving ? (
                  <>
                    <Spinner className="size-3.5" />
                    Menyimpan...
                  </>
                ) : (
                  "Simpan Voucher"
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
