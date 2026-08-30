import { Product, Category, Review } from '../types';

export const categories: Category[] = [
  {
    id: '1',
    name: 'Electronics',
    image: 'https://images.unsplash.com/photo-1498049794561-7780e7231661?w=400&h=300&fit=crop',
    productCount: 156
  },
  {
    id: '2',
    name: 'Fashion',
    image: 'https://images.unsplash.com/photo-1445205170230-053b83016050?w=400&h=300&fit=crop',
    productCount: 234
  },
  {
    id: '3',
    name: 'Home & Living',
    image: 'https://images.unsplash.com/photo-1484101403633-562f891dc89a?w=400&h=300&fit=crop',
    productCount: 89
  },
  {
    id: '4',
    name: 'Beauty',
    image: 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=400&h=300&fit=crop',
    productCount: 112
  },
  {
    id: '5',
    name: 'Accessories',
    image: 'https://images.unsplash.com/photo-1523170335258-f5ed11844a49?w=400&h=300&fit=crop',
    productCount: 78
  },
  {
    id: '6',
    name: 'Gadgets',
    image: 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=400&h=300&fit=crop',
    productCount: 145
  }
];

export const products: Product[] = [
  {
    id: '1',
    name: 'Premium Wireless Headphones',
    description: 'Experience crystal-clear audio with our premium wireless headphones featuring active noise cancellation and 30-hour battery life.',
    price: 199.99,
    originalPrice: 249.99,
    discount: 20,
    image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&h=400&fit=crop',
    images: [
      'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&h=600&fit=crop',
      'https://images.unsplash.com/photo-1583394838336-acd977736f90?w=600&h=600&fit=crop',
      'https://images.unsplash.com/photo-1484704849700-f032a568e944?w=600&h=600&fit=crop'
    ],
    category: 'Electronics',
    rating: 4.8,
    reviews: 234,
    colors: ['#000000', '#FFFFFF', '#5A3825'],
    sizes: [],
    inStock: true,
    isBestSeller: true
  },
  {
    id: '2',
    name: 'Classic Leather Watch',
    description: 'Elegant timepiece with genuine leather strap and sapphire crystal glass. Water-resistant up to 50 meters.',
    price: 299.99,
    originalPrice: 399.99,
    discount: 25,
    image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&h=400&fit=crop',
    images: [
      'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&h=600&fit=crop',
      'https://images.unsplash.com/photo-1522312346375-d1a52e2b99b3?w=600&h=600&fit=crop'
    ],
    category: 'Accessories',
    rating: 4.9,
    reviews: 189,
    colors: ['#5A3825', '#000000', '#8B5E3C'],
    sizes: ['40mm', '42mm', '44mm'],
    inStock: true,
    isBestSeller: true
  },
  {
    id: '3',
    name: 'Minimalist Leather Bag',
    description: 'Handcrafted leather bag with multiple compartments. Perfect for work and everyday use.',
    price: 149.99,
    image: 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=400&h=400&fit=crop',
    images: [
      'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=600&h=600&fit=crop',
      'https://images.unsplash.com/photo-1566150905458-1bf1fc113f0d?w=600&h=600&fit=crop'
    ],
    category: 'Fashion',
    rating: 4.7,
    reviews: 156,
    colors: ['#5A3825', '#000000', '#D4B896'],
    sizes: ['Small', 'Medium', 'Large'],
    inStock: true,
    isNew: true
  },
  {
    id: '4',
    name: 'Smart Home Speaker',
    description: 'Voice-controlled smart speaker with premium sound quality and smart home integration.',
    price: 129.99,
    originalPrice: 179.99,
    discount: 28,
    image: 'https://images.unsplash.com/photo-1589492477829-5e65395b66cc?w=400&h=400&fit=crop',
    images: [
      'https://images.unsplash.com/photo-1589492477829-5e65395b66cc?w=600&h=600&fit=crop',
      'https://images.unsplash.com/photo-1543512214-318c7553f230?w=600&h=600&fit=crop'
    ],
    category: 'Electronics',
    rating: 4.6,
    reviews: 312,
    colors: ['#FFFFFF', '#000000'],
    sizes: [],
    inStock: true,
    isBestSeller: true
  },
  {
    id: '5',
    name: 'Organic Skincare Set',
    description: 'Complete skincare routine with organic ingredients. Includes cleanser, toner, and moisturizer.',
    price: 89.99,
    image: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=400&h=400&fit=crop',
    images: [
      'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=600&h=600&fit=crop',
      'https://images.unsplash.com/photo-1570194065650-d99fb4b38b15?w=600&h=600&fit=crop'
    ],
    category: 'Beauty',
    rating: 4.8,
    reviews: 267,
    colors: [],
    sizes: [],
    inStock: true,
    isNew: true
  },
  {
    id: '6',
    name: 'Ceramic Vase Collection',
    description: 'Handcrafted ceramic vases with modern minimalist design. Perfect for home decoration.',
    price: 59.99,
    image: 'https://images.unsplash.com/photo-1578500494198-246f612d3b3d?w=400&h=400&fit=crop',
    images: [
      'https://images.unsplash.com/photo-1578500494198-246f612d3b3d?w=600&h=600&fit=crop',
      'https://images.unsplash.com/photo-1612196808214-b8e1d6145a8c?w=600&h=600&fit=crop'
    ],
    category: 'Home & Living',
    rating: 4.5,
    reviews: 98,
    colors: ['#FFFFFF', '#5A3825', '#D4B896'],
    sizes: ['Small', 'Medium'],
    inStock: true
  },
  {
    id: '7',
    name: 'Wireless Charging Pad',
    description: 'Fast wireless charging pad compatible with all Qi-enabled devices. Sleek and compact design.',
    price: 49.99,
    originalPrice: 69.99,
    discount: 29,
    image: 'https://images.unsplash.com/photo-1586816879360-004f5b0c51e5?w=400&h=400&fit=crop',
    images: [
      'https://images.unsplash.com/photo-1586816879360-004f5b0c51e5?w=600&h=600&fit=crop',
      'https://images.unsplash.com/photo-1591815302525-756a9bcc3425?w=600&h=600&fit=crop'
    ],
    category: 'Gadgets',
    rating: 4.7,
    reviews: 423,
    colors: ['#FFFFFF', '#000000'],
    sizes: [],
    inStock: true,
    isBestSeller: true
  },
  {
    id: '8',
    name: 'Premium Sunglasses',
    description: 'UV-protected polarized sunglasses with lightweight titanium frame. Classic aviator style.',
    price: 179.99,
    image: 'https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=400&h=400&fit=crop',
    images: [
      'https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=600&h=600&fit=crop',
      'https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=600&h=600&fit=crop'
    ],
    category: 'Accessories',
    rating: 4.6,
    reviews: 178,
    colors: ['#000000', '#8B5E3C', '#D4B896'],
    sizes: [],
    inStock: true,
    isNew: true
  },
  {
    id: '9',
    name: 'Linen Throw Blanket',
    description: 'Soft and breathable linen throw blanket. Perfect for cozy evenings and home decoration.',
    price: 79.99,
    image: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=400&h=400&fit=crop',
    images: [
      'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=600&h=600&fit=crop',
      'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=600&h=600&fit=crop'
    ],
    category: 'Home & Living',
    rating: 4.8,
    reviews: 145,
    colors: ['#FFFFFF', '#D4B896', '#5A3825'],
    sizes: [],
    inStock: true
  },
  {
    id: '10',
    name: 'Portable Power Bank',
    description: '20000mAh portable power bank with fast charging. Compact design with LED indicator.',
    price: 39.99,
    originalPrice: 54.99,
    discount: 27,
    image: 'https://images.unsplash.com/photo-1609091839311-d5365f9ff1c5?w=400&h=400&fit=crop',
    images: [
      'https://images.unsplash.com/photo-1609091839311-d5365f9ff1c5?w=600&h=600&fit=crop',
      'https://images.unsplash.com/photo-1594613534629-fa5c6c3e7e9e?w=600&h=600&fit=crop'
    ],
    category: 'Gadgets',
    rating: 4.5,
    reviews: 567,
    colors: ['#FFFFFF', '#000000', '#5A3825'],
    sizes: [],
    inStock: true,
    isBestSeller: true
  },
  {
    id: '11',
    name: 'Silk Scarf Collection',
    description: 'Luxurious 100% silk scarves with elegant patterns. Hand-rolled edges for premium finish.',
    price: 89.99,
    image: 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=400&h=400&fit=crop',
    images: [
      'https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=600&h=600&fit=crop',
      'https://images.unsplash.com/photo-1601924994987-69e26d50dc26?w=600&h=600&fit=crop'
    ],
    category: 'Fashion',
    rating: 4.9,
    reviews: 89,
    colors: ['#5A3825', '#8B5E3C', '#D4B896'],
    sizes: [],
    inStock: true,
    isNew: true
  },
  {
    id: '12',
    name: 'Aromatherapy Diffuser',
    description: 'Ultrasonic aromatherapy diffuser with LED lighting. Whisper-quiet operation with auto shut-off.',
    price: 69.99,
    image: 'https://images.unsplash.com/photo-1602928321679-560bb453f190?w=400&h=400&fit=crop',
    images: [
      'https://images.unsplash.com/photo-1602928321679-560bb453f190?w=600&h=600&fit=crop',
      'https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?w=600&h=600&fit=crop'
    ],
    category: 'Home & Living',
    rating: 4.7,
    reviews: 234,
    colors: ['#FFFFFF', '#5A3825', '#000000'],
    sizes: [],
    inStock: true
  }
];

export const reviews: Review[] = [
  {
    id: '1',
    customerName: 'Sarah Johnson',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop',
    rating: 5,
    review: 'Absolutely love this product! The quality exceeded my expectations. Fast shipping and excellent customer service.',
    productPurchased: 'Premium Wireless Headphones',
    date: '2 days ago'
  },
  {
    id: '2',
    customerName: 'Michael Chen',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop',
    rating: 5,
    review: 'Best purchase I made this year. The design is elegant and the functionality is perfect. Highly recommend!',
    productPurchased: 'Classic Leather Watch',
    date: '1 week ago'
  },
  {
    id: '3',
    customerName: 'Emily Davis',
    avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop',
    rating: 4,
    review: 'Great quality for the price. The leather is soft and the craftsmanship is excellent. Will buy again.',
    productPurchased: 'Minimalist Leather Bag',
    date: '2 weeks ago'
  },
  {
    id: '4',
    customerName: 'James Wilson',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop',
    rating: 5,
    review: 'The sound quality is incredible. Battery life is amazing and the noise cancellation works perfectly.',
    productPurchased: 'Smart Home Speaker',
    date: '3 weeks ago'
  }
];
