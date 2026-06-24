import { useState, useRef } from 'react';
import type { ShippingAddress, SavedAddress, BiteshipArea } from '../types/ecommerce';
import { useCustomerAddresses } from '../hooks/useApi';
import api from '../services/api';

interface Props {
  selected: ShippingAddress | null;
  onSelect: (address: ShippingAddress) => void;
}

const emptyForm = {
  label: '',
  recipientName: '',
  phone: '',
  street: '',
  areaId: '',
  areaName: '',
  kecamatan: '',
  city: '',
  province: '',
  postalCode: '',
  saveToProfile: false,
  isDefault: false,
};

export default function AddressSelector({ selected, onSelect }: Props) {
  const { addresses, loading, addAddress } = useCustomerAddresses();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [areaKeyword, setAreaKeyword] = useState('');
  const [areaResults, setAreaResults] = useState<BiteshipArea[]>([]);
  const [saving, setSaving] = useState(false);
  const areaTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleAreaSearch = (keyword: string) => {
    setAreaKeyword(keyword);
    setForm((f) => ({ ...f, areaId: '', areaName: '', city: '', province: '', postalCode: '' }));
    if (areaTimer.current) clearTimeout(areaTimer.current);
    if (keyword.length < 3) { setAreaResults([]); return; }
    const timer = setTimeout(async () => {
      try {
        const results = await api.searchAreas(keyword);
        setAreaResults(Array.isArray(results) ? results : []);
      } catch { setAreaResults([]); }
    }, 500);
    areaTimer.current = timer;
  };

  const selectArea = (area: BiteshipArea) => {
    const label = `${area.administrative_division_level_3_name}, ${area.administrative_division_level_2_name}, ${area.administrative_division_level_1_name}`;
    setForm((f) => ({
      ...f,
      areaId: area.area_id,
      areaName: label,
      kecamatan: area.administrative_division_level_3_name,
      city: area.administrative_division_level_2_name,
      province: area.administrative_division_level_1_name,
      postalCode: area.postal_code,
    }));
    setAreaKeyword(label);
    setAreaResults([]);
  };

  const handleUseAddress = (addr: SavedAddress) => {
    onSelect({
      recipientName: addr.recipientName,
      phone: addr.phone,
      street: addr.street,
      city: addr.city,
      province: addr.province,
      postalCode: addr.postalCode,
      areaId: addr.areaId,
      areaName: addr.areaName,
    });
  };

  const handleConfirmNew = async () => {
    if (!form.recipientName || !form.phone || !form.street || !form.areaId) return;
    setSaving(true);
    try {
      const addressData = {
        label: form.label,
        recipientName: form.recipientName,
        phone: form.phone,
        street: form.street,
        city: form.city,
        province: form.province,
        postalCode: form.postalCode,
        areaId: form.areaId,
        areaName: form.areaName,
        isDefault: form.isDefault,
      };
      if (form.saveToProfile) {
        await addAddress(addressData);
      }
      onSelect({
        recipientName: form.recipientName,
        phone: form.phone,
        street: form.street,
        city: form.city,
        province: form.province,
        postalCode: form.postalCode,
        areaId: form.areaId,
        areaName: form.areaName,
      });
      setShowForm(false);
      setForm(emptyForm);
      setAreaKeyword('');
    } finally {
      setSaving(false);
    }
  };

  const inputCls = 'w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm';

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-bold text-black">Alamat Pengiriman</h2>
        {!showForm && (
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="shrink-0 text-sm font-semibold text-primary hover:underline"
          >
            + Tambah Alamat Baru
          </button>
        )}
      </div>

      {loading ? (
        <div className="space-y-2">
          {[1, 2].map((i) => (
            <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : addresses.length === 0 && !showForm ? (
        <p className="text-sm text-black/60 py-2">Belum ada alamat tersimpan.</p>
      ) : (
        <div className="space-y-2">
          {addresses.map((addr) => {
            const isSelected =
              selected?.areaId === addr.areaId && selected?.street === addr.street;
            return (
              <div
                key={addr._id}
                className={`border rounded-xl p-4 cursor-pointer transition ${isSelected ? 'border-primary bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}
                onClick={() => handleUseAddress(addr)}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      {addr.label && (
                        <span className="text-xs font-semibold bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                          {addr.label}
                        </span>
                      )}
                      {addr.isDefault && (
                        <span className="text-xs font-semibold bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                          Utama
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-bold text-black">{addr.recipientName}</p>
                    <p className="text-xs text-black/60">{addr.phone}</p>
                    <p className="text-xs text-black/60 mt-0.5">{addr.street}, {addr.areaName}</p>
                  </div>
                  <div
                    className={`w-4 h-4 rounded-full border-2 mt-1 shrink-0 ${isSelected ? 'border-primary bg-primary' : 'border-gray-300'}`}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showForm && (
        <div className="border border-gray-200 rounded-xl p-4 space-y-3 bg-gray-50">
          <p className="text-sm font-bold text-black">Alamat Baru</p>
          <input
            type="text"
            placeholder="Label (contoh: Rumah, Kantor)"
            value={form.label}
            onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
            className={inputCls}
          />
          <input
            type="text"
            placeholder="Nama penerima"
            value={form.recipientName}
            onChange={(e) => setForm((f) => ({ ...f, recipientName: e.target.value }))}
            className={inputCls}
          />
          <input
            type="tel"
            placeholder="Nomor HP penerima"
            value={form.phone}
            onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
            className={inputCls}
          />
          <input
            type="text"
            placeholder="Alamat lengkap (jalan, nomor, RT/RW)"
            value={form.street}
            onChange={(e) => setForm((f) => ({ ...f, street: e.target.value }))}
            className={inputCls}
          />
          <div className="relative">
            {form.areaId ? (
              <div className="border border-green-200 bg-green-50 rounded-lg p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-0.5 text-sm">
                    <p className="text-xs font-semibold text-green-700 mb-1.5">✓ Area terpilih</p>
                    <p className="text-black/80"><span className="text-black/50 w-24 inline-block">Kecamatan</span>{form.kecamatan}</p>
                    <p className="text-black/80"><span className="text-black/50 w-24 inline-block">Kota</span>{form.city}</p>
                    <p className="text-black/80"><span className="text-black/50 w-24 inline-block">Provinsi</span>{form.province}</p>
                    <p className="text-black/80"><span className="text-black/50 w-24 inline-block">Kode Pos</span>{form.postalCode}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setAreaKeyword('');
                      setAreaResults([]);
                      setForm((f) => ({ ...f, areaId: '', areaName: '', kecamatan: '', city: '', province: '', postalCode: '' }));
                    }}
                    className="text-xs text-primary underline shrink-0 hover:opacity-70 transition"
                  >
                    Ganti
                  </button>
                </div>
              </div>
            ) : (
              <>
                <input
                  type="text"
                  placeholder="Cari nama kecamatan atau kelurahan..."
                  value={areaKeyword}
                  onChange={(e) => handleAreaSearch(e.target.value)}
                  className={inputCls}
                />
                {areaResults.length > 0 && (
                  <ul className="absolute z-20 left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-lg mt-1 max-h-52 overflow-y-auto">
                    {areaResults.map((area) => (
                      <li
                        key={area.area_id}
                        className="px-4 py-2.5 hover:bg-gray-50 cursor-pointer text-sm"
                        onClick={() => selectArea(area)}
                      >
                        {area.administrative_division_level_3_name},{' '}
                        {area.administrative_division_level_2_name},{' '}
                        {area.administrative_division_level_1_name}{' '}
                        {area.postal_code}
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}
          </div>
          <label className="flex items-center gap-2 text-sm text-black/70 cursor-pointer">
            <input
              type="checkbox"
              checked={form.saveToProfile}
              onChange={(e) => setForm((f) => ({ ...f, saveToProfile: e.target.checked }))}
              className="accent-primary"
            />
            Simpan ke profil
          </label>
          {form.saveToProfile && (
            <label className="flex items-center gap-2 text-sm text-black/70 cursor-pointer">
              <input
                type="checkbox"
                checked={form.isDefault}
                onChange={(e) => setForm((f) => ({ ...f, isDefault: e.target.checked }))}
                className="accent-primary"
              />
              Jadikan alamat utama
            </label>
          )}
          <div className="flex gap-2 pt-1">
            <button
              onClick={() => { setShowForm(false); setForm(emptyForm); setAreaKeyword(''); }}
              className="flex-1 py-2.5 border border-gray-200 rounded-full text-sm text-black/70 hover:bg-gray-100 transition"
            >
              Batal
            </button>
            <button
              onClick={handleConfirmNew}
              disabled={saving || !form.recipientName || !form.phone || !form.street || !form.areaId}
              className="flex-1 py-2.5 bg-gradient-to-br from-[#4F68AF] to-[#2B3A67] text-white text-sm rounded-full disabled:opacity-50 transition"
            >
              {saving ? 'Menyimpan...' : 'Gunakan Alamat Ini'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
