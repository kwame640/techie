import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Search, User, MapPin, Star, Truck, Store,
  ArrowRight, Heart, Home, Grid3x3, Building2,
  ShoppingCart, Package, ShoppingBag, User as UserIcon, Menu,
  Check, CreditCard, Facebook, Instagram, Twitter, Linkedin, Globe,
} from 'lucide-react';
import { sampleBusinesses, businessCategories, sampleProducts } from '../../data/marketplaceData';
import { products as shopProducts, categories as shopCategories } from '../../data/products';
import logoImage from '../../images/nkay.png';
import { HomepageCarousel } from '../../components/HomepageCarousel';
import { CompactProductCard, type CompactProduct } from '../../components/CompactProductCard';

const sidebarNav = [
  { name: 'Home', href: '/', icon: Home, active: true },
  { name: 'Categories', href: '/discover', icon: Grid3x3 },
  { name: 'Businesses', href: '/discover', icon: Building2 },
  { name: 'Orders', href: '/customer/orders', icon: Package },
  { name: 'Profile', href: '/customer/profile', icon: UserIcon },
];

const categoryIcons: Record<string, JSX.Element> = {
  All: <Grid3x3 className="w-5 h-5" />,
  Electronics: <ShoppingCart className="w-5 h-5" />,
  Fashion: <Store className="w-5 h-5" />,
  Beauty: <Store className="w-5 h-5" />,
  Food: <Store className="w-5 h-5" />,
  Groceries: <Store className="w-5 h-5" />,
  'Home & Kitchen': <ShoppingBag className="w-5 h-5" />,
  'Phones & Accessories': <ShoppingCart className="w-5 h-5" />,
  Automotive: <Store className="w-5 h-5" />,
  'More Categories': <Grid3x3 className="w-5 h-5" />,
};

const footerLinks = {
  shop: [
    { name: 'All Products', href: '/discover' },
    { name: 'New Arrivals', href: '/discover' },
    { name: 'Categories', href: '/discover' },
    { name: 'Popular Searches', href: '/discover' },
  ],
  customerService: [
    { name: 'Help Center', href: '#' },
    { name: 'Contact Us', href: '#' },
    { name: 'Shipping Info', href: '#' },
    { name: 'Returns', href: '#' },
    { name: 'Track Order', href: '/login' },
  ],
  company: [
    { name: 'About NKAY', href: '#' },
    { name: 'Careers', href: '#' },
    { name: 'Blog', href: '#' },
    { name: 'Press', href: '#' },
    { name: 'Sustainability', href: '#' },
  ],
  legal: [
    { name: 'Privacy Policy', href: '#' },
    { name: 'Terms of Service', href: '#' },
    { name: 'Refund Policy', href: '#' },
    { name: 'Cookie Policy', href: '#' },
  ],
  followUs: [
    { name: 'Facebook', href: '#', icon: Facebook },
    { name: 'Instagram', href: '#', icon: Instagram },
    { name: 'Twitter', href: '#', icon: Twitter },
    { name: 'LinkedIn', href: '#', icon: Linkedin },
  ],
};

const PRODUCT_GRID =
  'grid grid-cols-2 gap-2.5 sm:gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6';

function shuffle<T>(arr: T[], seed = 1): T[] {
  const a = arr.slice();
  let s = seed;
  for (let i = a.length - 1; i > 0; i--) {
    s = (s * 9301 + 49297) % 233280;
    const j = Math.floor((s / 233280) * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export const MarketplaceHome = () => {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [apiBusinesses, setApiBusinesses] = useState<any[]>([]);
  const [loadingBusinesses, setLoadingBusinesses] = useState(false);

  useEffect(() => {
    const fetchBusinesses = async () => {
      setLoadingBusinesses(true);
      try {
        const res = await fetch('/api/registrations');
        const data = await res.json();
        if (data.success && data.registrations) {
          const mapped = data.registrations.map((reg: any) => ({
            id: reg.id,
            name: reg.businessName || '',
            description: reg.description || '',
            logo: reg.storeLogo || '',
            category: reg.businessCategory || '',
            city: reg.city || '',
            region: reg.region || '',
            rating: reg.rating || 4.5,
            reviewCount: reg.reviewCount || 0,
            productCount: reg.productCount || 0,
            status: reg.status === 'Approved' ? 'live' : 'pending',
            phone: reg.phone || '',
            email: reg.email || '',
            storeUrl: reg.storeUrl || '',
          }));
          setApiBusinesses(mapped);
        }
      } catch (e) {
        console.error('Failed to fetch businesses:', e);
      } finally {
        setLoadingBusinesses(false);
      }
    };
    fetchBusinesses();
  }, []);

  const displayBusinesses = [...apiBusinesses, ...sampleBusinesses.filter(s => !apiBusinesses.some(a => a.id === s.id))];

  const filteredBusinesses = displayBusinesses.filter(biz =>
    biz.status === 'live' &&
    (selectedCategory ? biz.category === selectedCategory : true)
  );

  const businessById = useMemo(() => {
    const map = new Map<string, any>();
    displayBusinesses.forEach(b => map.set(b.id, b));
    sampleBusinesses.forEach(b => {
      if (!map.has(b.id)) map.set(b.id, b);
    });
    return map;
  }, [displayBusinesses]);

  const marketplaceCompact: CompactProduct[] = useMemo(
    () =>
      sampleProducts.map((p) => {
        const biz = businessById.get(p.businessId || '');
        return {
          id: p.id,
          name: p.name,
          image: Array.isArray(p.images) && p.images[0] ? p.images[0] : '',
          price: p.discountPrice && p.discountPrice < p.price ? p.discountPrice : p.price,
          originalPrice: p.discountPrice && p.discountPrice < p.price ? p.price : undefined,
          category: p.category,
          rating: p.rating ?? 4.6,
          reviews: p.reviewCount ?? p.salesCount ?? 0,
          storeName: biz?.name,
          location: biz ? `${biz.city || ''}, ${biz.region || ''}`.trim() : undefined,
          businessId: p.businessId,
          isNew: (p.createdAt && new Date(p.createdAt).getTime() > Date.now() - 1000 * 60 * 60 * 24 * 30) ? true : false,
        };
      }),
    [businessById]
  );

  const shopCompact: CompactProduct[] = useMemo(
    () =>
      shopProducts.map((p) => ({
        id: p.id,
        name: p.name,
        image: p.image,
        price: p.price,
        originalPrice: p.originalPrice,
        discountPercent: p.discount,
        category: p.category,
        rating: p.rating,
        reviews: p.reviews,
        storeName: 'NKAY Shop',
        location: 'Accra, Greater Accra',
        isNew: p.isNew,
        isBestSeller: p.isBestSeller,
      })),
    []
  );

  const allCompact = useMemo(() => {
    const combined = [...marketplaceCompact, ...shopCompact];
    const seen = new Set<string>();
    return combined.filter((c) => {
      if (seen.has(c.id)) return false;
      seen.add(c.id);
      return true;
    });
  }, [marketplaceCompact, shopCompact]);

  const featuredListings = useMemo(() => allCompact.slice(0, 18), [allCompact]);
  const popularNearYou = useMemo(() => shuffle(allCompact, 7).slice(0, 24), [allCompact]);
  const latestListings = useMemo(() => {
    return allCompact
      .filter((p) => p.isNew || p.price < 200)
      .slice(0, 18);
  }, [allCompact]);
  const recommendedForYou = useMemo(
    () => allCompact.filter((p) => p.isBestSeller || (p.rating ?? 0) >= 4.7).slice(0, 18),
    [allCompact]
  );
  const recentlyAdded = useMemo(
    () => shuffle(allCompact.slice().reverse(), 13).slice(0, 12),
    [allCompact]
  );

  const SectionHeader = ({
    title,
    subtitle,
    accent = 'Featured',
    viewHref = '/discover',
    viewLabel = 'View All',
  }: {
    title: string;
    subtitle?: string;
    accent?: string;
    viewHref?: string;
    viewLabel?: string;
  }) => (
    <div className="flex flex-wrap items-end justify-between gap-3 mb-4 sm:mb-5">
      <div className="min-w-0">
        <div className="flex items-center gap-2 mb-1.5">
          <div className="w-1 h-5 bg-primary rounded-full"></div>
          <span className="text-xs sm:text-sm font-semibold text-primary uppercase tracking-wide">
            {accent}
          </span>
        </div>
        <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-text leading-tight">
          {title}
        </h2>
        {subtitle && <p className="text-xs sm:text-sm text-text-light mt-1">{subtitle}</p>}
      </div>
      <Link
        to={viewHref}
        className="inline-flex items-center gap-1 text-xs sm:text-sm font-semibold text-primary hover:underline whitespace-nowrap flex-shrink-0 bg-accent-beige/50 hover:bg-accent-beige transition-colors px-3 sm:px-4 py-2 rounded-xl"
      >
        {viewLabel}
        <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
      </Link>
    </div>
  );

  return (
    <div className="min-h-screen bg-background text-text font-sans">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 lg:h-20 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <img src={logoImage} alt="NKAY" className="h-10 w-auto" />
            <div className="flex items-center">
              <span className="text-2xl font-bold text-primary hidden sm:inline">NKAY</span>
              <span className="text-xs text-text-light ml-2">SHOP • SELL • GROW</span>
            </div>
          </Link>

          <div className="flex-1 max-w-2xl mx-2 sm:mx-4 lg:mx-8">
            <div className="relative">
              <Search className="absolute left-3 sm:left-4 top-1/2 transform -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-text-light" />
              <input
                type="text"
                placeholder="Search products, stores or categories..."
                className="w-full pl-9 sm:pl-12 pr-3 sm:pr-4 py-2.5 sm:py-3 rounded-xl sm:rounded-2xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-xs sm:text-sm"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 lg:gap-4">
            <Link to="/login" className="hidden sm:inline-flex items-center gap-2 bg-primary text-white px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl sm:rounded-2xl text-xs sm:text-sm font-medium hover:bg-primary/90 transition whitespace-nowrap">
              <User className="w-4 h-4" />
              Sign In
            </Link>
            <button className="lg:hidden p-2 rounded-xl hover:bg-accent-beige transition-colors">
              <Menu className="w-5 h-5 text-text-light" />
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
        <div className="flex gap-4 sm:gap-6">
          {/* Left Sidebar */}
          <aside className="hidden xl:flex flex-col w-64 flex-shrink-0">
            <nav className="flex-1 bg-white rounded-2xl shadow-card p-3 space-y-1">
              {sidebarNav.map((item) => (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                    item.active
                      ? 'bg-accent-beige text-primary'
                      : 'text-text-light hover:bg-accent-beige hover:text-primary'
                  }`}
                >
                  <item.icon className={`w-5 h-5 ${item.active ? 'text-primary' : 'text-text-light'}`} />
                  {item.name}
                </Link>
              ))}
            </nav>

            <div className="mt-6 bg-white rounded-2xl shadow-card p-4 text-center">
              <Heart className="w-6 h-6 text-primary mx-auto mb-2" />
              <p className="text-sm font-medium text-text">Support Local Businesses</p>
              <p className="text-xs text-text-light mt-1">Every purchase supports Ghanaian entrepreneurs</p>
            </div>

            <div className="h-32 mt-6 overflow-hidden rounded-2xl">
              <svg width="100%" height="100%" viewBox="0 0 400 120" preserveAspectRatio="none">
                <path d="M0,40 L80,20 L160,35 L240,15 L320,30 L400,10 V120 H0 Z" fill="#E83838" />
                <path d="M0,55 L80,35 L160,50 L240,30 L320,45 L400,25 V120 H0 Z" fill="#FFD700" />
                <path d="M0,70 L80,50 L160,65 L240,45 L320,60 L400,40 V120 H0 Z" fill="#008000" />
              </svg>
            </div>
          </aside>

          {/* Main Content */}
          <main className="flex-1 min-w-0">
            {/* Hero / Businesses Near You */}
            <section className="mb-5 sm:mb-7">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-1 h-6 bg-primary rounded-full"></div>
                <span className="text-sm font-medium text-primary">Your Area</span>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3 sm:gap-4">
                <div className="min-w-0 flex-1">
                  <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-text mb-1 sm:mb-2 leading-tight">
                    Businesses Near You
                  </h1>
                  <p className="text-xs sm:text-sm text-text-light">
                    Discover amazing businesses, products and services in your area.
                  </p>
                </div>
                <div className="flex items-center gap-2 bg-white px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl sm:rounded-2xl shadow-card border border-gray-100 flex-shrink-0">
                  <MapPin className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary" />
                  <span className="font-medium text-text text-xs sm:text-sm">Accra</span>
                  <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-text-light rotate-90" />
                </div>
              </div>
            </section>

            {/* Popular Categories - horizontal scroll chips */}
            <section className="mb-5 sm:mb-7">
              <div className="flex flex-wrap items-center justify-between mb-3 sm:mb-4 gap-2">
                <h2 className="text-base sm:text-lg font-bold text-text flex items-center gap-2">
                  <Grid3x3 className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                  Browse Categories
                </h2>
                <Link to="/discover" className="text-xs sm:text-sm font-medium text-primary hover:underline flex items-center gap-1 whitespace-nowrap">
                  View All
                  <ArrowRight className="w-3 h-3 sm:w-4 sm:h-4" />
                </Link>
              </div>
              <div className="flex flex-nowrap sm:flex-wrap gap-2 sm:gap-2.5 overflow-x-auto sm:overflow-visible pb-2 sm:pb-0 -mx-4 sm:mx-0 px-4 sm:px-0 scrollbar-hide">
                <button
                  onClick={() => setSelectedCategory(null)}
                  className={`flex-shrink-0 px-3 sm:px-5 py-2 sm:py-2.5 rounded-full text-xs sm:text-sm font-medium transition-all flex items-center gap-1.5 ${
                    selectedCategory === null
                      ? 'bg-primary text-white shadow-soft'
                      : 'bg-white text-text-light hover:bg-accent-beige hover:text-primary border border-gray-100'
                  }`}
                >
                  <Grid3x3 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  All
                </button>
                {businessCategories.slice(0, 9).map((category) => (
                  <button
                    key={category}
                    onClick={() => setSelectedCategory(category)}
                    className={`flex-shrink-0 px-3 sm:px-5 py-2 sm:py-2.5 rounded-full text-xs sm:text-sm font-medium transition-all flex items-center gap-1.5 ${
                      selectedCategory === category
                        ? 'bg-primary text-white shadow-soft'
                        : 'bg-white text-text-light hover:bg-accent-beige hover:text-primary border border-gray-100'
                    }`}
                  >
                    {categoryIcons[category] || <Grid3x3 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
                    {category}
                  </button>
                ))}
                <button className="flex-shrink-0 px-3 sm:px-5 py-2 sm:py-2.5 rounded-full text-xs sm:text-sm font-medium text-text-light hover:bg-accent-beige transition-all flex items-center gap-1.5 border border-gray-100">
                  <Grid3x3 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  More Categories
                </button>
              </div>
            </section>

            {/* Featured Businesses Carousel */}
            <div className="mb-6 sm:mb-8">
              <HomepageCarousel />
            </div>

            {/* Featured Listings */}
            <section className="mb-8 sm:mb-10">
              <SectionHeader
                accent="Today's Picks"
                title="Featured Listings"
                subtitle="Hand-picked products & deals from verified businesses across Ghana"
              />
              <div className={PRODUCT_GRID}>
                {featuredListings.map((p, i) => (
                  <CompactProductCard key={`feat-${p.id}`} product={p} eager={i < 6} />
                ))}
              </div>
            </section>

            {/* Popular Near You */}
            <section className="mb-8 sm:mb-10">
              <SectionHeader
                accent="Near You"
                title="Popular Near You"
                subtitle="What shoppers in Accra are loving right now"
              />
              <div className={PRODUCT_GRID}>
                {popularNearYou.map((p) => (
                  <CompactProductCard key={`pop-${p.id}`} product={p} />
                ))}
              </div>
            </section>

            {/* Latest Listings */}
            <section className="mb-8 sm:mb-10">
              <SectionHeader
                accent="Fresh"
                title="Latest Listings"
                subtitle="New arrivals added today from businesses across NKAY"
              />
              <div className={PRODUCT_GRID}>
                {latestListings.map((p) => (
                  <CompactProductCard key={`latest-${p.id}`} product={p} />
                ))}
              </div>
            </section>

            {/* Top Businesses - existing large vertical cards */}
            <section className="mb-8 sm:mb-10">
              <SectionHeader
                accent="Verified Stores"
                title="Top Businesses"
                subtitle="Highest-rated stores on NKAY — great reviews, fast delivery"
                viewLabel="Browse All Businesses"
              />
              <div className="space-y-3 sm:space-y-4">
                {loadingBusinesses && apiBusinesses.length === 0 ? (
                  <div className="text-center py-12 text-text-light">Loading businesses...</div>
                ) : filteredBusinesses.length === 0 ? (
                  <div className="text-center py-12 text-text-light">No businesses found for this category.</div>
                ) : (
                  filteredBusinesses.slice(0, 4).map((business) => (
                    <Link
                      key={business.id}
                      to={`/store/${business.id}`}
                      className="block"
                    >
                      <div className="bg-white rounded-2xl shadow-card hover:shadow-soft transition-all duration-300 overflow-hidden group">
                        <div className="flex flex-col sm:flex-row sm:items-stretch">
                          <div className="w-full sm:w-48 sm:h-36 lg:w-56 lg:h-40 sm:rounded-l-2xl rounded-t-2xl sm:rounded-tr-none bg-gradient-to-br from-accent-beige to-accent-tan overflow-hidden sm:flex-shrink-0 relative min-h-[160px] sm:min-h-0">
                            {business.logo ? (
                              <img src={business.logo} alt={business.name} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center min-h-[160px] sm:min-h-0">
                                <Store className="w-12 h-12 text-primary/50" />
                              </div>
                            )}
                            {business.status === 'live' && (
                              <span className="absolute top-2 right-2 bg-green-500 text-white text-[10px] font-semibold px-2 py-0.5 rounded-full">
                                LIVE
                              </span>
                            )}
                          </div>

                          <div className="flex-1 p-4 sm:p-5">
                            <div className="flex items-start justify-between mb-2 gap-3 sm:gap-4">
                              <div className="flex-1 min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                  <h3 className="text-lg sm:text-xl font-bold text-text break-words">{business.name}</h3>
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs font-medium flex-shrink-0">
                                    <Check className="w-3 h-3" />
                                    Verified
                                  </span>
                                </div>
                                <p className="text-sm text-text-light mt-1 line-clamp-2">{business.description}</p>
                              </div>
                              <ArrowRight className="w-5 h-5 text-text-light group-hover:text-primary transition-colors flex-shrink-0 mt-0.5" />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mt-3 sm:mt-4">
                              <div className="flex items-center gap-2">
                                <MapPin className="w-4 h-4 text-text-light" />
                                <span className="text-sm text-text-light">{business.city}, {business.region}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Truck className="w-4 h-4 text-text-light" />
                                <span className="text-sm text-text-light">NKAY Delivery</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <div className="flex items-center gap-1">
                                  <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                                  <span className="font-medium text-text">{business.rating}</span>
                                </div>
                                <span className="text-xs text-text-light">({business.reviewCount})</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Package className="w-4 h-4 text-text-light" />
                                <span className="text-sm text-text-light">{business.productCount} products</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))
                )}
              </div>
            </section>

            {/* Vendor Recruitment Banner - unchanged */}
            <section className="mb-8 sm:mb-10">
              <div className="bg-primary rounded-3xl shadow-xl overflow-hidden relative">
                <div className="grid lg:grid-cols-2 gap-6 sm:gap-8 items-center p-5 sm:p-6 sm:p-8 lg:p-12">
                  <div className="text-white relative">
                    <div className="flex items-center gap-2 mb-4 sm:mb-6">
                      <img src={logoImage} alt="NKAY" className="h-8 w-auto brightness-0 invert" />
                      <span className="text-xl font-bold">NKAY</span>
                    </div>
                    <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-3 sm:mb-4">
                      Start Your Business on <span className="text-accent-tan">NKAY</span>
                    </h2>
                    <p className="text-base sm:text-lg opacity-90 mb-5 sm:mb-6 sm:mb-8 leading-relaxed">
                      Join thousands of businesses growing with NKAY. Create your store, list products, and reach customers across Ghana.
                    </p>
                    <div className="flex flex-wrap items-center gap-3 sm:gap-4">
                      <Link
                        to="/business/register"
                        className="inline-flex items-center gap-2 bg-white text-primary px-5 sm:px-6 sm:px-8 py-3 sm:py-3 sm:py-4 rounded-2xl text-sm sm:text-base font-semibold hover:bg-accent-beige transition-colors whitespace-nowrap"
                      >
                        Register Your Business
                        <ArrowRight className="w-4 sm:w-5 h-4 sm:h-5" />
                      </Link>
                      <div className="flex -space-x-2">
                        <div className="w-8 h-8 rounded-full bg-accent-tan flex items-center justify-center text-xs font-bold">
                          More
                        </div>
                        <div className="w-8 h-8 rounded-full bg-accent-tan flex items-center justify-center text-xs font-bold">
                          Sales
                        </div>
                      </div>
                    </div>

                    <div className="hidden sm:block absolute -top-4 -right-4 bg-white/10 backdrop-blur-sm rounded-2xl px-4 py-3 mt-6 max-w-xs">
                      <p className="text-sm font-medium">More Customers • More Sales</p>
                    </div>
                  </div>

                  <div className="relative flex justify-center lg:justify-end mt-5 sm:mt-6 lg:mt-0">
                    <div className="relative">
                      <div className="w-56 h-56 sm:w-64 sm:h-64 sm:w-80 sm:h-80 max-w-full rounded-full bg-gradient-to-br from-accent-beige to-accent-tan overflow-hidden shadow-2xl">
                        <img
                          src={logoImage}
                          alt="Ghanaian business owner"
                          className="w-full h-full object-cover opacity-30"
                        />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="w-24 h-24 sm:w-28 sm:h-28 sm:w-40 sm:h-40 rounded-full bg-gradient-to-br from-primary to-primary-light flex items-center justify-center">
                            <User className="w-12 h-12 sm:w-14 sm:h-14 sm:w-20 sm:h-20 text-white" />
                          </div>
                        </div>
                      </div>
                      <div className="absolute -bottom-4 -left-4 sm:-bottom-6 sm:-left-6 bg-white/90 backdrop-blur rounded-2xl p-2.5 sm:p-3 sm:p-4 shadow-card max-w-[85%] sm:max-w-xs">
                        <p className="text-xs sm:text-sm font-medium text-primary">5,000+ businesses growing</p>
                        <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                          <div className="bg-primary h-2 rounded-full w-3/4"></div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="absolute top-0 right-0 w-24 h-24 sm:w-32 sm:h-32 bg-gradient-to-br from-yellow-400/20 to-transparent rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl pointer-events-none"></div>
                <div className="absolute bottom-0 left-0 w-32 h-32 sm:w-40 sm:h-40 bg-gradient-to-tr from-primary-light/20 to-transparent rounded-full translate-y-1/2 -translate-x-1/2 blur-3xl pointer-events-none"></div>
              </div>
            </section>

            {/* Recommended For You */}
            <section className="mb-8 sm:mb-10">
              <SectionHeader
                accent="Picked For You"
                title="Recommended For You"
                subtitle="Based on top-rated items customers love on NKAY"
              />
              <div className={PRODUCT_GRID}>
                {recommendedForYou.map((p) => (
                  <CompactProductCard key={`rec-${p.id}`} product={p} />
                ))}
              </div>
            </section>

            {/* Explore Categories - tile grid (images + counts) */}
            <section className="mb-8 sm:mb-10">
              <SectionHeader
                accent="Explore"
                title="Explore Categories"
                subtitle="Shop the most popular categories on NKAY"
                viewLabel="All Categories"
              />
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5 sm:gap-3 lg:gap-4">
                {shopCategories.map((cat) => (
                  <Link
                    key={cat.id}
                    to={`/discover`}
                    className="group block bg-white rounded-xl sm:rounded-2xl border border-gray-100 shadow-card hover:shadow-soft hover:border-accent-tan/60 transition-all overflow-hidden"
                  >
                    <div className="relative aspect-[4/3] overflow-hidden bg-gradient-to-br from-accent-beige to-accent-tan/70">
                      <img
                        src={cat.image}
                        alt={cat.name}
                        loading="lazy"
                        draggable={false}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent" />
                      <div className="absolute left-2.5 right-2.5 sm:left-3 sm:right-3 bottom-2.5 sm:bottom-3 text-white">
                        <h3 className="text-sm sm:text-base font-bold leading-tight drop-shadow-sm">
                          {cat.name}
                        </h3>
                        <p className="text-[10px] sm:text-xs opacity-90 mt-0.5">
                          {cat.productCount.toLocaleString()} products
                        </p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </section>

            {/* Recently Added */}
            <section className="mb-8 sm:mb-12">
              <SectionHeader
                accent="Brand New"
                title="Recently Added"
                subtitle="Freshly added to NKAY — be the first to shop these"
              />
              <div className={PRODUCT_GRID}>
                {recentlyAdded.map((p) => (
                  <CompactProductCard key={`recent-${p.id}`} product={p} />
                ))}
              </div>
            </section>
          </main>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-text pt-10 sm:pt-12 mt-8 sm:mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 sm:gap-10 lg:gap-12">
            <div>
              <Link to="/" className="flex items-center gap-3 mb-5 sm:mb-6">
                <img src={logoImage} alt="NKAY" className="h-10 w-auto brightness-0 invert" />
                <span className="text-2xl font-bold text-white">NKAY</span>
              </Link>
              <p className="text-sm text-gray-400 leading-relaxed mb-5 sm:mb-6">
                Ghana's premium marketplace connecting customers with the best local businesses. Shop • Sell • Grow.
              </p>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center">
                  <Globe className="w-4 h-4 text-white" />
                </div>
                <span className="text-xs text-gray-400">gh.nkay.com</span>
              </div>
            </div>

            <div>
              <h3 className="text-white font-semibold mb-4 text-sm uppercase tracking-wider">Shop</h3>
              <ul className="space-y-2.5 sm:space-y-3">
                {footerLinks.shop.map((link) => (
                  <li key={link.name}>
                    <Link to={link.href} className="text-gray-400 hover:text-white text-sm transition-colors">{link.name}</Link>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="text-white font-semibold mb-4 text-sm uppercase tracking-wider">Customer Service</h3>
              <ul className="space-y-2.5 sm:space-y-3">
                {footerLinks.customerService.map((link) => (
                  <li key={link.name}>
                    <Link to={link.href} className="text-gray-400 hover:text-white text-sm transition-colors">{link.name}</Link>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="text-white font-semibold mb-4 text-sm uppercase tracking-wider">Company</h3>
              <ul className="space-y-2.5 sm:space-y-3">
                {footerLinks.company.map((link) => (
                  <li key={link.name}>
                    <Link to={link.href} className="text-gray-400 hover:text-white text-sm transition-colors">{link.name}</Link>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="text-white font-semibold mb-4 text-sm uppercase tracking-wider">Follow Us</h3>
              <div className="flex gap-3 mb-5 sm:mb-6">
                {footerLinks.followUs.map((social) => (
                  <a
                    key={social.name}
                    href={social.href}
                    className="w-10 h-10 bg-gray-800 rounded-lg flex items-center justify-center text-gray-400 hover:bg-primary hover:text-white transition-all"
                  >
                    <social.icon className="w-5 h-5" />
                  </a>
                ))}
              </div>
            </div>
          </div>

          <div className="border-t border-gray-800 mt-8 sm:mt-10 sm:mt-12 pt-6 sm:pt-8 flex flex-col md:flex-row items-center justify-between gap-5 sm:gap-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6 w-full md:w-auto">
              <div className="flex items-center gap-2 text-gray-400 text-sm">
                <CreditCard className="w-4 h-4 flex-shrink-0" />
                <span>We accept all major payment methods</span>
              </div>
              <div className="flex items-center gap-2 text-gray-400 text-sm">
                <Truck className="w-4 h-4 flex-shrink-0" />
                <span>Fast delivery across Ghana</span>
              </div>
            </div>
            <div className="text-center md:text-right w-full md:w-auto">
              <p className="text-xs text-gray-500">
                &copy; {new Date().getFullYear()} NKAY. All rights reserved.
              </p>
              <p className="text-xs text-gray-600 mt-1">
                Registered in Ghana • VAT included where applicable
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};
