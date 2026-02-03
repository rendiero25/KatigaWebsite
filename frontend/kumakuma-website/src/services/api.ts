// Normalize API_BASE_URL to ensure it always ends with /api
const getBaseUrl = () => {
  let url = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
  // Remove trailing slashes
  while (url.endsWith('/')) {
    url = url.slice(0, -1);
  }
  // Append /api if missing
  if (!url.endsWith('/api')) {
    url += '/api';
  }
  return url;
};

const API_BASE_URL = getBaseUrl();

export const api = {
  // Site Settings
  getSiteSettings: async () => {
    const res = await fetch(`${API_BASE_URL}/site-settings`);
    return res.json();
  },

  // Hero Section
  getHero: async () => {
    const res = await fetch(`${API_BASE_URL}/hero`);
    return res.json();
  },

  // Partners
  getPartners: async () => {
    const res = await fetch(`${API_BASE_URL}/partners`);
    return res.json();
  },

  // Advantages
  getAdvantages: async () => {
    const res = await fetch(`${API_BASE_URL}/advantages`);
    return res.json();
  },

  getAdvantagesSection: async () => {
    const res = await fetch(`${API_BASE_URL}/advantages/content`);
    return res.json();
  },

  // Products
  getProducts: async (params?: { category?: string; featured?: boolean }) => {
    const queryString = params ? `?${new URLSearchParams(params as Record<string, string>).toString()}` : '';
    const res = await fetch(`${API_BASE_URL}/products${queryString}`);
    return res.json();
  },

  getProduct: async (id: string) => {
    const res = await fetch(`${API_BASE_URL}/products/${id}`);
    return res.json();
  },

  // Categories
  getCategories: async () => {
    const res = await fetch(`${API_BASE_URL}/categories`);
    return res.json();
  },

  // About Content
  getAboutContent: async () => {
    const res = await fetch(`${API_BASE_URL}/about`);
    return res.json();
  },

  // Certifications
  getCertifications: async () => {
    const res = await fetch(`${API_BASE_URL}/certifications`);
    return res.json();
  },

  // Certification Technology
  getCertificationTech: async () => {
    const res = await fetch(`${API_BASE_URL}/certification-tech`);
    return res.json();
  },

  // Distribution Channel
  getDistribution: async () => {
    const res = await fetch(`${API_BASE_URL}/distribution`);
    return res.json();
  },

  // Manufacturing Section
  getManufacturing: async () => {
    const res = await fetch(`${API_BASE_URL}/manufacturing`);
    return res.json();
  },

  // Catalog
  getCatalog: async () => {
    const res = await fetch(`${API_BASE_URL}/catalog`);
    return res.json();
  },

  // Contact Info
  getContactInfo: async () => {
    const res = await fetch(`${API_BASE_URL}/contact/info`);
    return res.json();
  },

  // Submit Contact Form
  submitContact: async (data: { name: string; email: string; phone: string; subject: string; message: string }) => {
    const res = await fetch(`${API_BASE_URL}/contact/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return res.json();
  },

  getContactPageContent: async () => {
    const res = await fetch(`${API_BASE_URL}/contact-page`);
    return res.json();
  },

  // Footer
  getFooter: async () => {
    const res = await fetch(`${API_BASE_URL}/footer`);
    return res.json();
  },

  // News
  getNews: async (params?: { page?: number; limit?: number; search?: string; category?: string; sort?: string }) => {
    const queryString = params ? `?${new URLSearchParams(params as any).toString()}` : '';
    const res = await fetch(`${API_BASE_URL}/news${queryString}`);
    return res.json();
  },

  getNewsSection: async () => {
    const res = await fetch(`${API_BASE_URL}/news/content`);
    return res.json();
  },

  getNewsDetail: async (id: string) => {
    const res = await fetch(`${API_BASE_URL}/news/${id}`);
    return res.json();
  },

  // Auth
  login: async (email: string, password: string) => {
    const res = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    return res.json();
  },

  // Product Page Settings
  getProductPageSettings: async () => {
    const res = await fetch(`${API_BASE_URL}/product-page`);
    return res.json();
  },

  // Get base URL for images
  getImageUrl: (path: string) => {
    if (!path) return '/placeholder.jpg';
    if (path.startsWith('http')) return path;
    
    // Remove /api from API_BASE_URL to get the root server URL if needed, 
    // or just construct it relative to the domain if hosted appropriately.
    // Assuming API_BASE_URL is like 'https://.../api', we might want the root 'https://...' for static files depending on how they are served.
    // However, the backend serves /uploads relative to root.
    
    const baseUrl = API_BASE_URL.replace('/api', '');
    return `${baseUrl}${path}`;
  }
};

export default api;
