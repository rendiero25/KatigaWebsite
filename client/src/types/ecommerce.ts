export interface ShippingAddress {
  recipientName: string;
  phone: string;
  street: string;
  city: string;
  province: string;
  postalCode: string;
  areaId: string;
  areaName: string;
}

export interface SavedAddress {
  _id: string;
  label: string;
  recipientName: string;
  phone: string;
  street: string;
  city: string;
  province: string;
  postalCode: string;
  areaId: string;
  areaName: string;
  isDefault: boolean;
}

export interface VoucherValidation {
  valid: boolean;
  voucherId?: string;
  discountAmount?: number;
  message: string;
}

export interface CustomerProfile {
  _id: string;
  name: string;
  email: string;
  phone: string;
  avatar?: string;
  googleId?: string;
  defaultAddress?: ShippingAddress;
}

export interface CartItem {
  productId: string;
  name: string;
  image: string;
  priceNumeric: number;
  weightGrams: number;
  quantity: number;
  originalPrice?: number;
  discountPercent?: number;
  categoryId?: string;
}

export interface BiteshipArea {
  area_id: string;
  name: string;
  country_name: string;
  country_code: string;
  administrative_division_level_1_name: string;
  administrative_division_level_2_name: string;
  administrative_division_level_3_name: string;
  postal_code: string;
}

export interface ShippingRate {
  courier_name: string;
  courier_code: string;
  courier_service_name: string;
  courier_service_code: string;
  type: string;
  description: string;
  duration: string;
  price: number;
}

export interface OrderItem {
  product: string;
  name: string;
  image: string;
  priceNumeric: number;
  weightGrams: number;
  quantity: number;
  subtotal: number;
}

export interface Order {
  _id: string;
  customer: string;
  customerSnapshot: { name: string; email: string; phone: string };
  items: OrderItem[];
  subtotal: number;
  shippingCost: number;
  voucherCode: string;
  voucherDiscount: number;
  total: number;
  shippingAddress: ShippingAddress;
  shippingCourier: string;
  shippingService: string;
  shippingServiceName: string;
  estimatedDays: string;
  paymentStatus: 'pending' | 'paid' | 'failed' | 'expired' | 'refunded';
  orderStatus: 'awaiting_payment' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  midtransOrderId: string;
  midtransToken: string;
  midtransPaymentType?: string;
  biteshipOrderId?: string;
  biteshipTrackingCode?: string;
  biteshipWaybillId?: string;
  adminNote?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateOrderPayload {
  items: Array<{ productId: string; quantity: number }>;
  shippingAddress: ShippingAddress;
  shippingCourier: string;
  shippingService: string;
  shippingServiceName: string;
  shippingCost: number;
  estimatedDays: string;
  voucherCode?: string;
  voucherDiscount?: number;
}

export interface AdminOrdersParams {
  page?: number;
  limit?: number;
  orderStatus?: string;
  paymentStatus?: string;
  search?: string;
  from?: string;
  to?: string;
}

export interface Pagination {
  total: number;
  page: number;
  pages: number;
  limit: number;
}

export interface WishlistProduct {
  _id: string;
  name: string;
  image: string;
  images: string[];
  priceNumeric: number;
}

export interface Review {
  _id: string;
  product: string;
  customer: { _id: string; name: string; avatar?: string };
  order: string;
  rating: number;
  comment: string;
  photos: string[];
  isVisible: boolean;
  createdAt: string;
}

export interface ReviewsResponse {
  reviews: Review[];
  total: number;
  page: number;
  pages: number;
  ratingAvg: number;
  ratingDistribution: { 1: number; 2: number; 3: number; 4: number; 5: number };
}

export interface CanReviewResponse {
  canReview: boolean;
  alreadyReviewed: boolean;
}
