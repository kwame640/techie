import { useState } from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Star, Clock, Truck, Store } from 'lucide-react';
import { sampleBusinesses, sampleProducts, businessCategories } from '../../data/marketplaceData';
import { TypingText } from '../../components/TypingText';
import { LaunchCountdown } from '../../components/LaunchCountdown';

export const MarketplaceHome = () => {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showLaunchBanner, setShowLaunchBanner] = useState(true);

  const handleCloseBanner = () => {
    setShowLaunchBanner(false);
  };

  const filteredBusinesses = sampleBusinesses.filter(biz => 
    biz.status === 'live' && 
    (selectedCategory ? biz.category === selectedCategory : true)
  );

  const filteredProducts = sampleProducts.filter(prod =>
    prod.status === 'active' &&
    (selectedCategory ? prod.category === selectedCategory : true)
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2">
              <img src="/src/images/nkay.png" alt="NKAY" className="h-10 w-auto" />
            </Link>
            <div className="flex items-center gap-4">
              <Link to="/login" className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-opacity-90 transition">
                Sign In
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="bg-gradient-to-br from-primary to-primary-light text-white py-16">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            <TypingText text="Start Your Business on NKAY" speed={80} showCursor={false} />
          </h1>
          <p className="text-xl mb-8 opacity-90">
            <TypingText
              text="Join thousands of businesses growing with NKAY. Create your store, list products, and reach customers across Ghana."
              speed={30}
              showCursor={true}
            />
          </p>
          <Link
            to="/login"
            className="inline-block bg-white text-primary px-8 py-3 rounded-lg font-medium hover:bg-accent-beige transition"
          >
            Register Your Business
          </Link>
        </div>
      </section>

      {/* Categories */}
      <section className="py-12">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="text-2xl font-bold mb-6">Popular Categories</h2>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => setSelectedCategory(null)}
              className={`px-4 py-2 rounded-full transition ${
                selectedCategory === null 
                  ? 'bg-primary text-white' 
                  : 'bg-white text-text-light hover:bg-accent-beige'
              }`}
            >
              All
            </button>
            {businessCategories.slice(0, 10).map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-4 py-2 rounded-full transition ${
                  selectedCategory === category 
                    ? 'bg-primary text-white' 
                    : 'bg-white text-text-light hover:bg-accent-beige'
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Businesses Near You */}
      <section className="py-12">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="text-2xl font-bold mb-6">Businesses Near You</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredBusinesses.map((business) => (
              <Link
                key={business.id}
                to={`/store/${business.id}`}
                className="bg-white rounded-2xl shadow-card hover:shadow-soft transition overflow-hidden"
              >
                <div className="h-32 bg-gradient-to-br from-accent-beige to-accent-tan flex items-center justify-center">
                  <Store className="w-12 h-12 text-primary opacity-50" />
                </div>
                <div className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="font-semibold text-lg">{business.name}</h3>
                    <span className="flex items-center gap-1 text-sm text-text-light">
                      <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                      {business.rating}
                    </span>
                  </div>
                  <p className="text-sm text-text-light mb-3 line-clamp-2">{business.description}</p>
                  <div className="flex items-center gap-4 text-sm text-text-light">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-4 h-4" />
                      {business.city}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      {business.deliveryOptions.includes('nkay_delivery') ? 'NKAY Delivery' : 'Business Delivery'}
                    </span>
                  </div>
                  <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
                      {business.status === 'live' ? 'LIVE ✓' : 'Pending'}
                    </span>
                    <span className="text-sm font-medium text-primary">
                      {business.productCount} products
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Trending Products */}
      <section className="py-12 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="text-2xl font-bold mb-6">Trending Products</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {filteredProducts.slice(0, 8).map((product) => (
              <Link
                key={product.id}
                to={`/product/${product.id}`}
                className="bg-background rounded-2xl p-4 hover:shadow-card transition"
              >
                <div className="aspect-square bg-gradient-to-br from-accent-beige to-accent-tan rounded-xl mb-4 flex items-center justify-center">
                  <Store className="w-12 h-12 text-primary opacity-50" />
                </div>
                <h3 className="font-medium mb-2 line-clamp-2">{product.name}</h3>
                <div className="flex items-center gap-2 mb-2">
                  <span className="font-bold text-primary">
                    GH₵{product.discountPrice || product.price}
                  </span>
                  {product.discountPrice && (
                    <span className="text-sm text-text-light line-through">
                      GH₵{product.price}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 text-sm text-text-light">
                  <Truck className="w-4 h-4" />
                  <span>Delivery available</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>


      {/* Footer */}
      <footer className="bg-white py-12">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <img src="/src/images/nkay.png" alt="NKAY" className="h-10 w-auto mb-4" />
              <p className="text-text-light text-sm">
                Grow your business with NKAY. The marketplace that connects businesses with customers.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">For Customers</h4>
              <ul className="space-y-2 text-sm text-text-light">
                <li><Link to="/discover" className="hover:text-primary">Discover Businesses</Link></li>
                <li><Link to="/discover" className="hover:text-primary">Browse Products</Link></li>
                <li><Link to="/login" className="hover:text-primary">Track Orders</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">For Businesses</h4>
              <ul className="space-y-2 text-sm text-text-light">
                <li><Link to="/login" className="hover:text-primary">Register Your Business</Link></li>
                <li><Link to="/login" className="hover:text-primary">Create Your Store</Link></li>
                <li><Link to="/login" className="hover:text-primary">Sell Products</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Support</h4>
              <ul className="space-y-2 text-sm text-text-light">
                <li><Link to="#" className="hover:text-primary">Help Center</Link></li>
                <li><Link to="#" className="hover:text-primary">Contact Us</Link></li>
                <li><Link to="#" className="hover:text-primary">Terms of Service</Link></li>
              </ul>
            </div>
          </div>
           <div className="mt-8 pt-8 border-t border-gray-200 text-center text-sm text-text-light">
            <p>© 2024 NKAY. All rights reserved.</p>
          </div>
        </div>
      </footer>

      {/* Launch Countdown Overlay */}
      {showLaunchBanner && <LaunchCountdown onClose={handleCloseBanner} />}
    </div>
  );
};
