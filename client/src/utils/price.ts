interface PriceSource {
  priceNumeric?: number | null;
  price?: string | number | null;
}

// `priceNumeric` hanya terisi kalau admin mengirimnya; produk yang dibuat lewat CMS
// menyimpan angkanya sebagai string di `price` ("88400", "Rp 88.400") dan menyisakan
// priceNumeric 0. Selalu baca harga produk lewat helper ini.
export function resolveProductPrice(product: PriceSource): number {
  const numeric = Number(product.priceNumeric);
  if (Number.isFinite(numeric) && numeric > 0) return numeric;

  const parsed = Number(String(product.price ?? '').replace(/[^\d]/g, ''));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}
