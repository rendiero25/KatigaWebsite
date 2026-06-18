/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import api from '../services/api';
import type { WishlistProduct, SavedAddress, VoucherValidation, ReportsSummary, ReportsRange, ShippingSettings, Order, CartItem, ItemDimensions } from '../types/ecommerce';
import { getCartCount, clearCart, normalizeDimensions, syncCartItems } from '../utils/cart';

interface CartProductPromotion {
  _id: string;
  name: string;
  discountPercent: number;
}

interface CartProductVariant {
  _id: string;
  name: string;
  price: number;
  weightGrams: number;
  dimensions?: ItemDimensions;
}

interface CartProductSnapshot {
  _id: string;
  name: string;
  image?: string;
  images?: string[];
  category?: { _id: string; name: string } | string | null;
  priceNumeric: number;
  weightGrams: number;
  dimensions?: ItemDimensions;
  variants?: CartProductVariant[];
  activePromotion?: CartProductPromotion | null;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const isCartProductSnapshot = (value: unknown): value is CartProductSnapshot =>
  isRecord(value) &&
  typeof value._id === 'string' &&
  typeof value.name === 'string';

const resolvePositiveNumber = (value: unknown): number | null => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

const resolveShippingWeight = (primaryValue: unknown, fallbackValue: unknown): number =>
  resolvePositiveNumber(primaryValue) ?? resolvePositiveNumber(fallbackValue) ?? 100;

const applyPromotionPrice = (
  priceNumeric: number,
  promotion?: CartProductPromotion | null
): number => {
  if (!promotion?.discountPercent) {
    return priceNumeric;
  }

  return Math.max(
    0,
    Math.round(priceNumeric * (1 - Number(promotion.discountPercent) / 100))
  );
};

const getCategoryId = (
  category: CartProductSnapshot['category']
): string | undefined => {
  if (typeof category === 'string') {
    return category;
  }

  if (category && typeof category._id === 'string') {
    return category._id;
  }

  return undefined;
};

const buildLiveCartItem = (
  item: CartItem,
  product: CartProductSnapshot
): CartItem => {
  const matchedVariant = item.variantId
    ? product.variants?.find((variant) => variant._id === item.variantId)
    : undefined;

  if (item.variantId && !matchedVariant) {
    throw new Error(`Varian untuk ${item.name} sudah tidak tersedia. Hapus item ini lalu coba lagi.`);
  }

  const basePrice =
    resolvePositiveNumber(matchedVariant?.price) ??
    resolvePositiveNumber(product.priceNumeric) ??
    0;
  const priceNumeric = applyPromotionPrice(basePrice, product.activePromotion);

  if (priceNumeric <= 0) {
    throw new Error(`Harga untuk ${product.name} belum tersedia. Hapus item ini lalu coba lagi.`);
  }

  return {
    ...item,
    name: matchedVariant ? `${product.name} - ${matchedVariant.name}` : product.name,
    image: product.image || product.images?.[0] || item.image,
    priceNumeric,
    weightGrams: resolveShippingWeight(matchedVariant?.weightGrams, product.weightGrams),
    dimensions: normalizeDimensions(matchedVariant?.dimensions, product.dimensions),
    variantName: matchedVariant?.name,
    originalPrice: product.activePromotion ? basePrice : undefined,
    discountPercent: product.activePromotion?.discountPercent,
    categoryId: getCategoryId(product.category) ?? item.categoryId,
  };
};

export function useCartCount() {
  const [count, setCount] = useState(() => {
    if (!localStorage.getItem('customerToken')) {
      clearCart();
      return 0;
    }
    return getCartCount();
  });
  useEffect(() => {
    const handler = () => setCount(getCartCount());
    window.addEventListener('cartUpdated', handler);
    return () => window.removeEventListener('cartUpdated', handler);
  }, []);
  return count;
}

export function useLiveCart(sourceCart: CartItem[]) {
  const [data, setData] = useState<CartItem[]>(sourceCart);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [issuesByCartItemId, setIssuesByCartItemId] = useState<Record<string, string>>({});
  const latestRequestIdRef = useRef(0);

  const refresh = useCallback(async () => {
    const requestId = latestRequestIdRef.current + 1;
    latestRequestIdRef.current = requestId;

    setError(null);
    setIssuesByCartItemId({});

    if (!sourceCart.length) {
      setLoading(false);
      setHydrated(true);
      return;
    }

    setLoading(true);

    try {
      const uniqueProductIds = [...new Set(sourceCart.map((item) => item.productId))];
      const responses = await Promise.all(
        uniqueProductIds.map((productId) =>
          api.getProduct(productId).catch(() => null)
        )
      );

      if (latestRequestIdRef.current !== requestId) {
        return;
      }

      const productsById = new Map<string, CartProductSnapshot>();
      const missingProductIds = new Set<string>();
      const failedProductIds = new Set<string>();

      responses.forEach((response, index) => {
        const productId = uniqueProductIds[index];

        if (isCartProductSnapshot(response)) {
          productsById.set(response._id, response);
          return;
        }

        if (isRecord(response) && response.message === 'Product not found') {
          missingProductIds.add(productId);
          return;
        }

        failedProductIds.add(productId);
      });
      const syncErrors: string[] = [];
      const nextIssuesByCartItemId: Record<string, string> = {};
      const liveCart = sourceCart.map((item) => {
        const product = productsById.get(item.productId);
        if (!product) {
          const message =
            missingProductIds.has(item.productId)
              ? `Produk ${item.name} sudah tidak tersedia. Periksa kembali keranjang kamu.`
              : failedProductIds.has(item.productId)
                ? `Gagal memuat data terbaru untuk ${item.name}. Coba lagi.`
                : `Produk ${item.name} sudah tidak tersedia. Periksa kembali keranjang kamu.`;
          syncErrors.push(message);
          nextIssuesByCartItemId[item.cartItemId] = message;
          return item;
        }

        try {
          return buildLiveCartItem(item, product);
        } catch (err) {
          const message =
            err instanceof Error ? err.message : `Gagal sinkronkan item ${item.name}.`;
          syncErrors.push(message);
          nextIssuesByCartItemId[item.cartItemId] = message;
          return item;
        }
      });

      setData(liveCart);
      syncCartItems(liveCart);
      setHydrated(true);
      setIssuesByCartItemId(nextIssuesByCartItemId);

      if (!syncErrors.length) {
        setError(null);
      } else {
        const uniqueErrors = [...new Set(syncErrors)];
        setError(
          uniqueErrors.length === 1
            ? uniqueErrors[0]
            : 'Beberapa item gagal disinkronkan. Periksa kembali keranjang kamu lalu coba lagi.'
        );
      }
    } catch (err) {
      if (latestRequestIdRef.current !== requestId) {
        return;
      }

      setHydrated(true);
      setIssuesByCartItemId(
        Object.fromEntries(
          sourceCart.map((item) => [
            item.cartItemId,
            'Gagal sinkronkan data keranjang terbaru.',
          ])
        )
      );
      setError(
        err instanceof Error ? err.message : 'Gagal sinkronkan data keranjang terbaru.'
      );
    } finally {
      if (latestRequestIdRef.current === requestId) {
        setLoading(false);
      }
    }
  }, [sourceCart]);

  useEffect(() => {
    latestRequestIdRef.current += 1;
    setData(sourceCart);
    if (!sourceCart.length) {
      setHydrated(true);
      setIssuesByCartItemId({});
      setError(null);
      return;
    }
    setHydrated(false);
  }, [sourceCart]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    return () => {
      latestRequestIdRef.current += 1;
    };
  }, []);

  return { data, loading, error, refresh, hydrated, issuesByCartItemId };
}

export function useSiteSettings() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getSiteSettings().then(setData).finally(() => setLoading(false));
  }, []);

  return { data, loading };
}

export function useHero() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getHero().then(setData).finally(() => setLoading(false));
  }, []);

  return { data, loading };
}

export function usePartners() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getPartners().then(setData).finally(() => setLoading(false));
  }, []);

  return { data, loading };
}

export function useAdvantages() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getAdvantages().then(setData).finally(() => setLoading(false));
  }, []);

  return { data, loading };
}

export function useAdvantagesSection() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getAdvantagesSection().then(setData).finally(() => setLoading(false));
  }, []);

  return { data, loading };
}

export function useProducts(params?: { category?: string; featured?: boolean }) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    api.getProducts(params).then(setData).finally(() => setLoading(false));
  }, [params?.category, params?.featured]); // eslint-disable-line react-hooks/exhaustive-deps

  return { data, loading };
}

export function useCategories() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getCategories().then(setData).finally(() => setLoading(false));
  }, []);

  return { data, loading };
}

export function useContactInfo() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getContactInfo().then(setData).finally(() => setLoading(false));
  }, []);

  return { data, loading };
}

export function useFooter() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getFooter().then(setData).finally(() => setLoading(false));
  }, []);

  return { data, loading };
}


export function useNews(page = 1, limit = 12, search = "", category = "", sort = "newest") {
  const [data, setData] = useState<any[]>([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 12, pages: 1 });
  const [loading, setLoading] = useState(true);
  const [debouncedSearch, setDebouncedSearch] = useState(search);

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 500);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    api.getNews({ page, limit, search: debouncedSearch, category, sort })
      .then((res) => {
        if (res.data) {
          setData(res.data);
          setPagination(res.pagination);
        } else {
          setData(res);
        }
      })
      .finally(() => setLoading(false));
  }, [page, limit, debouncedSearch, category, sort]);

  return { data, pagination, loading };
}

export function useNewsSection() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getNewsSection().then(setData).finally(() => setLoading(false));
  }, []);

  return { data, loading };
}

export function useCertificationTech() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getCertificationTech().then(setData).finally(() => setLoading(false));
  }, []);

  return { data, loading };
}

export function useDistribution() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getDistribution().then(setData).finally(() => setLoading(false));
  }, []);

  return { data, loading };
}

export function useManufacturing() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getManufacturing().then(setData).finally(() => setLoading(false));
  }, []);

  return { data, loading };
}

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
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    api.getAdminCustomers(params)
      .then(setData)
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [params?.search, params?.page, params?.limit]); // eslint-disable-line react-hooks/exhaustive-deps

  return { data, loading, error };
}

export function useReportsSummary(range: ReportsRange) {
  const [data, setData] = useState<ReportsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    api.getReportsSummary(range)
      .then(setData)
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [range]);

  return { data, loading, error };
}

export function useMyOrders() {
  const [data, setData] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true)
    api.getMyOrders()
      .then((res) => setData(Array.isArray(res) ? res : []))
      .finally(() => setLoading(false))
  }, [])

  return { data, loading }
}

export function useWishlist() {
  const [wishlist, setWishlist] = useState<WishlistProduct[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!localStorage.getItem('customerToken')) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true)
    api.getWishlist()
      .then(d => setWishlist(d.wishlist ?? []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const wishlistIds = useMemo(() => new Set(wishlist.map(p => p._id)), [wishlist])

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
    let removed: WishlistProduct | undefined
    setWishlist(prev => {
      removed = prev.find(p => p._id === productId)
      return prev.filter(p => p._id !== productId)
    })
    await api.removeFromWishlist(productId).catch(() => {
      if (removed) setWishlist(prev => [...prev, removed!])
    })
  }, [])

  return { wishlist, wishlistIds, loading, add, remove }
}

export function useProductReviews(productId: string) {
  const [reviews, setReviews] = useState<import('../types/ecommerce').Review[]>([]);
  const [meta, setMeta] = useState<{
    total: number; pages: number; page: number;
    ratingAvg: number;
    ratingDistribution: { 1: number; 2: number; 3: number; 4: number; 5: number };
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);

  useEffect(() => {
    if (!productId) return;
    setLoading(true);
    api.getProductReviews(productId, 1)
      .then((data) => {
        setReviews(data.reviews);
        setMeta({ total: data.total, pages: data.pages, page: data.page, ratingAvg: data.ratingAvg, ratingDistribution: data.ratingDistribution });
        setPage(1);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [productId]);

  const loadMore = useCallback(async () => {
    if (!meta || page >= meta.pages) return;
    const next = page + 1;
    setLoadingMore(true);
    try {
      const data = await api.getProductReviews(productId, next);
      setReviews((prev) => [...prev, ...data.reviews]);
      setPage(next);
      setMeta((prev) => prev ? { ...prev, page: next } : prev);
    } finally {
      setLoadingMore(false);
    }
  }, [productId, page, meta]);

  return { reviews, meta, loading, loadingMore, loadMore };
}

export function usePromotions() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(() => {
    setLoading(true);
    api.getPromotions().then(setData).finally(() => setLoading(false));
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { refetch(); }, [refetch]);

  return { data, loading, refetch };
}

export function useActivePromotions() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getActivePromotions().then(setData).finally(() => setLoading(false));
  }, []);

  return { data, loading };
}

export function useCustomerAddresses() {
  const [addresses, setAddresses] = useState<SavedAddress[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getCustomerAddresses();
      setAddresses(data);
    } catch {
      setAddresses([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const addAddress = async (data: Omit<SavedAddress, '_id'>): Promise<SavedAddress> => {
    const result = await api.addCustomerAddress(data);
    await refresh();
    return result;
  };

  const updateAddress = async (id: string, data: Partial<SavedAddress>): Promise<SavedAddress> => {
    const result = await api.updateCustomerAddress(id, data);
    await refresh();
    return result;
  };

  const deleteAddress = async (id: string): Promise<void> => {
    await api.deleteCustomerAddress(id);
    setAddresses((prev) => prev.filter((a) => a._id !== id));
  };

  const setDefault = async (id: string): Promise<void> => {
    await api.setDefaultAddress(id);
    setAddresses((prev) => prev.map((a) => ({ ...a, isDefault: a._id === id })));
  };

  return { addresses, loading, addAddress, updateAddress, deleteAddress, setDefault, refresh };
}

export function useShippingSettings() {
  const [data, setData] = useState<ShippingSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await api.getShippingSettings();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat pengaturan pengiriman');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const save = useCallback(async (payload: {
    enabledCouriers: string[];
    emptyStateMessage: string;
  }): Promise<ShippingSettings> => {
    setSaving(true);
    setError(null);
    try {
      const result = await api.updateShippingSettings(payload);
      setData(result);
      return result;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Gagal menyimpan pengaturan pengiriman';
      setError(message);
      throw err;
    } finally {
      setSaving(false);
    }
  }, []);

  return { data, loading, saving, error, refresh, save };
}

export function useVoucher() {
  const [voucher, setVoucher] = useState<VoucherValidation | null>(null);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const apply = async (code: string, subtotal: number): Promise<void> => {
    setApplying(true);
    setError(null);
    try {
      const result = await api.validateVoucher(code, subtotal);
      if (result.valid) {
        setVoucher(result);
      } else {
        setError(result.message);
        setVoucher(null);
      }
    } catch {
      setError('Gagal memvalidasi voucher');
    } finally {
      setApplying(false);
    }
  };

  const clear = () => {
    setVoucher(null);
    setError(null);
  };

  return { voucher, applying, error, apply, clear };
}
