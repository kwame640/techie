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
 * pending     — order created, no wallet prompt sent yet.
 * processing  — Hubtel accepted the request and is prompting the wallet.
 * paid        — Hubtel verified the payment; stock has been reserved.
 * failed      — the wallet declined, cancelled, or the prompt expired.
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
  paymentChannel: 'mobile_money' | null;
  paymentProvider: string | null;
  paymentPhone: string | null;
  paymentReference: string | null;
  hubtelTransactionId: string | null;
  paymentPromptedAt: string | null;
  paymentCheckedAt: string | null;
  paymentAttempts: number;
  amountPaid: number | null;
  paymentVerifiedAt: string | null;
  paymentVerifiedBy: string | null;
  failureReason: string | null;
  orderStatus: 'new' | 'confirmed' | 'cancelled';
  delivery: OrderDelivery;
}

export interface PaymentProviderOption {
  id: string;
  name: string;
}

export interface PaymentSettings {
  method: 'hubtel';
  enabled: boolean;
  providers: PaymentProviderOption[];
  callbackConfigured: boolean;
  missing: string[];
}

export interface AdminPaymentSettings extends PaymentSettings {
  callbackUrl: string | null;
  webhookSecure: boolean;
  channels: Array<{ id: string; name: string; channel: string }>;
}

export interface PaymentStartInput {
  provider: string;
  phone: string;
}

export interface PaymentVerificationResult {
  success: boolean;
  order: OrderView;
  state: 'paid' | 'pending' | 'failed' | 'attention' | 'unavailable';
  message?: string;
}
