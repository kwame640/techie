import { useParams } from 'react-router-dom';
import { Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { MapPin, Star, Phone, Mail, ShoppingCart, Store, Heart } from 'lucide-react';
import { sampleBusinesses, sampleProducts } from '../../data/marketplaceData';

export const StorePage = () => {
  const { storeId } = useParams<{ storeId: string }>();
  const business = sampleBusinesses.find(b => b.id === storeId);
  const products = sampleProducts.filter(p => p.businessId === storeId);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followerCount, setFollowerCount] = useState(business?.followerCount || 0);

  useEffect(() => {
    // Check if store is already followed from localStorage
    const followedStores = JSON.parse(localStorage.getItem('followedStores') || '[]');
    setIsFollowing(followedStores.includes(storeId));
  }, [storeId]);

  const handleFollow = () => {
    const followedStores = JSON.parse(localStorage.getItem('followedStores') || '[]');
    
    if (isFollowing) {
      // Unfollow
      const newFollowedStores = followedStores.filter((id: string) => id !== storeId);
      localStorage.setItem('followedStores', JSON.stringify(newFollowedStores));
      setIsFollowing(false);
      setFollowerCount(prev => Math.max(0, prev - 1));
    } else {
      // Follow
      const newFollowedStores = [...followedStores, storeId];
      localStorage.setItem('followedStores', JSON.stringify(newFollowedStores));
      setIsFollowing(true);
      setFollowerCount(prev => prev + 1);
    }
  };

  if (!business) {
    return <div className="min-h-screen bg-background flex items-center justify-center">Store not found</div>;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Store Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <Link to="/" className="inline-flex items-center gap-2 text-text-light hover:text-primary transition">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <img src="/src/images/nkay.png" alt="NKAY" className="h-6 w-auto" />
            <span className="font-medium">Marketplace</span>
          </Link>
        </div>
      </div>

      {/* Store Banner */}
      <div className="bg-gradient-to-br from-accent-beige to-accent-tan h-48 md:h-64 flex items-center justify-center">
        <Store className="w-20 h-20 text-primary opacity-50" />
      </div>

      {/* Store Info */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="bg-white rounded-2xl shadow-card p-6 md:p-8 -mt-16 relative z-10 mb-8">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl font-bold">{business.name}</h1>
                {business.status === 'live' && (
                  <span className="bg-green-100 text-green-700 text-sm px-3 py-1 rounded-full">LIVE ✓</span>
                )}
              </div>
              <p className="text-text-light mb-4">{business.description}</p>
              <div className="flex flex-wrap gap-4 text-sm text-text-light">
                <span className="flex items-center gap-1">
                  <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                  {business.rating} ({business.reviewCount} reviews)
                </span>
                <span className="flex items-center gap-1">
                  <MapPin className="w-4 h-4" />
                  {business.city}, {business.region}
                </span>
                <span className="flex items-center gap-1">
                  <ShoppingCart className="w-4 h-4" />
                  {business.productCount} products
                </span>
                <span className="flex items-center gap-1">
                  <Heart className={`w-4 h-4 ${isFollowing ? 'fill-red-500 text-red-500' : ''}`} />
                  {followerCount} followers
                </span>
              </div>
            </div>
            <button 
              onClick={handleFollow}
              className={`w-full md:w-auto px-6 py-3 rounded-lg font-medium transition flex items-center justify-center gap-2 ${
                isFollowing 
                  ? 'bg-primary text-white' 
                  : 'border border-primary text-primary hover:bg-primary hover:text-white'
              }`}
            >
              <Heart className={`w-5 h-5 ${isFollowing ? 'fill-white' : ''}`} />
              {isFollowing ? 'Following' : 'Follow Store'}
            </button>
          </div>

          <div className="mt-6 pt-6 border-t border-gray-200 grid md:grid-cols-3 gap-6">
            <div>
              <h3 className="font-semibold mb-2">Contact</h3>
              <div className="space-y-2 text-sm text-text-light">
                <span className="flex items-center gap-2">
                  <Phone className="w-4 h-4" />
                  {business.phone}
                </span>
                <span className="flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  {business.email}
                </span>
              </div>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Location</h3>
              <p className="text-sm text-text-light">{business.pickupLocation}</p>
              <p className="text-sm text-text-light">{business.digitalAddress}</p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Delivery</h3>
              <div className="flex flex-wrap gap-2">
                {business.deliveryOptions.map((option) => (
                  <span key={option} className="text-xs bg-accent-beige px-2 py-1 rounded-full">
                    {option === 'nkay_delivery' ? 'NKAY Delivery' : 
                     option === 'business_delivery' ? 'Business Delivery' : 'Customer Pickup'}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Products */}
        <h2 className="text-2xl font-bold mb-6">Products from {business.name}</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {products.map((product) => (
            <Link
              key={product.id}
              to={`/product/${product.id}`}
              className="bg-white rounded-2xl p-4 shadow-card hover:shadow-soft transition"
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
              <div className="flex items-center justify-between text-sm">
                <span className={product.stock > 0 ? 'text-green-600' : 'text-red-600'}>
                  {product.stock > 0 ? `${product.stock} in stock` : 'Out of stock'}
                </span>
                <span className="text-text-light">
                  {product.rating} ★
                </span>
              </div>
            </Link>
          ))}
        </div>

        {products.length === 0 && (
          <div className="text-center py-12">
            <Store className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-text-light">No products available yet</p>
          </div>
        )}
      </div>
    </div>
  );
};
