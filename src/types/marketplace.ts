export type UserRole = 'customer' | 'business' | 'driver' | 'admin';

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  avatar?: string;
  createdAt: Date;
}

export interface Business {
  id: string;
  ownerId: string;
  name: string;
  description: string;
  logo?: string;
  coverImage?: string;
  category: BusinessCategory;
  region: string;
  city: string;
  area: string;
  digitalAddress?: string;
  pickupLocation: string;
  phone: string;
  email: string;
  socialLinks?: {
    facebook?: string;
    instagram?: string;
    twitter?: string;
    whatsapp?: string;
  };
  openingHours: {
    [key: string]: { open: string; close: string; closed?: boolean };
  };
  verificationStatus: 'pending' | 'submitted' | 'under_review' | 'approved' | 'rejected';
  verificationDocuments?: {
    ghanaCard?: string;
    businessRegistration?: string;
  };
  storeUrl: string;
  rating: number;
  reviewCount: number;
  followerCount: number;
  productCount: number;
  orderCount: number;
  status: 'live' | 'pending' | 'suspended';
  deliveryOptions: DeliveryOption[];
  paymentMethods: PaymentMethod[];
  createdAt: Date;
}

export type BusinessCategory = 
  | 'Electronics'
  | 'Fashion'
  | 'Beauty'
  | 'Food'
  | 'Groceries'
  | 'Home & Kitchen'
  | 'Phones & Accessories'
  | 'Automotive'
  | 'Computer & Technology'
  | 'Health & Personal Care'
  | 'Sports'
  | 'Baby & Kids'
  | 'Books & Education'
  | 'Construction'
  | 'Agriculture'
  | 'Services'
  | 'Other';

export type DeliveryOption = 'nkay_delivery' | 'business_delivery' | 'customer_pickup';

export type PaymentMethod = {
  type: 'mobile_money' | 'bank_account';
  provider?: string;
  accountNumber: string;
  accountName: string;
};

export interface Product {
  id: string;
  businessId: string;
  name: string;
  description: string;
  category: BusinessCategory;
  price: number;
  discountPrice?: number;
  images: string[];
  stock: number;
  sku?: string;
  variations?: ProductVariation[];
  weight?: number;
  deliveryInfo?: string;
  status: 'active' | 'draft' | 'out_of_stock' | 'pending_approval';
  rating: number;
  reviewCount: number;
  salesCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProductVariation {
  name: string;
  options: string[];
}

export interface Order {
  id: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  businessId: string;
  businessName: string;
  items: OrderItem[];
  subtotal: number;
  deliveryFee: number;
  nkayFee: number;
  total: number;
  businessEarnings: number;
  orderStatus: OrderStatus;
  paymentStatus: PaymentStatus;
  paymentMethod: string;
  deliveryAddress: DeliveryAddress;
  deliveryStatus: DeliveryStatus;
  deliveryOption: DeliveryOption;
  driverId?: string;
  estimatedDelivery?: Date;
  actualDelivery?: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface OrderItem {
  productId: string;
  productName: string;
  productImage: string;
  quantity: number;
  price: number;
  variation?: string;
}

export type OrderStatus = 
  | 'new' 
  | 'confirmed' 
  | 'preparing' 
  | 'ready_for_pickup' 
  | 'picked_up' 
  | 'out_for_delivery' 
  | 'delivered' 
  | 'cancelled';

export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded';

export type DeliveryStatus = 
  | 'pending_pickup' 
  | 'picked_up' 
  | 'in_transit' 
  | 'out_for_delivery' 
  | 'delivered' 
  | 'failed';

export interface DeliveryAddress {
  name: string;
  phone: string;
  region: string;
  city: string;
  area: string;
  streetAddress: string;
  digitalAddress?: string;
  landmark?: string;
}

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  avatar?: string;
  location?: string;
  orderCount: number;
  totalSpent: number;
  lastOrderDate?: Date;
  status: 'active' | 'inactive';
  createdAt: Date;
}

export interface DeliveryDriver {
  id: string;
  name: string;
  phone: string;
  email: string;
  avatar?: string;
  vehicleType: string;
  vehicleNumber: string;
  region: string;
  rating: number;
  deliveryCount: number;
  status: 'available' | 'busy' | 'offline';
  currentDelivery?: string;
  totalEarnings: number;
  createdAt: Date;
}

export interface Delivery {
  id: string;
  orderId: string;
  driverId?: string;
  businessId: string;
  businessName: string;
  customerId: string;
  customerName: string;
  pickupLocation: string;
  deliveryLocation: DeliveryAddress;
  deliveryFee: number;
  status: DeliveryStatus;
  estimatedTime?: string;
  actualTime?: Date;
  notes?: string;
  createdAt: Date;
}

export interface Transaction {
  id: string;
  orderId: string;
  businessId: string;
  customerId: string;
  customerName: string;
  amount: number;
  nkayFee: number;
  deliveryFee: number;
  businessEarnings: number;
  status: 'pending' | 'completed' | 'failed';
  type: 'sale' | 'refund' | 'payout';
  createdAt: Date;
}

export interface Payout {
  id: string;
  businessId: string;
  amount: number;
  method: 'mobile_money' | 'bank_transfer';
  accountDetails: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  requestedAt: Date;
  processedAt?: Date;
}

export interface Review {
  id: string;
  orderId: string;
  businessId: string;
  productId?: string;
  customerId: string;
  customerName: string;
  rating: number;
  comment: string;
  response?: string;
  type: 'product' | 'store' | 'delivery';
  createdAt: Date;
}

export interface Promotion {
  id: string;
  businessId: string;
  name: string;
  type: 'discount' | 'promo_code' | 'flash_sale' | 'free_delivery' | 'buy_x_get_y';
  description: string;
  discountValue?: number;
  discountType?: 'percentage' | 'fixed';
  promoCode?: string;
  startDate: Date;
  endDate: Date;
  status: 'active' | 'scheduled' | 'expired' | 'paused';
  usageCount: number;
  maxUsage?: number;
  applicableProducts?: string[];
  minOrderValue?: number;
  createdAt: Date;
}

export interface Notification {
  id: string;
  userId: string;
  role: UserRole;
  title: string;
  message: string;
  type: 'order' | 'payment' | 'product' | 'delivery' | 'review' | 'promotion' | 'verification' | 'system';
  link?: string;
  read: boolean;
  createdAt: Date;
}

export interface Analytics {
  period: string;
  revenue: number;
  orders: number;
  customers: number;
  averageOrderValue: number;
  conversionRate: number;
  storeViews: number;
  productViews: number;
  topProducts: { productId: string; name: string; sales: number }[];
  salesByCategory: { category: string; sales: number }[];
  customerGrowth: number;
  retentionRate: number;
}
