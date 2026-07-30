import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import AdminLayout from "../../components/AdminLayout";
import api, { API_BASE_URL } from "../../services/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const API_URL = API_BASE_URL;

interface ProductOption {
  _id: string;
  name: string;
}

interface Hotspot {
  x: number;
  y: number;
  product: string;
}

interface ShopTheLookHotspotResponse {
  x: number;
  y: number;
  product: { _id: string; name: string } | string | null;
}

interface ShopTheLookResponse {
  _id: string;
  title: string;
  image: string;
  active: boolean;
  hotspots: ShopTheLookHotspotResponse[];
}

const hotspotProductId = (product: ShopTheLookHotspotResponse['product']): string =>
  typeof product === 'string' ? product : product?._id ?? '';

export default function AdminShopTheLook() {
  const [id, setId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [active, setActive] = useState(true);
  const [image, setImage] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [hotspots, setHotspots] = useState<Hotspot[]>([]);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const token = localStorage.getItem("adminToken");

  const fetchLook = useCallback(async () => {
    const res = await fetch(`${API_URL}/shop-the-look/admin/latest`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return;
    const data: ShopTheLookResponse | null = await res.json();
    if (data) {
      setId(data._id);
      setTitle(data.title || '');
      setActive(data.active);
      setImage(data.image || '');
      setHotspots(
        (data.hotspots || []).map((h) => ({
          x: h.x,
          y: h.y,
          product: hotspotProductId(h.product),
        }))
      );
    }
  }, [token]);

  const fetchProducts = useCallback(async () => {
    const data: ProductOption[] = await api.getProducts();
    setProducts(data);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    Promise.all([fetchLook(), fetchProducts()]).finally(() => setLoading(false));
  }, [fetchLook, fetchProducts]);

  const addHotspot = () => {
    setHotspots((prev) => [...prev, { x: 50, y: 50, product: products[0]?._id || '' }]);
  };

  const updateHotspot = (index: number, patch: Partial<Hotspot>) => {
    setHotspots((prev) => prev.map((h, i) => (i === index ? { ...h, ...patch } : h)));
  };

  const removeHotspot = (index: number) => {
    setHotspots((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (hotspots.some((h) => !h.product)) {
      toast.error('Setiap hotspot harus memiliki produk');
      return;
    }

    setSaving(true);
    try {
      const formData = new FormData();
      formData.append('title', title);
      formData.append('active', String(active));
      formData.append('hotspots', JSON.stringify(hotspots));
      if (imageFile) formData.append('image', imageFile);

      const url = id ? `${API_URL}/shop-the-look/${id}` : `${API_URL}/shop-the-look`;
      const res = await fetch(url, {
        method: id ? 'PUT' : 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (!res.ok) {
        throw new Error('Gagal menyimpan Shop the Look');
      }

      const saved: ShopTheLookResponse = await res.json();
      setId(saved._id);
      setImage(saved.image || '');
      setImageFile(null);
      toast.success('Shop the Look berhasil disimpan');
    } catch {
      toast.error('Gagal menyimpan Shop the Look');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!id) return;
    if (!confirm('Hapus Shop the Look ini?')) return;

    const res = await fetch(`${API_URL}/shop-the-look/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });

    if (res.ok) {
      setId(null);
      setTitle('');
      setActive(true);
      setImage('');
      setImageFile(null);
      setHotspots([]);
      toast.success('Shop the Look dihapus');
    } else {
      toast.error('Gagal menghapus Shop the Look');
    }
  };

  const previewUrl = imageFile ? URL.createObjectURL(imageFile) : api.getImageUrl(image);

  if (loading) {
    return (
      <AdminLayout title="Shop the Look">
        <div className="space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3 animate-pulse"></div>
          <div className="h-64 bg-gray-200 rounded animate-pulse"></div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Shop the Look">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Detail</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="stl-title">Judul</Label>
              <Input
                id="stl-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Judul internal (opsional)"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="stl-image">Foto Lifestyle</Label>
              <Input
                id="stl-image"
                type="file"
                accept="image/*"
                onChange={(e) => setImageFile(e.target.files?.[0] || null)}
              />
            </div>

            <div className="flex items-center justify-between py-2">
              <Label htmlFor="stl-active">Aktif di Homepage</Label>
              <Switch id="stl-active" checked={active} onCheckedChange={setActive} />
            </div>

            {(image || imageFile) && (
              <div className="relative w-full aspect-[4/5] max-w-sm overflow-hidden rounded-lg bg-gray-100">
                <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                {hotspots.map((h, i) => (
                  <div
                    key={i}
                    className="absolute w-3 h-3 rounded-full bg-white shadow ring-1 ring-black/10 -translate-x-1/2 -translate-y-1/2"
                    style={{ left: `${h.x}%`, top: `${h.y}%` }}
                    title={`Hotspot ${i + 1}`}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Hotspot Produk</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {hotspots.length === 0 && (
              <p className="text-sm text-gray-500">Belum ada hotspot. Tambahkan baris untuk menandai produk.</p>
            )}

            {hotspots.map((h, i) => (
              <div key={i} className="grid grid-cols-[1fr_1fr_2fr_auto] gap-2 items-end border-b pb-3">
                <div className="space-y-1">
                  <Label htmlFor={`stl-x-${i}`} className="text-xs">X (%)</Label>
                  <Input
                    id={`stl-x-${i}`}
                    type="number"
                    min={0}
                    max={100}
                    value={h.x}
                    onChange={(e) => updateHotspot(i, { x: Number(e.target.value) })}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor={`stl-y-${i}`} className="text-xs">Y (%)</Label>
                  <Input
                    id={`stl-y-${i}`}
                    type="number"
                    min={0}
                    max={100}
                    value={h.y}
                    onChange={(e) => updateHotspot(i, { y: Number(e.target.value) })}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor={`stl-product-${i}`} className="text-xs">Produk</Label>
                  <select
                    id={`stl-product-${i}`}
                    value={h.product}
                    onChange={(e) => updateHotspot(i, { product: e.target.value })}
                    className="w-full h-9 px-3 border rounded-md text-sm bg-transparent"
                  >
                    <option value="">Pilih produk</option>
                    {products.map((p) => (
                      <option key={p._id} value={p._id}>{p.name}</option>
                    ))}
                  </select>
                </div>
                <Button variant="destructive" size="sm" onClick={() => removeHotspot(i)}>
                  Hapus
                </Button>
              </div>
            ))}

            <Button variant="outline" onClick={addHotspot} disabled={products.length === 0}>
              + Tambah Hotspot
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="flex gap-3 mt-6">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? 'Menyimpan...' : 'Simpan'}
        </Button>
        {id && (
          <Button variant="destructive" onClick={handleDelete}>
            Hapus Shop the Look
          </Button>
        )}
      </div>
    </AdminLayout>
  );
}
