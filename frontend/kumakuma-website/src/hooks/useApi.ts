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


export function useNews() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getNews().then(setData).finally(() => setLoading(false));
  }, []);

  return { data, loading };
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
