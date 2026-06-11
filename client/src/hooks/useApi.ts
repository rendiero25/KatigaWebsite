import { useState, useEffect, useCallback, useMemo } from 'react';
import api from '../services/api';
import type { WishlistProduct } from '../types/ecommerce';
import { getCartCount, clearCart } from '../utils/cart';

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
    setLoading(true);
    api.getProducts(params).then(setData).finally(() => setLoading(false));
  }, [params?.category, params?.featured]);

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
    setLoading(true);
    api.getNews({ page, limit, search: debouncedSearch, category, sort })
      .then((res) => {
        if (res.data) {
          setData(res.data);
          setPagination(res.pagination);
        } else {
          // Fallback for old API response structure if needed
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
    setLoading(true);
    api.getAdminCustomers(params)
      .then(setData)
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [params?.search, params?.page, params?.limit]);

  return { data, loading, error };
}

export function useWishlist() {
  const [wishlist, setWishlist] = useState<WishlistProduct[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!localStorage.getItem('customerToken')) return
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
