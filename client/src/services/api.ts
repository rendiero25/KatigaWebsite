import type { WishlistProduct, Review, ReviewsResponse, CanReviewResponse, MyReviewsResponse, SavedAddress, VoucherValidation, CreateOrderPayload, ReportsSummary, ReportsRange, ShippingSettings, ShippingRatesResponse, ProductsReport, CustomersReport, PromotionsReport, NotificationRole, AppNotification, NotificationsResponse, Order, BiteshipTracking } from '../types/ecommerce';

interface ShippingRateRequestItem {
  name: string;
  priceNumeric: number;
  weightGrams: number;
  quantity: number;
  dimensions?: {
    length?: number;
    width?: number;
    height?: number;
  };
}

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

export class UnauthorizedError extends Error {
  constructor(message = 'Sesi berakhir, silakan login kembali') {
    super(message);
    this.name = 'UnauthorizedError';
  }
}

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
  getProducts: async (params?: {
    category?: string;
    featured?: boolean;
    categories?: string;
    exclude?: string;
    limit?: number;
  }) => {
    const query: Record<string, string> = {};
    if (params?.category) query.category = params.category;
    if (params?.featured) query.featured = 'true';
    if (params?.categories) query.categories = params.categories;
    if (params?.exclude) query.exclude = params.exclude;
    if (params?.limit) query.limit = String(params.limit);
    const qs = new URLSearchParams(query).toString();
    const res = await fetch(`${API_BASE_URL}/products${qs ? `?${qs}` : ''}`);
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
      ? `?${new URLSearchParams(params as Record<string, string>).toString()}`
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

  customerGoogleAuth: async (credential: string): Promise<{ token: string; customer: { _id: string; name: string; email: string; phone: string; avatar: string }; isNew: boolean; message?: string }> => {
    const res = await fetch(`${API_BASE_URL}/customers/google`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ credential }),
    });
    if (!res.ok && res.status !== 400 && res.status !== 401) throw new Error('Google auth failed');
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

  uploadCustomerAvatar: async (file: File): Promise<{ avatar?: string; message?: string }> => {
    const token = localStorage.getItem('customerToken');
    const formData = new FormData();
    formData.append('avatar', file);
    const res = await fetch(`${API_BASE_URL}/customers/me/avatar`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });
    return res.json();
  },

  changeCustomerPassword: async (data: { currentPassword?: string; newPassword: string }): Promise<{ message: string }> => {
    const token = localStorage.getItem('customerToken');
    const res = await fetch(`${API_BASE_URL}/customers/me/password`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  getWishlist: async (): Promise<{ wishlist: WishlistProduct[] }> => {
    const token = localStorage.getItem('customerToken');
    const res = await fetch(`${API_BASE_URL}/customers/wishlist`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.status === 401) throw new UnauthorizedError();
    if (!res.ok) throw new Error('Failed to fetch wishlist');
    return res.json();
  },

  addToWishlist: async (productId: string): Promise<void> => {
    const token = localStorage.getItem('customerToken');
    const res = await fetch(`${API_BASE_URL}/customers/wishlist/${productId}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.status === 401) throw new UnauthorizedError();
    if (!res.ok) throw new Error('Failed to add to wishlist');
  },

  removeFromWishlist: async (productId: string): Promise<void> => {
    const token = localStorage.getItem('customerToken');
    const res = await fetch(`${API_BASE_URL}/customers/wishlist/${productId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.status === 401) throw new UnauthorizedError();
    if (!res.ok) throw new Error('Failed to remove from wishlist');
  },

  // Shipping (Biteship)
  searchAreas: async (keyword: string) => {
    const token = localStorage.getItem('customerToken');
    const res = await fetch(`${API_BASE_URL}/shipping/areas?keyword=${encodeURIComponent(keyword)}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Failed to search areas');
    return res.json();
  },

  getShippingRates: async (payload: { destinationAreaId: string; items: ShippingRateRequestItem[] }): Promise<ShippingRatesResponse> => {
    const token = localStorage.getItem('customerToken');
    const res = await fetch(`${API_BASE_URL}/shipping/rates`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const error = await res.json().catch(() => null);
      throw new Error(error?.message || 'Gagal mengambil metode pengiriman');
    }
    return res.json();
  },

  getShippingSettings: async (): Promise<ShippingSettings> => {
    const token = localStorage.getItem('adminToken');
    const res = await fetch(`${API_BASE_URL}/shipping-settings`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.status === 401) throw new UnauthorizedError();
    if (!res.ok) throw new Error('Gagal memuat pengaturan pengiriman');
    return res.json();
  },

  updateShippingSettings: async (data: {
    enabledCouriers: string[];
    emptyStateMessage: string;
  }): Promise<ShippingSettings> => {
    const token = localStorage.getItem('adminToken');
    const res = await fetch(`${API_BASE_URL}/shipping-settings`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });
    if (res.status === 401) throw new UnauthorizedError();
    if (!res.ok) {
      const error = await res.json().catch(() => null);
      throw new Error(error?.message || 'Gagal menyimpan pengaturan pengiriman');
    }
    return res.json();
  },

  // Orders — customer
  createOrder: async (payload: CreateOrderPayload) => {
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

  verifyOrderPayment: async (id: string) => {
    const token = localStorage.getItem('customerToken');
    const res = await fetch(`${API_BASE_URL}/orders/my/${id}/verify-payment`, {
      method: 'POST',
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

  // Reports — admin
  getReportsSummary: async (range: ReportsRange): Promise<ReportsSummary> => {
    const token = localStorage.getItem('adminToken');
    const res = await fetch(`${API_BASE_URL}/reports/summary?range=${range}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Gagal memuat laporan');
    return res.json();
  },

  getProductsReport: async (range: ReportsRange): Promise<ProductsReport> => {
    const token = localStorage.getItem('adminToken');
    const res = await fetch(`${API_BASE_URL}/reports/products?range=${range}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Gagal memuat laporan produk');
    return res.json();
  },

  getCustomersReport: async (range: ReportsRange): Promise<CustomersReport> => {
    const token = localStorage.getItem('adminToken');
    const res = await fetch(`${API_BASE_URL}/reports/customers?range=${range}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Gagal memuat laporan pelanggan');
    return res.json();
  },

  getPromotionsReport: async (range: ReportsRange): Promise<PromotionsReport> => {
    const token = localStorage.getItem('adminToken');
    const res = await fetch(`${API_BASE_URL}/reports/promotions?range=${range}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Gagal memuat laporan promosi');
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

  cancelMyOrder: async (id: string) => {
    const token = localStorage.getItem('customerToken');
    const res = await fetch(`${API_BASE_URL}/orders/my/${id}/cancel`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Gagal membatalkan pesanan');
    }
    return res.json();
  },

  getOrderTracking: async (id: string) => {
    const token = localStorage.getItem('customerToken');
    const res = await fetch(`${API_BASE_URL}/orders/my/${id}/tracking`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Gagal mengambil data tracking');
    }
    return res.json();
  },

  getOrderInvoiceUrl: (id: string) => {
    const token = localStorage.getItem('customerToken');
    return `${API_BASE_URL}/orders/my/${id}/invoice?token=${token}`;
  },

  getAdminInvoiceUrl: (id: string) => {
    const token = localStorage.getItem('adminToken');
    return `${API_BASE_URL}/orders/${id}/invoice?token=${token}`;
  },

  acceptOrder: async (id: string) => {
    const token = localStorage.getItem('adminToken');
    const res = await fetch(`${API_BASE_URL}/orders/${id}/accept`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Gagal menerima pesanan');
    }
    return res.json();
  },

  shipOrder: async (id: string, trackingCode?: string): Promise<Order> => {
    const token = localStorage.getItem('adminToken');
    const res = await fetch(`${API_BASE_URL}/orders/${id}/ship`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(trackingCode ? { trackingCode } : {}),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({})) as { message?: string };
      throw new Error(err.message || 'Gagal mengubah status pengiriman');
    }
    return res.json() as Promise<Order>;
  },

  getAdminOrderTracking: async (id: string): Promise<BiteshipTracking> => {
    const token = localStorage.getItem('adminToken');
    const res = await fetch(`${API_BASE_URL}/orders/${id}/tracking`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({})) as { message?: string };
      throw new Error(err.message || 'Gagal mengambil data tracking');
    }
    return res.json() as Promise<BiteshipTracking>;
  },

  // Complaints — customer
  createComplaint: async (formData: FormData) => {
    const token = localStorage.getItem('customerToken');
    const res = await fetch(`${API_BASE_URL}/complaints`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Gagal membuat komplain');
    }
    return res.json();
  },

  getMyComplaints: async () => {
    const token = localStorage.getItem('customerToken');
    const res = await fetch(`${API_BASE_URL}/complaints/my`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return res.json();
  },

  getMyComplaintByOrder: async (orderId: string) => {
    const token = localStorage.getItem('customerToken');
    const res = await fetch(`${API_BASE_URL}/complaints/my/order/${orderId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return res.json();
  },

  // Complaints — admin
  getAdminComplaints: async (params?: Record<string, string | number>) => {
    const token = localStorage.getItem('adminToken');
    const qs = params ? `?${new URLSearchParams(params as Record<string, string>).toString()}` : '';
    const res = await fetch(`${API_BASE_URL}/complaints${qs}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return res.json();
  },

  getAdminComplaint: async (id: string) => {
    const token = localStorage.getItem('adminToken');
    const res = await fetch(`${API_BASE_URL}/complaints/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return res.json();
  },

  updateComplaint: async (id: string, data: { status?: string; adminNote?: string }) => {
    const token = localStorage.getItem('adminToken');
    const res = await fetch(`${API_BASE_URL}/complaints/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Gagal update komplain');
    }
    return res.json();
  },

  // Admin Customer Management
  getAdminCustomers: async (params?: { search?: string; page?: number; limit?: number }) => {
    const token = localStorage.getItem('adminToken');
    const qs = params ? `?${new URLSearchParams(params as Record<string, string>).toString()}` : '';
    const res = await fetch(`${API_BASE_URL}/admin/customers${qs}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Failed to fetch customers');
    return res.json();
  },

  getAdminCustomer: async (id: string) => {
    const token = localStorage.getItem('adminToken');
    const res = await fetch(`${API_BASE_URL}/admin/customers/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Failed to fetch customer');
    return res.json();
  },

  updateAdminCustomer: async (id: string, data: object) => {
    const token = localStorage.getItem('adminToken');
    const res = await fetch(`${API_BASE_URL}/admin/customers/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to update customer');
    return res.json();
  },

  deleteAdminCustomer: async (id: string) => {
    const token = localStorage.getItem('adminToken');
    const res = await fetch(`${API_BASE_URL}/admin/customers/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Failed to delete customer');
    return res.json();
  },

  resetCustomerPassword: async (id: string, password: string) => {
    const token = localStorage.getItem('adminToken');
    const res = await fetch(`${API_BASE_URL}/admin/customers/${id}/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ password }),
    });
    if (!res.ok) throw new Error('Failed to reset password');
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

  // Reviews
  getProductReviews: async (productId: string, page = 1): Promise<ReviewsResponse> => {
    const res = await fetch(`${API_BASE_URL}/reviews/product/${productId}?page=${page}&limit=10`);
    if (!res.ok) throw new Error('Gagal memuat ulasan');
    return res.json();
  },

  canReview: async (productId: string, orderId: string): Promise<CanReviewResponse> => {
    const token = localStorage.getItem('customerToken');
    const res = await fetch(
      `${API_BASE_URL}/reviews/can-review?productId=${productId}&orderId=${orderId}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (!res.ok) return { canReview: false, alreadyReviewed: false };
    return res.json();
  },

  getMyReviews: async (page = 1): Promise<MyReviewsResponse> => {
    const token = localStorage.getItem('customerToken');
    const res = await fetch(`${API_BASE_URL}/reviews/my?page=${page}&limit=10`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Gagal memuat ulasan');
    return res.json();
  },

  submitReview: async (data: FormData): Promise<Review> => {
    const token = localStorage.getItem('customerToken');
    const res = await fetch(`${API_BASE_URL}/reviews`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: data,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error((err as { message?: string }).message || 'Gagal menyimpan ulasan');
    }
    return res.json();
  },

  // Promotions
  getPromotions: async () => {
    const token = localStorage.getItem('adminToken');
    const res = await fetch(`${API_BASE_URL}/promotions`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Failed to fetch promotions');
    return res.json();
  },

  getActivePromotions: async () => {
    const res = await fetch(`${API_BASE_URL}/promotions/active`);
    if (!res.ok) throw new Error('Failed to fetch active promotions');
    return res.json();
  },

  createPromotion: async (formData: FormData) => {
    const token = localStorage.getItem('adminToken');
    const res = await fetch(`${API_BASE_URL}/promotions`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });
    if (!res.ok) throw new Error('Failed to create promotion');
    return res.json();
  },

  updatePromotion: async (id: string, formData: FormData) => {
    const token = localStorage.getItem('adminToken');
    const res = await fetch(`${API_BASE_URL}/promotions/${id}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });
    if (!res.ok) throw new Error('Failed to update promotion');
    return res.json();
  },

  deletePromotion: async (id: string) => {
    const token = localStorage.getItem('adminToken');
    const res = await fetch(`${API_BASE_URL}/promotions/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Failed to delete promotion');
    return res.json();
  },

  reorderPromotions: async (order: { id: string; displayOrder: number }[]) => {
    const token = localStorage.getItem('adminToken');
    const res = await fetch(`${API_BASE_URL}/promotions/reorder`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(order),
    });
    if (!res.ok) throw new Error('Failed to reorder promotions');
    return res.json();
  },

  togglePromotion: async (id: string): Promise<{ isVisible: boolean }> => {
    const token = localStorage.getItem('adminToken');
    const res = await fetch(`${API_BASE_URL}/promotions/${id}/toggle`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Failed to toggle promotion');
    return res.json();
  },

  // Customer Addresses
  getCustomerAddresses: async (): Promise<SavedAddress[]> => {
    const token = localStorage.getItem('customerToken');
    const res = await fetch(`${API_BASE_URL}/customers/me/addresses`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Failed to fetch addresses');
    return res.json();
  },

  addCustomerAddress: async (data: Omit<SavedAddress, '_id'>): Promise<SavedAddress> => {
    const token = localStorage.getItem('customerToken');
    const res = await fetch(`${API_BASE_URL}/customers/me/addresses`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to add address');
    return res.json();
  },

  updateCustomerAddress: async (id: string, data: Partial<SavedAddress>): Promise<SavedAddress> => {
    const token = localStorage.getItem('customerToken');
    const res = await fetch(`${API_BASE_URL}/customers/me/addresses/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to update address');
    return res.json();
  },

  deleteCustomerAddress: async (id: string): Promise<void> => {
    const token = localStorage.getItem('customerToken');
    const res = await fetch(`${API_BASE_URL}/customers/me/addresses/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Failed to delete address');
  },

  setDefaultAddress: async (id: string): Promise<void> => {
    const token = localStorage.getItem('customerToken');
    const res = await fetch(`${API_BASE_URL}/customers/me/addresses/${id}/default`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Failed to set default address');
  },

  // Vouchers
  validateVoucher: async (code: string, subtotal: number): Promise<VoucherValidation> => {
    const token = localStorage.getItem('customerToken');
    const res = await fetch(`${API_BASE_URL}/vouchers/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ code, subtotal }),
    });
    if (!res.ok) throw new Error('Failed to validate voucher');
    return res.json();
  },

  // Notifications
  getNotifications: async (role: NotificationRole, page = 1): Promise<NotificationsResponse> => {
    const token = localStorage.getItem(role === 'admin' ? 'adminToken' : 'customerToken');
    const base = role === 'admin' ? 'admin' : 'me';
    const res = await fetch(`${API_BASE_URL}/notifications/${base}?page=${page}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Gagal memuat notifikasi');
    return res.json();
  },

  getNotificationUnreadCount: async (role: NotificationRole): Promise<{ count: number }> => {
    const token = localStorage.getItem(role === 'admin' ? 'adminToken' : 'customerToken');
    const base = role === 'admin' ? 'admin' : 'me';
    const res = await fetch(`${API_BASE_URL}/notifications/${base}/unread-count`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Gagal memuat jumlah notifikasi');
    return res.json();
  },

  markNotificationRead: async (role: NotificationRole, id: string): Promise<AppNotification> => {
    const token = localStorage.getItem(role === 'admin' ? 'adminToken' : 'customerToken');
    const base = role === 'admin' ? 'admin' : 'me';
    const res = await fetch(`${API_BASE_URL}/notifications/${base}/${id}/read`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Gagal menandai notifikasi');
    return res.json();
  },

  markAllNotificationsRead: async (role: NotificationRole): Promise<void> => {
    const token = localStorage.getItem(role === 'admin' ? 'adminToken' : 'customerToken');
    const base = role === 'admin' ? 'admin' : 'me';
    const res = await fetch(`${API_BASE_URL}/notifications/${base}/read-all`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Gagal menandai semua notifikasi');
  },

  getNotificationStreamUrl: (role: NotificationRole): string => {
    const token = localStorage.getItem(role === 'admin' ? 'adminToken' : 'customerToken');
    const base = role === 'admin' ? 'admin' : 'me';
    return `${API_BASE_URL}/notifications/${base}/stream?token=${encodeURIComponent(token || '')}`;
  },
};

export default api;
