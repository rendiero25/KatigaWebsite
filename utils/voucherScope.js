// Perhitungan diskon voucher dipakai di dua tempat: pratinjau di /vouchers/validate
// dan penghitungan ulang saat order dibuat. Keduanya harus memakai rumus yang sama,
// kalau tidak angka di checkout bisa berbeda dari yang ditagih.

/**
 * Subtotal item yang memenuhi cakupan voucher.
 * @param {object} voucher dokumen Voucher
 * @param {Array<{productId?: string, categoryId?: string, subtotal: number}>} items
 * @returns {number}
 */
const eligibleSubtotal = (voucher, items = []) => {
  const appliesTo = voucher?.appliesTo || 'all';

  if (appliesTo === 'all') {
    return items.reduce((sum, i) => sum + Number(i.subtotal || 0), 0);
  }

  const source = appliesTo === 'products' ? voucher.products : voucher.categories;
  const allowed = new Set((source || []).map((v) => String(v)));

  return items.reduce((sum, i) => {
    const key = appliesTo === 'products' ? i.productId : i.categoryId;
    return allowed.has(String(key || '')) ? sum + Number(i.subtotal || 0) : sum;
  }, 0);
};

/**
 * Diskon akhir: dibatasi maxDiscount dan tidak pernah melebihi subtotal yang memenuhi syarat.
 */
const computeVoucherDiscount = (voucher, items = []) => {
  const base = eligibleSubtotal(voucher, items);
  if (base <= 0) return 0;

  let discount = voucher.discountType === 'percent'
    ? Math.round((base * Number(voucher.discountValue)) / 100)
    : Number(voucher.discountValue);

  if (voucher.discountType === 'percent' && voucher.maxDiscount != null && voucher.maxDiscount > 0) {
    discount = Math.min(discount, voucher.maxDiscount);
  }

  return Math.max(0, Math.min(discount, base));
};

const scopeLabel = (voucher) => {
  const appliesTo = voucher?.appliesTo || 'all';
  if (appliesTo === 'all') return 'semua produk';
  if (appliesTo === 'products') return 'produk tertentu';
  return 'kategori tertentu';
};

module.exports = { eligibleSubtotal, computeVoucherDiscount, scopeLabel };
