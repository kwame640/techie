export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  originalPrice?: number;
  discount?: number;
  image: string;
  images: string[];
  category: string;
  rating: number;
  reviews: number;
  colors: string[];
  sizes: string[];
  inStock: boolean;
  isNew?: boolean;
  isBestSeller?: boolean;
}

export interface CartItem {
  product: Product;
  quantity: number;
  selectedColor?: string;
  selectedSize?: string;
}

export interface Category {
  id: string;
  name: string;
  image: string;
  productCount: number;
}

export interface Review {
  id: string;
  customerName: string;
  avatar: string;
  rating: number;
  review: string;
  productPurchased: string;
  date: string;
}

export interface FilterOptions {
  category: string;
  priceRange: [number, number];
  rating: number;
  sortBy: string;
}
