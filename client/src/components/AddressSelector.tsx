import { useState, useRef, useEffect } from 'react';
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

const inputCls =
  'w-full border border-[#E9E9EA] px-4 py-3 text-sm outline-none focus:border-[#1E1E1E] transition-colors bg-white text-[#1E1E1E] placeholder:text-[#9A9A9A]';
const labelCls = 'uppercase tracking-[0.12em] text-[11px] text-[#6F6F71]';
const primaryBtnCls =
  'flex-1 bg-[#4F68AF] text-white uppercase tracking-[0.18em] text-[13px] px-6 py-3 hover:bg-[#2B3A67] disabled:opacity-50 transition-colors';
const outlineBtnCls =
  'flex-1 border border-[#1E1E1E] text-[#1E1E1E] uppercase tracking-[0.18em] text-[13px] px-6 py-3 hover:bg-[#1E1E1E] hover:text-white transition-colors';

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

  // Satu alamat tersimpan berarti tidak ada yang perlu dipilih — langsung dipakai
  // supaya ongkir bisa dihitung tanpa klik tambahan. Dua atau lebih tetap harus
  // dipilih sendiri, dan pilihan yang sudah ada tidak pernah ditimpa.
  const autoSelectedRef = useRef(false);
  useEffect(() => {
    if (loading || selected || autoSelectedRef.current) return;
    if (addresses.length !== 1) return;
    autoSelectedRef.current = true;
    handleUseAddress(addresses[0]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, addresses, selected]);

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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 border-b border-[#E9E9EA] pb-4">
        <h2 className="text-[13px] uppercase tracking-[0.12em] text-[#1E1E1E]">Alamat Pengiriman</h2>
        {!showForm && (
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="shrink-0 text-[13px] text-[#6F6F71] hover:text-[#1E1E1E] underline transition-colors"
          >
            + Tambah Alamat Baru
          </button>
        )}
      </div>

      {loading ? (
        <div>
          {[1, 2].map((i) => (
            <div key={i} className="border-b border-[#E9E9EA] py-4 space-y-2 last:border-0">
              <div className="h-3 bg-gray-200 animate-pulse w-1/3" />
              <div className="h-3 bg-gray-200 animate-pulse w-2/3" />
            </div>
          ))}
        </div>
      ) : addresses.length === 0 && !showForm ? (
        <p className="text-[13px] text-[#6F6F71] py-2">Belum ada alamat tersimpan.</p>
      ) : (
        <div>
          {addresses.map((addr) => {
            const isSelected =
              selected?.areaId === addr.areaId && selected?.street === addr.street;
            return (
              <div
                key={addr._id}
                className={`border-b border-[#E9E9EA] px-4 py-4 cursor-pointer transition-colors last:border-0 ${isSelected ? 'bg-[#FAFAF9]' : 'hover:bg-[#FAFAF9]'}`}
                onClick={() => handleUseAddress(addr)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 flex-wrap mb-1">
                      {addr.label && (
                        <span className={labelCls}>{addr.label}</span>
                      )}
                      {addr.isDefault && (
                        <span className="border border-[#1E1E1E] text-[11px] uppercase px-2 py-1 text-[#1E1E1E]">
                          Utama
                        </span>
                      )}
                    </div>
                    <p className="text-[13px] uppercase text-[#1E1E1E]">{addr.recipientName}</p>
                    <p className="text-[13px] text-[#6F6F71] leading-relaxed mt-1">{addr.phone}</p>
                    <p className="text-[13px] text-[#6F6F71] leading-relaxed">{addr.street}, {addr.areaName}</p>
                  </div>
                  <div
                    aria-hidden="true"
                    className={`w-4 h-4 border shrink-0 mt-1 ${isSelected ? 'border-[#1E1E1E] bg-[#1E1E1E]' : 'border-[#E9E9EA]'}`}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showForm && (
        <div className="border border-[#E9E9EA] p-6 space-y-4">
          <p className="text-[13px] uppercase tracking-[0.12em] text-[#1E1E1E]">Alamat Baru</p>

          <div className="space-y-1">
            <label htmlFor="as-label" className={labelCls}>Label (contoh: Rumah, Kantor)</label>
            <input
              id="as-label"
              type="text"
              placeholder="Rumah"
              value={form.label}
              onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
              className={inputCls}
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="as-recipient" className={labelCls}>Nama penerima *</label>
            <input
              id="as-recipient"
              type="text"
              placeholder="Nama penerima"
              value={form.recipientName}
              onChange={(e) => setForm((f) => ({ ...f, recipientName: e.target.value }))}
              className={inputCls}
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="as-phone" className={labelCls}>Nomor HP penerima *</label>
            <input
              id="as-phone"
              type="tel"
              placeholder="Nomor HP penerima"
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              className={inputCls}
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="as-street" className={labelCls}>Alamat lengkap (jalan, nomor, RT/RW) *</label>
            <input
              id="as-street"
              type="text"
              placeholder="Alamat lengkap (jalan, nomor, RT/RW)"
              value={form.street}
              onChange={(e) => setForm((f) => ({ ...f, street: e.target.value }))}
              className={inputCls}
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="as-area" className={labelCls}>Kecamatan / Kelurahan *</label>
            <div id="as-area" className="relative">
              {form.areaId ? (
                <div className="border border-[#E9E9EA] bg-[#FAFAF9] p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1 text-[13px]">
                      <p className={`${labelCls} mb-1.5`}>Area terpilih</p>
                      <p className="text-[#1E1E1E]"><span className="text-[#6F6F71] w-24 inline-block">Kecamatan</span>{form.kecamatan}</p>
                      <p className="text-[#1E1E1E]"><span className="text-[#6F6F71] w-24 inline-block">Kota</span>{form.city}</p>
                      <p className="text-[#1E1E1E]"><span className="text-[#6F6F71] w-24 inline-block">Provinsi</span>{form.province}</p>
                      <p className="text-[#1E1E1E]"><span className="text-[#6F6F71] w-24 inline-block">Kode Pos</span>{form.postalCode}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setAreaKeyword('');
                        setAreaResults([]);
                        setForm((f) => ({ ...f, areaId: '', areaName: '', kecamatan: '', city: '', province: '', postalCode: '' }));
                      }}
                      className="text-[13px] text-[#6F6F71] hover:text-[#1E1E1E] underline shrink-0 transition-colors"
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
                    <ul className="absolute z-20 left-0 right-0 bg-white border border-[#E9E9EA] mt-1 max-h-52 overflow-y-auto">
                      {areaResults.map((area) => (
                        <li
                          key={area.area_id}
                          className="px-4 py-3 border-b border-[#E9E9EA] last:border-0 hover:bg-[#FAFAF9] cursor-pointer text-[13px] text-[#1E1E1E] transition-colors"
                          onClick={() => selectArea(area)}
                        >
                          {area.administrative_division_level_3_name},{' '}
                          {area.administrative_division_level_2_name},{' '}
                          {area.administrative_division_level_1_name}{' '}
                          <span className="text-[#6F6F71]">{area.postal_code}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </>
              )}
            </div>
          </div>

          <label className="flex items-center gap-2 text-[13px] text-[#6F6F71] cursor-pointer">
            <input
              type="checkbox"
              checked={form.saveToProfile}
              onChange={(e) => setForm((f) => ({ ...f, saveToProfile: e.target.checked }))}
              className="accent-[#1E1E1E]"
            />
            Simpan ke profil
          </label>
          {form.saveToProfile && (
            <label className="flex items-center gap-2 text-[13px] text-[#6F6F71] cursor-pointer">
              <input
                type="checkbox"
                checked={form.isDefault}
                onChange={(e) => setForm((f) => ({ ...f, isDefault: e.target.checked }))}
                className="accent-[#1E1E1E]"
              />
              Jadikan alamat utama
            </label>
          )}

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={() => { setShowForm(false); setForm(emptyForm); setAreaKeyword(''); }}
              className={outlineBtnCls}
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleConfirmNew}
              disabled={saving || !form.recipientName || !form.phone || !form.street || !form.areaId}
              className={primaryBtnCls}
            >
              {saving ? 'Menyimpan...' : 'Gunakan Alamat Ini'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
