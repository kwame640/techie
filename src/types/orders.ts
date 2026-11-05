export interface OrderLineView {
  productId: string;
  name: string;
  image: string;
  businessId: string;
  businessName: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

export interface OrderQuote {
  currency: string;
  deliveryMethod: 'home' | 'pickup';
  lines: Array<OrderLineView & { businessPhone?: string; pickupLocation?: string; originalUnitPrice?: number | null; availableStock: number }>;
  subtotal: number;
  deliveryFee: number;
  total: number;
}

export interface OrderDelivery {
  method: 'home' | 'pickup';
  region: string;
  city: string;
  area: string;
  streetAddress: string;
  digitalAddress?: string;
  landmark?: string;
  notes?: string;
}

/**
 * pending     — order created; no MoMo request sent yet.
 * processing  — RequestToPay sent; waiting for the customer to approve the PIN prompt.
 * paid        — MTN verified the payment; stock has been reserved.
 * failed      — the payment failed, was declined, or the prompt expired.
 * attention   — money was received but cannot be fulfilled automatically
 *               (stock gone or amount mismatch). Requires a human/refund.
 */
export type OrderPaymentStatus = 'pending' | 'processing' | 'paid' | 'failed' | 'attention';

export interface OrderView {
  id: string;
  orderNumber: string;
  createdAt: string;
  updatedAt: string;
  currency: string;
  customer: { name: string; phone: string; email: string };
  items: OrderLineView[];
  subtotal: number;
  deliveryFee: number;
  total: number;
  paymentStatus: OrderPaymentStatus;
  paymentChannel: 'mtn_momo' | 'mobile_money' | null;
  paymentProvider: string | null;
  /** Payment rail when known, e.g. mtn_momo. */
  paymentMethod: string | null;
  paymentPhone: string | null;
  paymentReference: string | null;
  paymentLink: string | null;
  paymentLinkCreatedAt: string | null;
  paymentLinkExpiresAt: string | null;
  paymentTransactionId: string | null;
  paymentCheckedAt: string | null;
  paymentAttempts: number;
  amountPaid: number | null;
  paymentVerifiedAt: string | null;
  paymentVerifiedBy: string | null;
  failureReason: string | null;
  orderStatus: 'new' | 'confirmed' | 'cancelled';
  delivery: OrderDelivery;
}

export interface PaymentSettings {
  method: 'mtn_momo';
  providerName: string;
  enabled: boolean;
  callbackConfigured: boolean;
  missing: string[];
}

export interface AdminPaymentSettings extends PaymentSettings {
  mode: 'sandbox' | 'live';
  targetEnvironment: string;
  currency: string;
  subscriptionKeySet: boolean;
  userIdSet: boolean;
  apiKeySet: boolean;
  apiBaseUrl: string;
  callbackUrl: string | null;
  callbackHost: string | null;
  callbackSecure: boolean;
  promptMinutes: number;
}

export interface PaymentVerificationResult {
  success: boolean;
  order: OrderView;
  state: 'paid' | 'pending' | 'failed' | 'attention' | 'unavailable';
  message?: string;
}
