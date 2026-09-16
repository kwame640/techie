import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ShoppingCart, Star, Store, Truck, MapPin, Check,
  Plus, Minus, Heart, ChevronLeft, ChevronRight, ArrowLeft,
} from 'lucide-react';
import { sampleProducts, sampleBusinesses } from '../../data/marketplaceData';
import { useShop } from '../../context/ShopContext';
import type { Product as ShopProduct } from '../../types';

export const ProductPage = () => {
  const { productId } = useParams<{ productId: string }>();
  const navigate = useNavigate();
  const { addToCart, addToWishlist, isInWishlist } = useShop();
  const [quantity, setQuantity] = useState(1);
  const [activeImage, setActiveImage] = useState(0);

  const product = sampleProducts.find(p => p.id === productId);
  const business = product ? sampleBusinesses.find(b => b.id === product.businessId) : null;

  if (!product || !business) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Store className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-text-light">Product not found</p>
        </div>
      </div>
    );
  }

  const shopProduct: ShopProduct = {
    id: product.id,
    name: product.name,
    description: product.description,
    price: product.price,
    originalPrice: product.discountPrice,
    image: product.images?.[0] || '/api/placeholder/400/400',
    images: product.images || [],
    category: product.category,
    rating: product.rating,
    reviews: product.reviewCount,
    colors: [],
    sizes: [],
    inStock: product.stock > 0,
    discount: product.discountPrice
      ? Math.round(((product.price - product.discountPrice) / product.price) * 100)
      : undefined,
  };

  const price = product.discountPrice || product.price;
  const discount = product.discountPrice
    ? Math.round(((product.price - product.discountPrice) / product.price) * 100)
    : 0;
  const availableQty = product.stock > 0 ? product.stock : 0;

  const handleAddToCart = () => {
    addToCart(shopProduct, quantity);
    navigate('/customer/cart');
  };

  const handleBuyNow = () => {
    addToCart(shopProduct, quantity);
    navigate('/customer/checkout');
  };

  const handleWishlist = () => {
    if (isInWishlist(product.id)) return;
    addToWishlist(shopProduct);
  };

  const handleQuantityChange = (delta: number) => {
    const newVal = quantity + delta;
    if (newVal < 1) return;
    if (newVal > availableQty) return;
    setQuantity(newVal);
  };

  const images = product.images && product.images.length > 0 ? product.images : ['/api/placeholder/400/400'];

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Back Link */}
        <Link
          to={`/store/${business.id}`}
          className="inline-flex items-center gap-2 text-text-light hover:text-primary transition-colors mb-6 text-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to {business.name}
        </Link>

        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12">
          {/* Product Images */}
          <div className="space-y-4">
            <div className="relative">
              <div className="aspect-square rounded-2xl bg-gradient-to-br from-accent-beige to-accent-tan overflow-hidden flex items-center justify-center">
                {product.images && product.images[activeImage] ? (
                  <img
                    src={product.images[activeImage]}
                    alt={product.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Store className="w-24 h-24 text-primary/50" />
                )}
              </div>

              {product.images && product.images.length > 1 && (
                <>
                  <button
                    onClick={() => setActiveImage(Math.max(0, activeImage - 1))}
                    disabled={activeImage === 0}
                    className="absolute left-2 top-1/2 transform -translate-y-1/2 w-10 h-10 bg-white rounded-full shadow-md flex items-center justify-center text-text-light hover:text-primary disabled:opacity-40"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => setActiveImage(Math.min(images.length - 1, activeImage + 1))}
                    disabled={activeImage === images.length - 1}
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 w-10 h-10 bg-white rounded-full shadow-md flex items-center justify-center text-text-light hover:text-primary disabled:opacity-40"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </>
              )}
            </div>

            {product.images && product.images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {product.images.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setActiveImage(idx)}
                    className={`flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition-all ${
                      activeImage === idx ? 'border-primary' : 'border-gray-200'
                    }`}
                  >
                    <img
                      src={img}
                      alt={`${product.name} ${idx + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product Details */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Link
                to={`/store/${business.id}`}
                className="text-sm font-medium text-primary hover:underline"
              >
                {business.name}
              </Link>
              <span className="text-text-light">•</span>
              <span className={`text-xs px-2 py-1 rounded-full ${
                product.status === 'active'
                  ? 'bg-green-100 text-green-700'
                  : 'bg-gray-100 text-gray-500'
              }`}>
                {product.status === 'active' ? 'In Stock' : 'Out of Stock'}
              </span>
            </div>

            <h1 className="text-3xl font-bold text-text mb-4">{product.name}</h1>

            <div className="flex items-center gap-4 mb-4">
              <div className="flex items-center gap-1">
                <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                <span className="font-medium">{product.rating}</span>
                <span className="text-text-light text-sm">({product.reviewCount} reviews)</span>
              </div>
              <span className="text-text-light">•</span>
              <span className="text-sm text-text-light">{product.salesCount} sold</span>
            </div>

            <div className="flex items-center gap-3 mb-6">
              <span className="text-3xl font-bold text-primary">GH₵{price.toLocaleString()}</span>
              {product.discountPrice && (
                <>
                  <span className="text-xl text-text-light line-through">GH₵{product.price.toLocaleString()}</span>
                  <span className="text-sm bg-green-100 text-green-700 px-3 py-1 rounded-full font-semibold">
                    Save {discount}%
                  </span>
                </>
              )}
            </div>

            <p className="text-text-light mb-6 leading-relaxed">{product.description}</p>

            {/* Quantity Selector */}
            <div className="flex items-center gap-4 mb-6">
              <span className="text-sm font-medium text-text">Quantity:</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleQuantityChange(-1)}
                  disabled={quantity <= 1}
                  className="w-10 h-10 rounded-lg border border-gray-200 flex items-center justify-center text-text-light hover:text-primary hover:border-primary transition disabled:opacity-40"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="w-12 text-center font-medium text-lg">{quantity}</span>
                <button
                  onClick={() => handleQuantityChange(1)}
                  disabled={quantity >= availableQty}
                  className="w-10 h-10 rounded-lg border border-gray-200 flex items-center justify-center text-text-light hover:text-primary hover:border-primary transition disabled:opacity-40"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              <span className="text-sm text-text-light">{availableQty} available</span>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 mb-6">
              <button
                onClick={handleAddToCart}
                disabled={product.stock === 0}
                className="flex-1 flex items-center justify-center gap-2 bg-primary text-white py-3.5 rounded-2xl text-base font-semibold hover:bg-primary/90 transition disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <ShoppingCart className="w-5 h-5" />
                Add to Cart
              </button>
              <button
                onClick={handleBuyNow}
                disabled={product.stock === 0}
                className={`flex-1 py-3.5 rounded-2xl text-base font-semibold transition flex items-center justify-center gap-2 border ${
                  product.stock === 0
                    ? 'border-gray-200 text-gray-400 cursor-not-allowed'
                    : 'border-primary text-primary hover:bg-primary hover:text-white'
                }`}
              >
                Buy Now
              </button>
            </div>

            <button
              onClick={handleWishlist}
              className={`flex items-center gap-2 text-sm font-medium transition ${
                isInWishlist(product.id)
                  ? 'text-red-500'
                  : 'text-text-light hover:text-primary'
              }`}
            >
              <Heart className={`w-4 h-4 ${isInWishlist(product.id) ? 'fill-red-500' : ''}`} />
              Add to Wishlist
            </button>

            {/* Delivery Info */}
            <div className="mt-6 bg-accent-beige rounded-2xl p-4">
              <div className="flex items-center gap-3 mb-2">
                <Truck className="w-5 h-5 text-primary" />
                <span className="font-medium text-text">Delivery</span>
              </div>
              <p className="text-sm text-text-light">
                {business.deliveryOptions.includes('nkay_delivery')
                  ? 'NKAY Delivery available • 24-48 hours'
                  : 'Business delivery available'}
              </p>
            </div>

            {/* Specifications */}
            <div className="mt-6">
              <h3 className="text-lg font-bold text-text mb-4">Specifications</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white rounded-xl p-3 border border-gray-100">
                  <p className="text-xs text-text-light">Category</p>
                  <p className="font-medium text-text text-sm">{product.category}</p>
                </div>
                <div className="bg-white rounded-xl p-3 border border-gray-100">
                  <p className="text-xs text-text-light">SKU</p>
                  <p className="font-medium text-text text-sm">{product.sku || 'N/A'}</p>
                </div>
                <div className="bg-white rounded-xl p-3 border border-gray-100">
                  <p className="text-xs text-text-light">Weight</p>
                  <p className="font-medium text-text text-sm">{product.weight ? `${product.weight} kg` : 'N/A'}</p>
                </div>
                <div className="bg-white rounded-xl p-3 border border-gray-100">
                  <p className="text-xs text-text-light">Stock</p>
                  <p className="font-medium text-text text-sm">{product.stock} units</p>
                </div>
              </div>
            </div>

            {/* Business Info */}
            <div className="mt-6 pt-6 border-t border-gray-100">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-accent-beige to-accent-tan overflow-hidden flex items-center justify-center">
                  {business.logo ? (
                    <img src={business.logo} alt={business.name} className="w-full h-full object-cover" />
                  ) : (
                    <Store className="w-6 h-6 text-primary/50" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-semibold text-text">{business.name}</h4>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs">
                      <Check className="w-3 h-3" />
                      Verified
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-text-light mt-1">
                    <span className="flex items-center gap-1">
                      <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                      {business.rating} ({business.reviewCount})
                    </span>
                    <span className="flex items-center gap-1">
                      <MapPin className="w-4 h-4" />
                      {business.city}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
