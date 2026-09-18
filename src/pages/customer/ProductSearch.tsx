import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft, BadgeCheck, MapPin, Search, Star, Store } from 'lucide-react';
import { sampleBusinesses, sampleProducts } from '../../data/marketplaceData';
import { products as shopProducts } from '../../data/products';
import { CompactProductCard, type CompactProduct } from '../../components/CompactProductCard';
import { safeFetchJson } from '../../lib/fetch';
import logoImage from '../../images/nkay.png';

const PRODUCT_GRID =
  'grid grid-cols-2 gap-2.5 sm:gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6';

export const ProductSearch = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get('q') ?? '';
  const [input, setInput] = useState(query);
  const [apiBusinesses, setApiBusinesses] = useState<any[]>([]);

  useEffect(() => {
    setInput(query);
  }, [query]);

  useEffect(() => {
    const fetchBusinesses = async () => {
      try {
        const result = await safeFetchJson<any>('/api/registrations', {
          parseErrorMessage: 'NKAY server returned a non-JSON error page when loading businesses.',
        });
        if (!result.success) return;
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
            verificationStatus:
              reg.verificationStatus || (reg.status === 'Approved' ? 'approved' : 'pending'),
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

  const businesses = useMemo(() => {
    return [...apiBusinesses, ...sampleBusinesses.filter((s) => !apiBusinesses.some((a) => a.id === s.id))];
  }, [apiBusinesses]);

  const businessById = useMemo(() => {
    const map = new Map<string, any>();
    businesses.forEach((b) => map.set(b.id, b));
    return map;
  }, [businesses]);

  const allCompact: CompactProduct[] = useMemo(() => {
    const market: CompactProduct[] = sampleProducts.map((p) => {
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
        isNew:
          p.createdAt && new Date(p.createdAt).getTime() > Date.now() - 1000 * 60 * 60 * 24 * 30
            ? true
            : false,
      };
    });

    const shop: CompactProduct[] = shopProducts.map((p) => ({
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
    }));

    const combined = [...market, ...shop];
    const seen = new Set<string>();
    return combined.filter((c) => {
      if (seen.has(c.id)) return false;
      seen.add(c.id);
      return true;
    });
  }, [businessById]);

  const q = query.trim().toLowerCase();

  const matchingProducts = useMemo(() => {
    if (!q) return allCompact;
    return allCompact.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.category || '').toLowerCase().includes(q) ||
        (p.storeName || '').toLowerCase().includes(q)
    );
  }, [allCompact, q]);

  const matchingBusinesses = useMemo(() => {
    if (!q) return [];
    return businesses.filter(
      (b) =>
        b.status === 'live' &&
        (b.name.toLowerCase().includes(q) ||
          (b.category || '').toLowerCase().includes(q) ||
          (b.city || '').toLowerCase().includes(q) ||
          (b.region || '').toLowerCase().includes(q) ||
          (b.description || '').toLowerCase().includes(q))
    );
  }, [businesses, q]);

  const clearSearch = () => {
    setSearchParams({});
  };

  return (
    <div className="min-h-screen bg-background text-text font-sans">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 lg:h-20 flex items-center justify-between gap-3">
          <Link to="/" className="flex items-center gap-3 flex-shrink-0">
            <img src={logoImage} alt="NKAY" className="h-10 w-auto" />
            <div className="flex items-center">
              <span className="text-2xl font-bold text-primary hidden sm:inline">NKAY</span>
              <span className="text-xs text-text-light ml-2 hidden md:inline">SHOP • SELL • GROW</span>
            </div>
          </Link>

          <div className="flex-1 max-w-2xl">
            <form
              className="relative"
              role="search"
              onSubmit={(e) => {
                e.preventDefault();
                const t = input.trim();
                if (t) setSearchParams({ q: t });
              }}
            >
              <Search className="absolute left-3 sm:left-4 top-1/2 transform -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-text-light" />
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Search products, stores or categories..."
                className="w-full pl-9 sm:pl-12 pr-3 sm:pr-4 py-2.5 sm:py-3 rounded-xl sm:rounded-2xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-xs sm:text-sm"
              />
            </form>
          </div>

          <Link
            to="/"
            className="hidden sm:inline-flex items-center gap-2 text-xs sm:text-sm font-medium text-text-light hover:text-primary transition whitespace-nowrap"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {q && (
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-text leading-tight">
                {matchingProducts.length} product{matchingProducts.length === 1 ? '' : 's'}
                {matchingBusinesses.length > 0 &&
                  ` • ${matchingBusinesses.length} store${matchingBusinesses.length === 1 ? '' : 's'}`}{' '}
                for “{query.trim()}”
              </h1>
              <p className="text-xs sm:text-sm text-text-light mt-1">
                Found across NKAY marketplace stores and NKAY Shop
              </p>
            </div>
            <button
              onClick={clearSearch}
              className="inline-flex items-center gap-1 text-xs sm:text-sm font-semibold text-primary hover:underline whitespace-nowrap"
            >
              Clear Search
            </button>
          </div>
        )}

        {!q && (
          <div className="mb-6">
            <h1 className="text-xl sm:text-2xl font-bold text-text leading-tight">Browse NKAY Products</h1>
            <p className="text-xs sm:text-sm text-text-light mt-1">
              Search products, stores or categories to get started
            </p>
          </div>
        )}

        {matchingProducts.length > 0 && (
          <>
            <div className="flex items-center gap-2 mb-4 sm:mb-5">
              <div className="w-1 h-5 bg-primary rounded-full"></div>
              <h2 className="text-lg sm:text-xl font-bold text-text">Products</h2>
            </div>
            <div className={PRODUCT_GRID}>
              {matchingProducts.map((p) => (
                <CompactProductCard key={`search-prod-${p.id}`} product={p} />
              ))}
            </div>
          </>
        )}

        {matchingBusinesses.length > 0 && (
          <div className="mt-8 sm:mt-10">
            <div className="flex items-center gap-2 mb-4 sm:mb-5">
              <div className="w-1 h-5 bg-primary rounded-full"></div>
              <h2 className="text-lg sm:text-xl font-bold text-text">Stores &amp; Businesses</h2>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {matchingBusinesses.map((b) => (
                <Link
                  key={`search-biz-${b.id}`}
                  to={`/store/${b.id}`}
                  className="bg-white rounded-2xl shadow-card hover:shadow-soft transition overflow-hidden flex flex-col"
                >
                  <div className="h-28 bg-gradient-to-br from-accent-beige to-accent-tan flex items-center justify-center relative">
                    {b.logo ? (
                      <img src={b.logo} alt={b.name} className="w-full h-full object-cover" />
                    ) : (
                      <Store className="w-10 h-10 text-primary opacity-50" />
                    )}
                  </div>
                  <div className="p-4 flex-1 flex flex-col">
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <h3 className="font-semibold text-text leading-snug line-clamp-2 flex items-center gap-1.5 min-w-0">
                        <span className="truncate">{b.name}</span>
                        {(b.status === 'live' || b.verificationStatus === 'approved') && (
                          <BadgeCheck className="w-4 h-4 text-green-500 flex-shrink-0" />
                        )}
                      </h3>
                      <span className="flex items-center gap-0.5 text-sm text-text-light flex-shrink-0">
                        <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
                        {b.rating ?? 4.5}
                      </span>
                    </div>
                    <p className="text-xs text-text-light mb-1">{b.category}</p>
                    <div className="mt-auto pt-3 flex items-center justify-between text-xs text-text-light">
                      <span className="flex items-center gap-1 min-w-0">
                        <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                        <span className="truncate">
                          {b.city}, {b.region}
                        </span>
                      </span>
                      <span className="flex-shrink-0">{b.productCount || 0} products</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {q && matchingProducts.length === 0 && matchingBusinesses.length === 0 && (
          <div className="text-center py-16">
            <Search className="w-14 h-14 text-gray-300 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-text mb-2">No products or stores found</h2>
            <p className="text-sm text-text-light mb-6 max-w-md mx-auto">
              We couldn't find anything matching “{query.trim()}”. Try a different product, store, or
              category name.
            </p>
            <button
              onClick={clearSearch}
              className="inline-flex items-center gap-2 bg-primary text-white px-6 py-3 rounded-2xl text-sm font-semibold hover:bg-primary/90 transition"
            >
              Clear Search
            </button>
          </div>
        )}
      </div>
    </div>
  );
};