import { useState, useEffect, useCallback, useRef } from "react";
import { toast } from "sonner";
import AdminLayout from "../../components/AdminLayout";
import api, { API_BASE_URL } from "../../services/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const API_URL = API_BASE_URL;

interface ProductVariant {
  name: string;
  image: string;
  price: string;
  weightGrams: string;
  dimensionLength: string;
  dimensionWidth: string;
  dimensionHeight: string;
}

const categoryId = (category: Product['category']): string =>
  typeof category === 'string' ? category : category?._id ?? '';

const categoryName = (category: Product['category']): string =>
  typeof category === 'string' ? '' : category?.name ?? '';

interface Product {
  _id: string;
  name: string;
  description?: string;
  category: string | { _id: string; name: string };
  price: string;
  weightGrams: number;
  dimensions?: { length: number; width: number; height: number };
  link?: string;
  linkTokopedia?: string;
  linkShopee?: string;
  isFeatured: boolean;
  image: string;
  images?: string[];
  variants?: {
    name: string;
    image?: string;
    price: number;
    weightGrams: number;
    dimensions: { length: number; width: number; height: number };
  }[];
}

const emptyForm = {
  name: "",
  description: "",
  category: "",
  price: "",
  weightGrams: "",
  dimensionLength: "",
  dimensionWidth: "",
  dimensionHeight: "",
  link: "",
  linkTokopedia: "",
  linkShopee: "",
  isFeatured: false,
};

export default function AdminProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"list" | "form">("list");
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState({ ...emptyForm });
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [existingImages, setExistingImages] = useState<string[]>([]);
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [saving, setSaving] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [openPickerIdx, setOpenPickerIdx] = useState<number | null>(null);
  const [pendingVariantUploadIdx, setPendingVariantUploadIdx] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const variantFileInputRef = useRef<HTMLInputElement>(null);

  const token = localStorage.getItem("adminToken");

  const fetchProducts = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/products`);
      const data = await res.json();
      setProducts(data);
    } catch { /* ignore fetch errors */ }
  }, []);

  const fetchCategories = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/categories`);
      const data = await res.json();
      setCategories(data);
    } catch { /* ignore fetch errors */ }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    Promise.all([fetchProducts(), fetchCategories()]).finally(() => setLoading(false));
  }, [fetchProducts, fetchCategories]);

  const getVariantImageSrc = (v: ProductVariant): string => {
    if (!v.image) return '';
    if (v.image.startsWith('__new__')) {
      const idx = parseInt(v.image.replace('__new__', ''), 10);
      return imagePreviews[idx] || '';
    }
    return api.getImageUrl(v.image);
  };

  const addVariantImage = (variantIdx: number, file: File) => {
    const preview = URL.createObjectURL(file);
    const futureIndex = imageFiles.length;
    setImageFiles((prev) => [...prev, file]);
    setImagePreviews((prev) => [...prev, preview]);
    setVariants((prev) =>
      prev.map((v, i) => (i === variantIdx ? { ...v, image: `__new__${futureIndex}` } : v))
    );
  };

  const addImageFiles = (files: File[]) => {
    const images = files.filter((f) => f.type.startsWith("image/"));
    setImageFiles((prev) => [...prev, ...images]);
    const previews = images.map((f) => URL.createObjectURL(f));
    setImagePreviews((prev) => [...prev, ...previews]);
  };

  const removeNewImage = (index: number) => {
    URL.revokeObjectURL(imagePreviews[index]);
    setImageFiles((prev) => prev.filter((_, i) => i !== index));
    setImagePreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const data = new FormData();
    data.append("name", formData.name);
    data.append("description", formData.description);
    data.append("category", formData.category);
    data.append("price", formData.price);
    data.append("weightGrams", formData.weightGrams);
    data.append("dimensionLength", formData.dimensionLength);
    data.append("dimensionWidth", formData.dimensionWidth);
    data.append("dimensionHeight", formData.dimensionHeight);
    data.append("link", formData.link);
    data.append("linkTokopedia", formData.linkTokopedia);
    data.append("linkShopee", formData.linkShopee);
    data.append("isFeatured", String(formData.isFeatured));
    imageFiles.forEach((file) => data.append("images", file));
    existingImages.forEach((img) => data.append("keptImages", img));
    data.append(
      "variants",
      JSON.stringify(
        variants.map((v) => ({
          name: v.name,
          image: v.image || '',
          price: v.price !== "" ? Number(v.price) : formData.price,
          weightGrams: v.weightGrams !== "" ? Number(v.weightGrams) : Number(formData.weightGrams) || 0,
          dimensions: {
            length: v.dimensionLength !== "" ? Number(v.dimensionLength) : Number(formData.dimensionLength) || 1,
            width: v.dimensionWidth !== "" ? Number(v.dimensionWidth) : Number(formData.dimensionWidth) || 1,
            height: v.dimensionHeight !== "" ? Number(v.dimensionHeight) : Number(formData.dimensionHeight) || 1,
          },
        }))
      )
    );

    try {
      const url = editingProduct ? `${API_URL}/products/${editingProduct._id}` : `${API_URL}/products`;
      const res = await fetch(url, {
        method: editingProduct ? "PUT" : "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: data,
      });

      if (res.ok) {
        await fetchProducts();
        resetForm();
      } else {
        const err = await res.json();
        toast.error(`Gagal: ${err.message || "Unknown error"}`);
      }
    } catch (error) {
      toast.error(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Hapus produk ini?")) return;
    await fetch(`${API_URL}/products/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    fetchProducts();
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      description: product.description || "",
      category: categoryId(product.category),
      price: product.price || "",
      weightGrams: String(product.weightGrams || ""),
      dimensionLength: String(product.dimensions?.length || ""),
      dimensionWidth: String(product.dimensions?.width || ""),
      dimensionHeight: String(product.dimensions?.height || ""),
      link: product.link || "",
      linkTokopedia: product.linkTokopedia || "",
      linkShopee: product.linkShopee || "",
      isFeatured: product.isFeatured || false,
    });
    const imgs = product.images?.length ? product.images : product.image ? [product.image] : [];
    setExistingImages(imgs);
    setVariants(
      (product.variants || []).map((v) => ({
        name: v.name,
        image: v.image || '',
        price: String(v.price),
        weightGrams: String(v.weightGrams),
        dimensionLength: String(v.dimensions?.length ?? 1),
        dimensionWidth: String(v.dimensions?.width ?? 1),
        dimensionHeight: String(v.dimensions?.height ?? 1),
      }))
    );
    setView("form");
  };

  const resetForm = () => {
    imagePreviews.forEach((p) => URL.revokeObjectURL(p));
    setFormData({ ...emptyForm });
    setImageFiles([]);
    setImagePreviews([]);
    setExistingImages([]);
    setVariants([]);
    setEditingProduct(null);
    setOpenPickerIdx(null);
    setPendingVariantUploadIdx(null);
    setView("list");
  };

  const set = (key: keyof typeof emptyForm, value: string | boolean) =>
    setFormData((prev) => ({ ...prev, [key]: value }));

  const setVariant = (i: number, key: keyof ProductVariant, value: string) =>
    setVariants((prev) => prev.map((v, idx) => (idx === i ? { ...v, [key]: value } : v)));

  const totalImages = existingImages.length + imageFiles.length;

  /* ─── LIST VIEW ─── */
  if (view === "list") {
    return (
      <AdminLayout title="Kelola Produk">
        <div className="flex items-center justify-between mb-6">
          <p className="text-gray-500 text-sm">
            {loading ? "Memuat..." : `${products.length} produk`}
          </p>
          <Button onClick={() => setView("form")} className="bg-indigo-600 hover:bg-indigo-700 text-white">
            + Tambah Produk
          </Button>
        </div>

        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                <th className="px-6 py-4">Produk</th>
                <th className="px-6 py-4">Kategori</th>
                <th className="px-6 py-4">Harga</th>
                <th className="px-6 py-4">Varian</th>
                <th className="px-6 py-4">Featured</th>
                <th className="px-6 py-4">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {products.map((product) => (
                <tr key={product._id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-lg bg-gray-100 overflow-hidden shrink-0">
                        <img
                          src={api.getImageUrl(product.image)}
                          alt={product.name}
                          className="w-full h-full object-cover"
                          onError={(e) => ((e.target as HTMLImageElement).src = "https://via.placeholder.com/44")}
                        />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 text-sm">{product.name}</p>
                        <p className="text-xs text-gray-400 truncate max-w-[200px]">{product.description}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">{categoryName(product.category) || "—"}</td>
                  <td className="px-6 py-4 text-sm text-gray-700 font-medium">{product.price || "—"}</td>
                  <td className="px-6 py-4">
                    {product.variants?.length ? (
                      <Badge variant="secondary">{product.variants.length} varian</Badge>
                    ) : (
                      <span className="text-xs text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {product.isFeatured ? (
                      <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">Featured</Badge>
                    ) : (
                      <span className="text-xs text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" onClick={() => handleEdit(product)}
                        className="text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 text-xs h-7 px-2">
                        Edit
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(product._id)}
                        className="text-red-500 hover:text-red-600 hover:bg-red-50 text-xs h-7 px-2">
                        Hapus
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {!loading && products.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-16 text-center text-gray-400 text-sm">
                    Belum ada produk. Tambahkan produk pertama.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </AdminLayout>
    );
  }

  /* ─── FORM VIEW ─── */
  return (
    <AdminLayout title={editingProduct ? "Edit Produk" : "Tambah Produk"}>
      <div className="-m-6 flex flex-col bg-white" style={{ minHeight: "calc(100vh - 64px)" }}>

        {/* Top bar */}
        <div className="flex items-center justify-between px-6 py-3 bg-white border-b border-gray-200 shrink-0">
          <div className="flex items-center gap-3">
            <button onClick={resetForm} className="text-gray-400 hover:text-gray-700 transition p-1 rounded-md hover:bg-gray-100">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div>
              <p className="text-xs text-gray-400">Produk</p>
              <p className="text-sm font-semibold text-gray-800 leading-tight">
                {editingProduct ? editingProduct.name : "Produk Baru"}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={resetForm} size="sm" className="text-gray-600">
              Batal
            </Button>
            <Button onClick={handleSubmit} disabled={saving} size="sm"
              className="bg-indigo-600 hover:bg-indigo-700 text-white min-w-[90px]">
              {saving ? "Menyimpan…" : "Simpan"}
            </Button>
          </div>
        </div>

        {/* Form body */}
        <form onSubmit={handleSubmit} className="p-6">
          <div className="flex flex-wrap gap-5">

            {/* Informasi Dasar */}
            <Card className="shadow-none border-gray-200 flex-1 min-w-[280px]">
              <CardHeader className="pb-3 pt-4 px-5">
                <CardTitle className="text-sm font-semibold text-gray-700">Informasi Dasar</CardTitle>
              </CardHeader>
              <CardContent className="px-5 pb-5 space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="name" className="text-xs text-gray-500">Nama Produk <span className="text-red-400">*</span></Label>
                  <Input id="name" value={formData.name} onChange={(e) => set("name", e.target.value)}
                    placeholder="Masukkan nama produk" required className="h-9 text-sm" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="description" className="text-xs text-gray-500">Deskripsi</Label>
                  <Textarea id="description" value={formData.description}
                    onChange={(e) => set("description", e.target.value)}
                    placeholder="Deskripsi singkat produk" rows={3} className="text-sm resize-none" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="category" className="text-xs text-gray-500">Kategori <span className="text-red-400">*</span></Label>
                  <select id="category" value={formData.category}
                    onChange={(e) => set("category", e.target.value)} required
                    className="w-full h-9 px-3 border border-gray-200 rounded-md text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent">
                    <option value="">Pilih kategori…</option>
                    {categories.map((cat) => (
                      <option key={cat._id} value={cat._id}>{cat.name}</option>
                    ))}
                  </select>
                </div>
              </CardContent>
            </Card>

            {/* Harga & Pengiriman */}
            <Card className="shadow-none border-gray-200 flex-1 min-w-[280px]">
              <CardHeader className="pb-3 pt-4 px-5">
                <CardTitle className="text-sm font-semibold text-gray-700">Harga & Pengiriman</CardTitle>
              </CardHeader>
              <CardContent className="px-5 pb-5 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="price" className="text-xs text-gray-500">Harga</Label>
                    <Input id="price" value={formData.price} onChange={(e) => set("price", e.target.value)}
                      placeholder="Rp 150.000" className="h-9 text-sm" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="weight" className="text-xs text-gray-500">Berat (gram)</Label>
                    <Input id="weight" type="number" min="0" value={formData.weightGrams}
                      onChange={(e) => set("weightGrams", e.target.value)}
                      placeholder="500" className="h-9 text-sm" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-gray-500">Dimensi (cm) — P × L × T</Label>
                  <div className="grid grid-cols-3 gap-2">
                    <Input type="number" min="1" value={formData.dimensionLength}
                      onChange={(e) => set("dimensionLength", e.target.value)}
                      placeholder="Panjang" className="h-9 text-sm" />
                    <Input type="number" min="1" value={formData.dimensionWidth}
                      onChange={(e) => set("dimensionWidth", e.target.value)}
                      placeholder="Lebar" className="h-9 text-sm" />
                    <Input type="number" min="1" value={formData.dimensionHeight}
                      onChange={(e) => set("dimensionHeight", e.target.value)}
                      placeholder="Tinggi" className="h-9 text-sm" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Foto Produk */}
            <Card className="shadow-none border-gray-200 w-full">
              <CardHeader className="pb-3 pt-4 px-5">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold text-gray-700">Foto Produk</CardTitle>
                  <span className="text-xs text-gray-400">{totalImages} gambar · pertama jadi thumbnail</span>
                </div>
              </CardHeader>
              <CardContent className="px-5 pb-5 space-y-4">
                {/* Drop zone */}
                <div
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={(e) => { e.preventDefault(); setDragOver(false); addImageFiles(Array.from(e.dataTransfer.files)); }}
                  onClick={() => fileInputRef.current?.click()}
                  className={`cursor-pointer border-2 border-dashed rounded-xl flex flex-col items-center justify-center py-8 gap-2 transition-colors
                    ${dragOver ? "border-indigo-400 bg-indigo-50" : "border-gray-200 hover:border-indigo-300 hover:bg-gray-50"}`}
                >
                  <svg className="w-7 h-7 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                      d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <p className="text-xs text-gray-400">Drag & drop atau <span className="text-indigo-500 font-medium">klik untuk pilih</span></p>
                  <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden"
                    onChange={(e) => addImageFiles(Array.from(e.target.files || []))} />
                </div>

                {/* Image grid */}
                {(existingImages.length > 0 || imagePreviews.length > 0) && (
                  <div className="flex flex-wrap gap-2">
                    {existingImages.map((img, i) => (
                      <div key={`ex-${i}`} className="relative group w-24 h-24 rounded-lg overflow-hidden bg-gray-100 shrink-0">
                        <img src={api.getImageUrl(img)} alt="" className="w-full h-full object-cover" />
                        {i === 0 && existingImages.length > 0 && (
                          <span className="absolute top-1 left-1 text-[10px] bg-indigo-600 text-white px-1 rounded font-medium">Cover</span>
                        )}
                        <button type="button"
                          onClick={() => setExistingImages((prev) => prev.filter((_, idx) => idx !== i))}
                          className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    ))}
                    {imagePreviews.map((src, i) => (
                      <div key={`new-${i}`} className="relative group w-24 h-24 rounded-lg overflow-hidden bg-gray-100 shrink-0">
                        <img src={src} alt="" className="w-full h-full object-cover" />
                        {existingImages.length === 0 && i === 0 && (
                          <span className="absolute top-1 left-1 text-[10px] bg-indigo-600 text-white px-1 rounded font-medium">Cover</span>
                        )}
                        <button type="button" onClick={() => removeNewImage(i)}
                          className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Varian */}
            <Card className="shadow-none border-gray-200 w-full">
              <CardHeader className="pb-3 pt-4 px-5">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold text-gray-700">Varian Produk</CardTitle>
                  <Button type="button" variant="outline" size="sm"
                    onClick={() => setVariants((prev) => [...prev, { name: "", image: "", price: "", weightGrams: "", dimensionLength: "", dimensionWidth: "", dimensionHeight: "" }])}
                    className="h-7 text-xs border-indigo-200 text-indigo-600 hover:bg-indigo-50">
                    + Tambah
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="px-5 pb-5">
                {variants.length === 0 ? (
                  <p className="text-xs text-gray-400 text-center py-4 border border-dashed border-gray-200 rounded-lg">
                    Belum ada varian
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-3">
                    {variants.map((v, i) => (
                      <div key={i} className="border border-gray-200 rounded-lg p-4 space-y-3 bg-gray-50/50 flex-1 min-w-[260px]">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Varian {i + 1}</span>
                          <button type="button" onClick={() => setVariants((prev) => prev.filter((_, idx) => idx !== i))}
                            className="text-xs text-red-400 hover:text-red-600 transition">Hapus</button>
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs text-gray-500">Nama <span className="text-red-400">*</span></Label>
                          <Input value={v.name} onChange={(e) => setVariant(i, "name", e.target.value)}
                            placeholder="mis. 500ml, Merah, L" required className="h-8 text-sm" />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1.5">
                            <Label className="text-xs text-gray-400">Harga (kosong = ikuti)</Label>
                            <Input type="number" min="0" value={v.price}
                              onChange={(e) => setVariant(i, "price", e.target.value)}
                              placeholder={formData.price || "—"} className="h-8 text-sm" />
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-xs text-gray-400">Berat g (kosong = ikuti)</Label>
                            <Input type="number" min="0" value={v.weightGrams}
                              onChange={(e) => setVariant(i, "weightGrams", e.target.value)}
                              placeholder={formData.weightGrams || "—"} className="h-8 text-sm" />
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs text-gray-400">Dimensi cm P×L×T (kosong = ikuti)</Label>
                          <div className="grid grid-cols-3 gap-2">
                            <Input type="number" min="1" value={v.dimensionLength}
                              onChange={(e) => setVariant(i, "dimensionLength", e.target.value)}
                              placeholder={formData.dimensionLength || "P"} className="h-8 text-sm" />
                            <Input type="number" min="1" value={v.dimensionWidth}
                              onChange={(e) => setVariant(i, "dimensionWidth", e.target.value)}
                              placeholder={formData.dimensionWidth || "L"} className="h-8 text-sm" />
                            <Input type="number" min="1" value={v.dimensionHeight}
                              onChange={(e) => setVariant(i, "dimensionHeight", e.target.value)}
                              placeholder={formData.dimensionHeight || "T"} className="h-8 text-sm" />
                          </div>
                        </div>

                        {/* Variant image picker */}
                        <div className="space-y-1.5">
                          <Label className="text-xs text-gray-400">Gambar Varian (opsional)</Label>
                          <div className="flex items-center gap-3">
                            <div className="w-14 h-14 rounded-lg bg-gray-100 overflow-hidden border border-gray-200 shrink-0 flex items-center justify-center">
                              {getVariantImageSrc(v) ? (
                                <img src={getVariantImageSrc(v)} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <svg className="w-5 h-5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                              )}
                            </div>
                            <div className="flex flex-col gap-1">
                              <button type="button"
                                onClick={() => setOpenPickerIdx(openPickerIdx === i ? null : i)}
                                className="text-xs text-indigo-600 hover:text-indigo-700 text-left transition">
                                Pilih dari foto produk
                              </button>
                              <button type="button"
                                onClick={() => { setPendingVariantUploadIdx(i); variantFileInputRef.current?.click(); }}
                                className="text-xs text-indigo-600 hover:text-indigo-700 text-left transition">
                                Upload baru
                              </button>
                              {v.image && (
                                <button type="button"
                                  onClick={() => setVariant(i, "image", "")}
                                  className="text-xs text-red-400 hover:text-red-500 text-left transition">
                                  Hapus
                                </button>
                              )}
                            </div>
                          </div>

                          {openPickerIdx === i && (
                            <div className="mt-1 p-2 border border-gray-200 rounded-lg bg-white">
                              {existingImages.length === 0 && imagePreviews.length === 0 ? (
                                <p className="text-xs text-gray-400 text-center py-3">
                                  Belum ada gambar produk. Upload gambar terlebih dahulu.
                                </p>
                              ) : (
                                <div className="flex flex-wrap gap-2">
                                  {existingImages.map((img, imgIdx) => (
                                    <button key={`ex-${imgIdx}`} type="button"
                                      onClick={() => { setVariant(i, "image", img); setOpenPickerIdx(null); }}
                                      className={`w-14 h-14 rounded-lg overflow-hidden border-2 transition ${v.image === img ? "border-indigo-500" : "border-transparent hover:border-gray-300"}`}>
                                      <img src={api.getImageUrl(img)} alt="" className="w-full h-full object-cover" />
                                    </button>
                                  ))}
                                  {imagePreviews.map((src, imgIdx) => (
                                    <button key={`new-${imgIdx}`} type="button"
                                      onClick={() => { setVariant(i, "image", `__new__${imgIdx}`); setOpenPickerIdx(null); }}
                                      className={`w-14 h-14 rounded-lg overflow-hidden border-2 transition ${v.image === `__new__${imgIdx}` ? "border-indigo-500" : "border-transparent hover:border-gray-300"}`}>
                                      <img src={src} alt="" className="w-full h-full object-cover" />
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

          </div>
        </form>

        <input
          ref={variantFileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file && pendingVariantUploadIdx !== null) {
              addVariantImage(pendingVariantUploadIdx, file);
              setPendingVariantUploadIdx(null);
            }
            e.target.value = '';
          }}
        />
      </div>
    </AdminLayout>
  );
}
