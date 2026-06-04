// Normalize API_BASE_URL to ensure it always ends with /api
const getBaseUrl = () => {
  let url = import.meta.env.VITE_API_URL || "/api";
  // Remove trailing slashes
  while (url.endsWith("/")) {
    url = url.slice(0, -1);
  }
  // Append /api if missing
  if (!url.endsWith("/api")) {
    url += "/api";
  }
  return url;
};

export const API_BASE_URL = getBaseUrl();

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
    const query: Record<string, string> = {};
    if (params?.category) query.category = params.category;
    if (params?.featured !== undefined) query.featured = String(params.featured);
    const queryString = Object.keys(query).length
      ? `?${new URLSearchParams(query).toString()}`
      : "";
    const res = await fetch(`${API_BASE_URL}/products${queryString}`);
    if (!res.ok) throw new Error('Failed to fetch products');
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
  submitContact: async (data: {
    name: string;
    email: string;
    phone: string;
    subject: string;
    message: string;
  }) => {
    const res = await fetch(`${API_BASE_URL}/contact/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
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
  getNews: async (params?: {
    page?: number;
    limit?: number;
    search?: string;
    category?: string;
    sort?: string;
  }) => {
    const queryString = params
      ? `?${new URLSearchParams(params as any).toString()}`
      : "";
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

  // Customer Auth
  customerRegister: async (data: { name: string; email: string; phone: string; password: string }) => {
    const res = await fetch(`${API_BASE_URL}/customers/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  customerLogin: async (email: string, password: string) => {
    const res = await fetch(`${API_BASE_URL}/customers/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    return res.json();
  },

  getCustomerProfile: async () => {
    const token = localStorage.getItem('customerToken');
    const res = await fetch(`${API_BASE_URL}/customers/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return res.json();
  },

  updateCustomerProfile: async (data: object) => {
    const token = localStorage.getItem('customerToken');
    const res = await fetch(`${API_BASE_URL}/customers/me`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  // Shipping (Biteship)
  searchAreas: async (keyword: string) => {
    const token = localStorage.getItem('customerToken');
    const res = await fetch(`${API_BASE_URL}/shipping/areas?keyword=${encodeURIComponent(keyword)}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return res.json();
  },

  getShippingRates: async (payload: { destinationAreaId: string; items: object[] }) => {
    const token = localStorage.getItem('customerToken');
    const res = await fetch(`${API_BASE_URL}/shipping/rates`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload),
    });
    return res.json();
  },

  // Orders — customer
  createOrder: async (payload: object) => {
    const token = localStorage.getItem('customerToken');
    const res = await fetch(`${API_BASE_URL}/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload),
    });
    return res.json();
  },

  getMyOrders: async () => {
    const token = localStorage.getItem('customerToken');
    const res = await fetch(`${API_BASE_URL}/orders/my`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return res.json();
  },

  getMyOrder: async (id: string) => {
    const token = localStorage.getItem('customerToken');
    const res = await fetch(`${API_BASE_URL}/orders/my/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return res.json();
  },

  // Orders — admin
  getAdminOrders: async (params?: Record<string, string | number>) => {
    const token = localStorage.getItem('adminToken');
    const qs = params ? `?${new URLSearchParams(params as Record<string, string>).toString()}` : '';
    const res = await fetch(`${API_BASE_URL}/orders${qs}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return res.json();
  },

  getAdminOrder: async (id: string) => {
    const token = localStorage.getItem('adminToken');
    const res = await fetch(`${API_BASE_URL}/orders/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return res.json();
  },

  updateOrderStatus: async (id: string, data: object) => {
    const token = localStorage.getItem('adminToken');
    const res = await fetch(`${API_BASE_URL}/orders/${id}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  // Admin Auth
  login: async (email: string, password: string) => {
    const res = await fetch(`${API_BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
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
    if (!path) return "/placeholder.jpg";
    if (path.startsWith("http")) return path;

    // Remove /api from API_BASE_URL to get the root server URL if needed,
    // or just construct it relative to the domain if hosted appropriately.
    // Assuming API_BASE_URL is like 'https://.../api', we might want the root 'https://...' for static files depending on how they are served.
    // However, the backend serves /uploads relative to root.

    const baseUrl = API_BASE_URL.replace("/api", "");
    return `${baseUrl}${path}`;
  },
};

export default api;
