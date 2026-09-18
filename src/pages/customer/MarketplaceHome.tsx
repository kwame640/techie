import { useState, useEffect, useMemo } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import {
  Search, Truck, Store, X as XIcon,
  ArrowRight, Heart, Home, Grid3x3, Building2,
  ShoppingCart, Package, ShoppingBag, Menu,
  CreditCard, Facebook, Instagram, Twitter, Linkedin, Globe,
  User, Bell,
} from 'lucide-react';
import { sampleBusinesses, businessCategories, sampleProducts } from '../../data/marketplaceData';
import { products as shopProducts } from '../../data/products';
import logoImage from '../../images/nkay.png';
import { HomepageCarousel } from '../../components/HomepageCarousel';
import { CompactProductCard, type CompactProduct } from '../../components/CompactProductCard';
import { safeFetchJson } from '../../lib/fetch';
import { useShop } from '../../context/ShopContext';

const sidebarNav = [
  { name: 'Home', href: '/', icon: Home, active: true },
  { name: 'Categories', href: '/discover', icon: Grid3x3 },
  { name: 'Businesses', href: '/discover', icon: Building2 },
  { name: 'Orders', href: '/customer/orders', icon: Package },
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
    { name: 'Register Your Business', href: '/business/register' },
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
  'grid grid-cols-2 gap-2 sm:gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6';

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
  const navigate = useNavigate();
  const { cartCount } = useShop();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [apiBusinesses, setApiBusinesses] = useState<any[]>([]);
  const [mobileNavOpen, setMobileNavOpen] = useState<boolean>(false);
  const [headerSearch, setHeaderSearch] = useState('');

  useEffect(() => {
    const fetchBusinesses = async () => {
      try {
        const result = await safeFetchJson<any>('/api/registrations', {
          parseErrorMessage: 'NKAY server returned a non-JSON error page when loading businesses. Try reloading or check your internet.',
        });
        if (!result.success) {
          console.warn('Homepage businesses fetch skipped (non-JSON):', result.status, result.parseError?.slice(0, 220));
          return;
        }
        const data = result.data;
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
      }
    };
    fetchBusinesses();
  }, []);

  const displayBusinesses = [...apiBusinesses, ...sampleBusinesses.filter(s => !apiBusinesses.some(a => a.id === s.id))];

  void displayBusinesses;

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
          verified: biz ? biz.status === 'live' || biz.verificationStatus === 'approved' : false,
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
  const deals = useMemo(
    () => allCompact.filter((p) => p.originalPrice != null || p.discountPercent != null).slice(0, 18),
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

  const SearchForm = () => (
    <form
      className="relative"
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        const q = headerSearch.trim();
        if (q) navigate(`/search?q=${encodeURIComponent(q)}`);
      }}
    >
      <Search className="absolute left-3 sm:left-4 top-1/2 transform -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-text-light" />
      <input
        type="text"
        value={headerSearch}
        onChange={(e) => setHeaderSearch(e.target.value)}
        placeholder="Search products, stores or categories..."
        className="w-full pl-9 sm:pl-12 pr-3 sm:pr-4 py-2.5 sm:py-3 rounded-full bg-gray-50 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary focus:bg-white transition-all text-xs sm:text-sm"
      />
    </form>
  );

  return (
    <div className="min-h-screen bg-background text-text font-sans">
      {/* Utility strip */}
      <div className="hidden lg:block bg-text text-gray-400">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 h-9 flex items-center justify-between text-xs">
          <p className="flex items-center gap-2">
            <Truck className="w-3.5 h-3.5 text-accent-tan" />
            Ghana's premium marketplace connecting customers with the best local businesses
          </p>
          <div className="flex items-center gap-5">
            <span className="font-semibold text-accent-beige/90 tracking-wide">SHOP • SELL • GROW</span>
            <Link
              to="/business/register"
              className="inline-flex items-center gap-1.5 font-semibold text-white hover:text-accent-beige transition-colors"
            >
              <Store className="w-3.5 h-3.5" />
              Register Your Business
            </Link>
          </div>
        </div>
      </div>

      {/* Sticky header + category bar */}
      <div className="sticky top-0 z-50">
        <header className="bg-white">
          {/* Mobile header */}
          <div className="lg:hidden flex items-center justify-between gap-3 px-4 pt-3 pb-1">
            <Link to="/" className="flex items-center gap-2 min-w-0">
              <img src={logoImage} alt="NKAY" className="h-9 w-auto flex-shrink-0" />
              <div className="flex items-center min-w-0">
                <span className="text-xl font-bold text-primary">NKAY</span>
                <span className="text-[10px] text-text-light ml-1.5">SHOP • SELL • GROW</span>
              </div>
            </Link>
            <div className="flex items-center gap-1">
              <Link
                to="/customer/cart"
                aria-label="Cart"
                className="relative p-2 rounded-xl hover:bg-accent-beige transition-colors"
              >
                <ShoppingCart className="w-5 h-5 text-text-light" />
                {cartCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
                    {cartCount > 99 ? '99+' : cartCount}
                  </span>
                )}
              </Link>
              <button
                onClick={() => setMobileNavOpen(true)}
                className="p-2 rounded-xl hover:bg-accent-beige transition-colors"
                aria-label="Open navigation and categories"
              >
                <Menu className="w-5 h-5 text-text-light" />
              </button>
            </div>
          </div>
          <div className="lg:hidden px-4 pb-3">
            <SearchForm />
          </div>

          {/* Desktop header */}
          <div className="hidden lg:flex max-w-7xl mx-auto px-6 lg:px-8 h-20 items-center justify-between gap-5">
            <Link to="/" className="flex items-center gap-3 flex-shrink-0">
              <img src={logoImage} alt="NKAY" className="h-10 w-auto" />
              <div className="flex items-center">
                <span className="text-2xl font-bold text-primary">NKAY</span>
                <span className="text-xs text-text-light ml-2 hidden xl:inline">SHOP • SELL • GROW</span>
              </div>
            </Link>

            <div className="flex-1 max-w-2xl">
              <SearchForm />
            </div>

            <div className="flex items-center gap-1.5 xl:gap-2">
              <Link
                to="/login"
                className="flex flex-col items-center gap-1 px-2.5 py-1.5 rounded-xl hover:bg-accent-beige transition-colors"
              >
                <User className="w-5 h-5 text-text-light" />
                <span className="text-[10px] font-semibold text-text-light leading-none">Sign In</span>
              </Link>
              <Link
                to="/customer/orders"
                className="flex flex-col items-center gap-1 px-2.5 py-1.5 rounded-xl hover:bg-accent-beige transition-colors"
              >
                <Package className="w-5 h-5 text-text-light" />
                <span className="text-[10px] font-semibold text-text-light leading-none">Orders</span>
              </Link>
              <Link
                to="/customer/orders"
                aria-label="Notifications"
                className="flex flex-col items-center gap-1 px-2.5 py-1.5 rounded-xl hover:bg-accent-beige transition-colors"
              >
                <Bell className="w-5 h-5 text-text-light" />
                <span className="text-[10px] font-semibold text-text-light leading-none">Alerts</span>
              </Link>
              <Link
                to="/customer/cart"
                aria-label="Cart"
                className="relative flex flex-col items-center gap-1 px-2.5 py-1.5 rounded-xl hover:bg-accent-beige transition-colors"
              >
                <span className="relative">
                  <ShoppingCart className="w-5 h-5 text-text-light" />
                  {cartCount > 0 && (
                    <span className="absolute -top-1.5 -right-2 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
                      {cartCount > 99 ? '99+' : cartCount}
                    </span>
                  )}
                </span>
                <span className="text-[10px] font-semibold text-text-light leading-none">Cart</span>
              </Link>
              <Link
                to="/business/register"
                className="inline-flex items-center gap-2 bg-primary text-white px-4 py-2.5 rounded-xl text-xs font-medium hover:bg-primary/90 transition whitespace-nowrap ml-1"
              >
                <Store className="w-4 h-4" />
                Sell on NKAY
              </Link>
            </div>
          </div>
        </header>

        {/* Category bar */}
        <nav className="bg-white/95 backdrop-blur border-t lg:border-t-0 border-b border-gray-100">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-1.5 sm:gap-2 py-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <button
                onClick={() => setSelectedCategory(null)}
                className={`flex-shrink-0 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm font-medium transition-all ${
                  selectedCategory === null
                    ? 'bg-primary text-white shadow-soft'
                    : 'bg-white text-text-light hover:bg-accent-beige hover:text-primary border border-gray-200'
                }`}
              >
                <Grid3x3 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                All
              </button>
              {businessCategories.map((category) => {
                const isSelected = selectedCategory === category;
                return (
                  <button
                    key={category}
                    onClick={() => setSelectedCategory(category)}
                    className={`flex-shrink-0 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm font-medium transition-all ${
                      isSelected
                        ? 'bg-primary text-white border-transparent shadow-soft'
                        : 'bg-white text-text-light hover:bg-accent-beige hover:text-primary border border-gray-200'
                    }`}
                  >
                    <span className="hidden sm:inline-flex">{categoryIcons[category] || <Grid3x3 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}</span>
                    {category}
                  </button>
                );
              })}
              <Link
                to="/discover"
                className="flex-shrink-0 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm font-medium text-text-light hover:bg-accent-beige hover:text-primary border border-gray-200 transition-all"
              >
                <Grid3x3 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                More Categories
              </Link>
            </div>
          </div>
        </nav>
      </div>

      {/* Mobile Nav Drawer */}
      {mobileNavOpen && (
        <div className="fixed inset-0 z-[70] lg:hidden">
          <button
            type="button"
            aria-label="Close navigation"
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setMobileNavOpen(false)}
          />
          <aside className="absolute left-0 top-0 h-full w-[85%] max-w-sm bg-[#FAF8F5] shadow-2xl flex flex-col animate-in slide-in-from-left duration-200">
            <div className="flex items-center justify-between px-4 sm:px-5 py-4 border-b border-gray-100 bg-white/80 backdrop-blur">
              <Link to="/" className="flex items-center gap-2 min-w-0" onClick={() => setMobileNavOpen(false)}>
                <img src={logoImage} alt="NKAY" className="h-8 w-auto" />
                <span className="text-lg font-bold text-text">NKAY</span>
              </Link>
              <button
                type="button"
                aria-label="Close navigation"
                onClick={() => setMobileNavOpen(false)}
                className="p-2 rounded-xl hover:bg-accent-beige transition-colors"
              >
                <XIcon className="w-5 h-5 text-text-light" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-3 sm:px-4 py-4 space-y-6">
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-[#927f74] mb-3 px-2">Navigate</h3>
                <nav className="space-y-1">
                  <Link
                    to="/login"
                    onClick={() => setMobileNavOpen(false)}
                    className="flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium text-text-light hover:bg-accent-beige hover:text-primary transition-all"
                  >
                    <User className="w-5 h-5 text-text-light" />
                    Sign In
                  </Link>
                  {sidebarNav.map((item) => (
                    <Link
                      key={item.name}
                      to={item.href}
                      onClick={() => setMobileNavOpen(false)}
                      className={`flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-all ${
                        item.active
                          ? 'bg-accent-beige text-primary'
                          : 'text-text-light hover:bg-accent-beige hover:text-primary'
                      }`}
                    >
                      <item.icon className={`w-5 h-5 ${item.active ? 'text-primary' : 'text-text-light'}`} />
                      {item.name}
                    </Link>
                  ))}
                  <Link
                    to="/customer/cart"
                    onClick={() => setMobileNavOpen(false)}
                    className="flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium text-text-light hover:bg-accent-beige hover:text-primary transition-all"
                  >
                    <ShoppingCart className="w-5 h-5 text-text-light" />
                    Cart
                    {cartCount > 0 && (
                      <span className="ml-auto min-w-[20px] h-[20px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
                        {cartCount > 99 ? '99+' : cartCount}
                      </span>
                    )}
                  </Link>
                </nav>
              </div>

              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-[#927f74] mb-3 px-2">Categories</h3>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => {
                      setSelectedCategory(null);
                      setMobileNavOpen(false);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className={`inline-flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-full text-xs sm:text-sm font-medium transition-all ${
                      selectedCategory === null
                        ? 'bg-primary text-white shadow-soft'
                        : 'bg-white text-text-light hover:bg-accent-beige hover:text-primary border border-gray-100'
                    }`}
                  >
                    <Grid3x3 className="w-3.5 h-3.5" />
                    All
                  </button>
                  {businessCategories.slice(0, 11).map((category) => {
                    const isSelected = selectedCategory === category;
                    return (
                      <button
                        key={category}
                        onClick={() => {
                          setSelectedCategory(category);
                          setMobileNavOpen(false);
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                        className={`px-3 sm:px-4 py-2 rounded-full text-xs sm:text-sm font-medium transition-all border ${
                          isSelected
                            ? 'bg-primary text-white border-transparent shadow-soft'
                            : 'bg-white text-text-light hover:bg-accent-beige hover:text-primary border-gray-100'
                        }`}
                      >
                        {category}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-[#927f74] mb-3 px-2">Help</h3>
                <Link
                  to="/business/register"
                  onClick={() => setMobileNavOpen(false)}
                  className="flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium bg-primary/5 text-primary hover:bg-primary/10 transition-colors border border-primary/10"
                >
                  <Store className="w-5 h-5" />
                  Register Your Business
                </Link>
              </div>
            </div>
          </aside>
        </div>
      )}

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
        {/* Hero */}
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

        {/* Today's Deals */}
        {deals.length > 0 && (
          <section className="mb-8 sm:mb-10">
            <SectionHeader
              accent="Deals"
              title="Today's Deals"
              subtitle="Special prices on top products from Ghana's best businesses"
            />
            <div className={PRODUCT_GRID}>
              {deals.map((p) => (
                <CompactProductCard key={`deal-${p.id}`} product={p} />
              ))}
            </div>
          </section>
        )}

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

        {/* Recently Added */}
        <section className="mb-8 sm:mb-10">
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

        {/* Explore More */}
        <section className="mb-8 sm:mb-12">
          <Link
            to="/discover"
            className="relative block overflow-hidden rounded-2xl bg-gradient-to-br from-primary via-primary-light to-accent-tan shadow-soft hover:shadow-card transition-shadow duration-300"
          >
            <svg
              className="absolute inset-0 w-full h-full opacity-[0.08] pointer-events-none"
              viewBox="0 0 400 120"
              preserveAspectRatio="none"
            >
              <path d="M0,40 L80,20 L160,35 L240,15 L320,30 L400,10 V120 H0 Z" fill="currentColor" />
              <path d="M0,55 L80,35 L160,50 L240,30 L320,45 L400,25 V120 H0 Z" fill="currentColor" />
              <path d="M0,70 L80,50 L160,65 L240,45 L320,60 L400,40 V120 H0 Z" fill="currentColor" />
            </svg>
            <div className="relative px-6 sm:px-8 py-6 sm:py-8 flex flex-wrap items-center justify-between gap-4 text-white">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wide mb-1 text-accent-beige/90">Explore More</p>
                <h2 className="text-xl sm:text-2xl font-bold mb-1">Discover Every Store & Product on NKAY</h2>
                <p className="text-sm text-white/80">Browse the full marketplace — thousands of products from local businesses across Ghana.</p>
              </div>
              <span className="inline-flex items-center gap-2 bg-white/95 text-primary px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-white transition-colors whitespace-nowrap flex-shrink-0">
                Explore All
                <ArrowRight className="w-4 h-4" />
              </span>
            </div>
          </Link>
        </section>

        {/* Support Local Businesses */}
        <section className="mb-6 sm:mb-8">
          <div className="bg-white rounded-2xl shadow-card px-5 sm:px-6 py-4 sm:py-5 flex flex-wrap items-center gap-3 sm:gap-4">
            <Heart className="w-5 h-5 text-primary flex-shrink-0" />
            <p className="text-sm font-semibold text-text">Support Local Businesses</p>
            <p className="text-xs text-text-light">Every purchase supports Ghanaian entrepreneurs</p>
          </div>
        </section>
      </main>

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

      {/* Floating WhatsApp Button */}
      <a
        href="https://wa.me/552951226"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Chat with NKAY on WhatsApp"
        className="fixed bottom-20 lg:bottom-6 right-4 sm:right-6 z-[60] w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-[#25D366] text-white flex items-center justify-center shadow-lg shadow-[#25D366]/30 hover:scale-110 transition-transform duration-200"
      >
        <svg viewBox="0 0 32 32" className="w-6 h-6 sm:w-7 sm:h-7" fill="currentColor" aria-hidden="true">
          <path d="M19.11 17.205c-.372 0-1.088 1.39-1.518 1.39a.63.63 0 0 1-.315-.1c-.802-.402-1.504-.817-2.163-1.447-.545-.516-1.146-1.29-1.46-1.963a.426.426 0 0 1-.073-.215c0-.33.99-.945.99-1.49 0-.143-.73-2.09-.832-2.335-.143-.372-.214-.487-.6-.487-.187 0-.36-.043-.53-.043-.302 0-.53.115-.746.315-.688.645-1.032 1.318-1.06 2.264v.114c-.015.99.472 1.977 1.017 2.78 1.23 1.82 2.506 3.41 4.554 4.34.616.287 2.035.888 2.722.888.817 0 2.15-.515 2.478-1.318.13-.33.244-.73.244-1.088 0-.058 0-.144-.03-.215-.1-.172-2.434-1.39-2.678-1.39zm-2.908 7.593c-1.747 0-3.48-.53-4.942-1.49L7.793 24.41l1.132-3.337a8.959 8.959 0 0 1-1.72-5.193c0-4.917 3.976-8.892 8.892-8.892 2.371 0 4.587.929 6.256 2.604 1.67 1.675 2.603 3.888 2.603 6.249 0 4.917-3.976 8.893-8.892 8.893zm4.922-17.889C19.79 4.512 16.66 3.626 13.38 3.627 7.754 3.627 3.176 8.205 3.175 13.832c0 2.105.597 4.15 1.723 5.906L1 29l9.476-1.762a10.2 10.2 0 0 0 5.906 1.83h.002c5.627 0 10.205-4.578 10.206-10.206 0-2.76-1.077-5.35-3.03-7.3z"/>
        </svg>
      </a>

      {/* Mobile bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-[60] lg:hidden bg-white border-t border-gray-200">
        <div className="grid grid-cols-4 pb-[env(safe-area-inset-bottom)]">
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              `flex flex-col items-center gap-1 py-2.5 text-[10px] sm:text-[11px] font-semibold transition-colors ${isActive ? 'text-primary' : 'text-text-light hover:text-primary'}`
            }
          >
            <Home className="w-5 h-5" />
            Home
          </NavLink>
          <NavLink
            to="/discover"
            className={({ isActive }) =>
              `flex flex-col items-center gap-1 py-2.5 text-[10px] sm:text-[11px] font-semibold transition-colors ${isActive ? 'text-primary' : 'text-text-light hover:text-primary'}`
            }
          >
            <Grid3x3 className="w-5 h-5" />
            Categories
          </NavLink>
          <NavLink
            to="/customer/orders"
            className={({ isActive }) =>
              `flex flex-col items-center gap-1 py-2.5 text-[10px] sm:text-[11px] font-semibold transition-colors ${isActive ? 'text-primary' : 'text-text-light hover:text-primary'}`
            }
          >
            <Package className="w-5 h-5" />
            Orders
          </NavLink>
          <NavLink
            to="/customer/cart"
            className={({ isActive }) =>
              `flex flex-col items-center gap-1 py-2.5 text-[10px] sm:text-[11px] font-semibold transition-colors relative ${isActive ? 'text-primary' : 'text-text-light hover:text-primary'}`
            }
          >
            <span className="relative">
              <ShoppingCart className="w-5 h-5" />
              {cartCount > 0 && (
                <span className="absolute -top-1.5 -right-2 min-w-[16px] h-[16px] px-0.5 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center">
                  {cartCount > 99 ? '99+' : cartCount}
                </span>
              )}
            </span>
            Cart
          </NavLink>
        </div>
      </nav>
    </div>
  );
};
