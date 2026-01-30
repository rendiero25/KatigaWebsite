import { useState, useEffect } from 'react';
import api from '../services/api';

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
