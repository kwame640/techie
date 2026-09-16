import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  MapPin, Star, Phone, ShoppingCart, Store, Heart,
  Search, Grid, List, Check,
  ArrowLeft, Package, AlertCircle,
} from 'lucide-react';
import { useShop } from '../../context/ShopContext';
import { sampleBusinesses, sampleProducts } from '../../data/marketplaceData';
import { Business, Product as MarketplaceProduct } from '../../types/marketplace';
import type { Product as ShopProduct } from '../../types';
import logoImage from '../../images/nkay.png';

type SortOption = 'price-low' | 'price-high' | 'newest' | 'popularity';

const toShopProduct = (p: MarketplaceProduct): ShopProduct => ({
  id: p.id,
  name: p.name,
  description: p.description,
  price: p.price,
  originalPrice: p.discountPrice,
  image: p.images?.[0] || '/api/placeholder/400/400',
  images: p.images,
  category: p.category,
  rating: p.rating,
  reviews: p.reviewCount,
  colors: [],
  sizes: [],
  inStock: p.stock > 0,
  isNew: p.createdAt && new Date(p.createdAt) > new Date('2024-07-01'),
  isBestSeller: p.salesCount > 100,
  discount: p.discountPrice ? Math.round(((p.price - p.discountPrice) / p.price) * 100) : undefined,
});

const storeNav = [
  { name: 'Home', href: '#home', active: true },
  { name: 'Products', href: '#products' },
  { name: 'Categories', href: '#categories' },
  { name: 'Reviews', href: '#reviews' },
  { name: 'About Store', href: '#about' },
];

export const StorePage = () => {
  const { storeId } = useParams<{ storeId: string }>();
  const { addToCart } = useShop();
  const [business, setBusiness] = useState<Business | null>(null);
  const [searched, setSearched] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>('popularity');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  useEffect(() => {
    const load = async () => {
      const found = sampleBusinesses.find(b => b.id === storeId);
      if (found) {
        setBusiness(found);
      } else {
        try {
          const res = await fetch(`/api/registrations/${storeId}`);
          const data = await res.json();
          if (data.success && data.registration) {
            const reg = data.registration;
            const mapped: Business = {
              id: reg.id,
              ownerId: reg.id,
              name: reg.businessName || '',
              description: reg.description || '',
              logo: reg.storeLogo || '/api/placeholder/100/100',
              coverImage: reg.storeBanner || '/api/placeholder/1200/400',
              category: reg.businessCategory || '',
              city: reg.city || '',
              region: reg.region || '',
              phone: reg.phone || '',
              email: reg.email || '',
              rating: reg.rating || 4.5,
              reviewCount: reg.reviewCount || 0,
              productCount: reg.productCount || 0,
              status: 'live' as const,
              socialLinks: reg.socialLinks || {},
            };
            setBusiness(mapped);
          }
        } catch (e) {
          console.error('Failed to fetch business:', e);
        }
      }
      setSearched(true);
    };
    load();
  }, [storeId]);

  const products = sampleProducts
    .filter(p => p.businessId === storeId)
    .filter(p => p.status === 'active');

  const categories = Array.from(
    new Set(products.map(p => p.category))
  );

  const filtered = products
    .filter(p => {
      const matchesSearch =
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = !selectedCategory || p.category === selectedCategory;
      return matchesSearch && matchesCategory;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'price-low':
          return a.price - b.price;
        case 'price-high':
          return b.price - a.price;
        case 'newest':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case 'popularity':
          return b.salesCount - a.salesCount;
        default:
          return 0;
      }
    });

  const handleAddToCart = (product: ShopProduct) => {
    addToCart(product);
  };

  const handleBuyNow = (product: ShopProduct) => {
    addToCart(product);
    navigate('/customer/checkout');
  };

  if (!searched) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-text-light">Loading store...</p>
        </div>
      </div>
    );
  }

  if (!business) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="w-20 h-20 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="w-10 h-10 text-red-500" />
          </div>
          <h1 className="text-3xl font-bold text-text mb-3">Business not found</h1>
          <p className="text-text-light mb-6">
            The store ID &ldquo;{storeId}&rdquo; does not match any approved NKAY business.
          </p>
          <Link
            to="/"
            className="inline-flex items-center gap-2 bg-primary text-white px-6 py-3 rounded-2xl text-sm font-semibold hover:bg-primary/90 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Marketplace
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Back to Marketplace */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-text-light hover:text-primary transition-colors text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            <img src={logoImage} alt="NKAY" className="h-5 w-auto" />
            <span>Back to Marketplace</span>
          </Link>
        </div>
      </div>

      {/* Store Banner */}
      <div className="relative h-48 sm:h-64 lg:h-80 bg-gradient-to-br from-primary via-primary-light to-accent-tan overflow-hidden">
        {business.coverImage && (
          <img
            src={business.coverImage}
            alt={business.name}
            className="w-full h-full object-cover opacity-30"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent"></div>
        <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-8 lg:p-10">
          <div className="max-w-7xl mx-auto">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-2 drop-shadow-lg">
              {business.name}
            </h1>
            <p className="text-lg text-white/90 max-w-2xl drop-shadow line-clamp-2">
              {business.description}
            </p>
          </div>
        </div>
      </div>

      {/* Store Header / Info */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-2xl shadow-card -mt-16 relative z-10 mb-6">
          <div className="p-6 sm:p-8">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-6">
              <div className="flex items-start gap-4">
                <div className="relative flex-shrink-0">
                  <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-gradient-to-br from-accent-beige to-accent-tan overflow-hidden flex items-center justify-center">
                    {business.logo ? (
                      <img src={business.logo} alt={business.name} className="w-full h-full object-cover" />
                    ) : (
                      <Store className="w-10 h-10 text-primary/50" />
                    )}
                  </div>
                  <span className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 border-2 border-white rounded-full flex items-center justify-center">
                    <Check className="w-3 h-3 text-white" />
                  </span>
                </div>

                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <h1 className="text-2xl font-bold text-text">{business.name}</h1>
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                      <Check className="w-3 h-3" />
                      Verified Seller
                    </span>
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                      <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                      LIVE
                    </span>
                  </div>

                  <p className="text-text-light text-sm mb-3 max-w-2xl">
                    {business.description}
                  </p>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-text-light" />
                      <span className="text-text-light">{business.city}, {business.region}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                      <span className="font-medium text-text">{business.rating}</span>
                      <span className="text-text-light">({business.reviewCount})</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Package className="w-4 h-4 text-text-light" />
                      <span className="text-text-light">{business.productCount} products</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Heart className="w-4 h-4 text-text-light" />
                      <span className="text-text-light">{business.followerCount} followers</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 sm:flex-col sm:w-auto">
                <button
                  onClick={() => setIsFollowing(!isFollowing)}
                  className={`flex items-center justify-center gap-2 px-6 py-3 rounded-2xl text-sm font-medium transition-all ${
                    isFollowing
                      ? 'bg-primary text-white'
                      : 'border border-primary text-primary hover:bg-primary hover:text-white'
                  }`}
                >
                  <Heart className={`w-4 h-4 ${isFollowing ? 'fill-white' : ''}`} />
                  {isFollowing ? 'Following' : 'Follow Store'}
                </button>
                <button
                  onClick={() => window.location.href = `tel:${business.phone.replace(/\s+/g, '')}`}
                  className="flex items-center justify-center gap-2 px-6 py-3 rounded-2xl text-sm font-medium border border-gray-200 text-text hover:bg-accent-beige transition-all"
                >
                  <Phone className="w-4 h-4" />
                  Contact Seller
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Store Navigation */}
        <nav className="flex items-center gap-2 mb-6 bg-white rounded-2xl shadow-card p-2 overflow-x-auto">
          {storeNav.map((item) => (
            <a
              key={item.name}
              href={item.href}
              className={`px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                item.active
                  ? 'bg-accent-beige text-primary'
                  : 'text-text-light hover:bg-accent-beige hover:text-primary'
              }`}
            >
              {item.name}
            </a>
          ))}
        </nav>
      </div>

      {/* Products Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="bg-white rounded-2xl shadow-card mb-6">
          <div className="p-4 sm:p-6 border-b border-gray-100">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-text">Products from {business.name}</h2>
                <p className="text-sm text-text-light mt-1">{filtered.length} products</p>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-text-light" />
                  <input
                    type="text"
                    placeholder="Search products..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 pr-4 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all w-full sm:w-48"
                  />
                </div>

                <select
                  value={selectedCategory || ''}
                  onChange={(e) => setSelectedCategory(e.target.value || null)}
                  className="px-3 py-2 rounded-xl border border-gray-200 text-sm bg-white text-text focus:outline-none focus:ring-2 focus:ring-primary/20 appearance-none"
                >
                  <option value="">All Categories</option>
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>

                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortOption)}
                  className="px-3 py-2 rounded-xl border border-gray-200 text-sm bg-white text-text focus:outline-none focus:ring-2 focus:ring-primary/20 appearance-none"
                >
                  <option value="popularity">Sort by Popularity</option>
                  <option value="newest">Sort by Newest</option>
                  <option value="price-low">Price: Low to High</option>
                  <option value="price-high">Price: High to Low</option>
                </select>

                <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-white shadow-sm text-primary' : 'text-text-light'}`}
                  >
                    <Grid className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-white shadow-sm text-primary' : 'text-text-light'}`}
                  >
                    <List className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="p-4 sm:p-6">
            {filtered.length === 0 ? (
              <div className="text-center py-12">
                <Store className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-text-light">No products found matching your search.</p>
              </div>
            ) : (
              <div className={viewMode === 'grid'
                ? "grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
                : "space-y-4"
              }>
                {filtered.map((product) => {
                  const shopProduct = toShopProduct(product);
                  const discount = product.discountPrice
                    ? Math.round(((product.price - product.discountPrice) / product.price) * 100)
                    : 0;

                  return (
                    <div
                      key={product.id}
                      className={`bg-white rounded-xl shadow-card hover:shadow-soft transition-all duration-300 group ${
                        viewMode === 'list' ? 'flex gap-4 p-4' : 'p-4'
                      }`}
                    >
                      <Link to={`/product/${product.id}`} className={`block ${viewMode === 'list' ? 'w-24 h-24 flex-shrink-0' : 'block'}`}>
                        <div className={`${viewMode === 'list' ? 'w-24 h-24' : 'aspect-square'} rounded-lg bg-gradient-to-br from-accent-beige to-accent-tan overflow-hidden flex items-center justify-center mb-3 ${viewMode === 'list' ? 'mb-0 mr-4' : ''}`}>
                          {product.images && product.images[0] ? (
                            <img
                              src={product.images[0]}
                              alt={product.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <Store className="w-10 h-10 text-primary/50" />
                          )}
                        </div>
                      </Link>

                      <div className="flex-1">
                        <Link to={`/product/${product.id}`} className="block">
                          <h3 className="font-semibold text-text mb-1 line-clamp-2 h-14">{product.name}</h3>
                        </Link>

                        <div className="flex items-center gap-2 mb-3">
                          <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                          <span className="text-sm font-medium">{product.rating}</span>
                          <span className="text-xs text-text-light">({product.reviewCount})</span>
                        </div>

                        <div className="flex items-center gap-2 mb-4">
                          <span className="font-bold text-lg text-primary">GH₵{product.discountPrice || product.price}</span>
                          {product.discountPrice && (
                            <>
                              <span className="text-sm text-text-light line-through">GH₵{product.price}</span>
                              <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-semibold">
                                -{discount}%
                              </span>
                            </>
                          )}
                        </div>

                        <div className="flex gap-2">
                          <button
                            onClick={() => handleAddToCart(shopProduct)}
                            className="flex-1 flex items-center justify-center gap-2 bg-primary text-white py-2.5 rounded-xl text-sm font-medium hover:bg-primary/90 transition"
                          >
                            <ShoppingCart className="w-4 h-4" />
                            Add to Cart
                          </button>
                          <button
                            onClick={() => handleBuyNow(shopProduct)}
                            className="flex-1 border border-primary text-primary py-2.5 rounded-xl text-sm font-medium hover:bg-primary hover:text-white transition"
                          >
                            Buy Now
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
