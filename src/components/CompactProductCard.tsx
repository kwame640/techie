import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { BadgeCheck, Heart, Star, MapPin, Store } from 'lucide-react';
import { useShop } from '../context/ShopContext';
import { formatGhc, calculateDiscount } from '../lib/utils';

export interface CompactProduct {
  id: string;
  name: string;
  image: string;
  price: number;
  originalPrice?: number;
  discountPercent?: number;
  category?: string;
  rating?: number;
  reviews?: number;
  storeName?: string;
  location?: string;
  businessId?: string;
  verified?: boolean;
  isNew?: boolean;
  isBestSeller?: boolean;
}

interface CompactProductCardProps {
  product: CompactProduct;
  eager?: boolean;
}

export const CompactProductCard: React.FC<CompactProductCardProps> = ({ product, eager = false }) => {
  const { addToWishlist, isInWishlist, addToCart } = useShop();
  const [liked, setLiked] = useState(isInWishlist(product.id));
  const [imageError, setImageError] = useState(false);

  const discountPct =
    product.discountPercent ??
    (product.originalPrice ? calculateDiscount(product.originalPrice, product.price) : 0);

  const onSale = discountPct > 0;

  const toggleHeart = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    const next = !liked;
    setLiked(next);
    if (next) {
      const shopProduct = {
        id: product.id,
        name: product.name,
        description: product.category || 'NKAY Marketplace',
        price: product.price,
        originalPrice: product.originalPrice,
        discount: discountPct || undefined,
        image: product.image,
        images: [product.image],
        category: product.category || 'General',
        rating: product.rating ?? 4.5,
        reviews: product.reviews ?? 0,
        colors: [],
        sizes: [],
        inStock: true,
        isNew: product.isNew,
        isBestSeller: product.isBestSeller,
      };
      addToWishlist(shopProduct as any);
    }
  };

  const quickAdd = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    const shopProduct = {
      id: product.id,
      name: product.name,
      description: product.category || 'NKAY Marketplace',
      price: product.price,
      originalPrice: product.originalPrice,
      discount: discountPct || undefined,
      image: product.image,
      images: [product.image],
      category: product.category || 'General',
      rating: product.rating ?? 4.5,
      reviews: product.reviews ?? 0,
      colors: [],
      sizes: [],
      inStock: true,
    };
    addToCart(shopProduct as any);
  };

  const productHref = `/product/${product.id}`;
  const storeHref = product.businessId ? `/store/${product.businessId}` : null;

  return (
    <div
      className="group block bg-white rounded-xl border border-gray-100 shadow-card hover:shadow-card-hover hover:border-accent-tan/60 transition-all duration-300 overflow-hidden h-full flex flex-col"
    >
      <div className="relative w-full aspect-[4/3] bg-gradient-to-br from-accent-beige/60 to-background overflow-hidden">
        <Link to={productHref} aria-label={product.name} className="block w-full h-full">
        {!imageError ? (
          <img
            src={product.image}
            alt={product.name}
            loading={eager ? 'eager' : 'lazy'}
            decoding="async"
            draggable={false}
            onError={() => setImageError(true)}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center p-3 text-center">
            <Store className="w-8 h-8 text-primary/40 mb-1" />
            <span className="text-[10px] sm:text-xs font-semibold text-primary/70 line-clamp-2">
              {product.name}
            </span>
          </div>
        )}
        </Link>

        <div className="absolute top-1.5 left-1.5 sm:top-2 sm:left-2 flex flex-col gap-1">
          {onSale && (
            <span className="bg-red-500 text-white text-[10px] sm:text-xs font-bold px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-lg shadow-sm">
              -{discountPct}%
            </span>
          )}
          {product.isNew && !onSale && (
            <span className="bg-primary text-white text-[10px] sm:text-xs font-bold px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-lg shadow-sm">
              New
            </span>
          )}
          {product.isBestSeller && !product.isNew && !onSale && (
            <span className="bg-yellow-500 text-white text-[10px] sm:text-xs font-bold px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-lg shadow-sm">
              Hot
            </span>
          )}
        </div>

        <div className="absolute top-1.5 right-1.5 sm:top-2 sm:right-2 flex flex-col gap-1">
          <button
            onClick={toggleHeart}
            aria-label="Save to wishlist"
            className="p-1 sm:p-1.5 bg-white/90 backdrop-blur hover:bg-white rounded-full shadow-md hover:shadow-lg transition-all"
          >
            <Heart
              className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${
                liked ? 'fill-red-500 text-red-500' : 'text-gray-600 hover:text-red-500'
              }`}
            />
          </button>
        </div>

        <button
          onClick={quickAdd}
          className="absolute left-1.5 right-1.5 sm:left-2 sm:right-2 bottom-1.5 sm:bottom-2 opacity-0 translate-y-1 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300 bg-primary/95 hover:bg-primary text-white text-[11px] sm:text-xs font-semibold py-1.5 sm:py-2 rounded-lg shadow-md whitespace-nowrap"
        >
          + Quick Add
        </button>
      </div>

      <div className="flex-1 flex flex-col p-2.5 sm:p-3 gap-1 min-h-[112px] sm:min-h-[120px]">
        {product.category && (
          <span className="text-[10px] sm:text-xs text-text-light/80 font-medium uppercase tracking-wide line-clamp-1">
            {product.category}
          </span>
        )}

        <Link
          to={productHref}
          className="text-[13px] sm:text-sm font-semibold text-text leading-snug line-clamp-2 min-h-[36px] sm:min-h-[40px]"
        >
          {product.name}
        </Link>

        {(product.storeName || product.location) && (
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] sm:text-[11px] text-text-light/80">
            {product.storeName &&
              (storeHref ? (
                <Link
                  to={storeHref}
                  className="inline-flex items-center gap-1 min-w-0 max-w-full rounded transition-colors hover:text-primary"
                >
                  <Store className="w-3 h-3 flex-shrink-0 text-primary/60" />
                  <span className="line-clamp-1 truncate">{product.storeName}</span>
                  {product.verified && <BadgeCheck className="w-3 h-3 flex-shrink-0 text-green-500" />}
                </Link>
              ) : (
                <span className="inline-flex items-center gap-1 min-w-0 max-w-full">
                  <Store className="w-3 h-3 flex-shrink-0 text-primary/60" />
                  <span className="line-clamp-1 truncate">{product.storeName}</span>
                </span>
              ))}
            {product.location && (
              <span className="inline-flex items-center gap-1 min-w-0 max-w-full">
                <MapPin className="w-3 h-3 flex-shrink-0 text-primary/60" />
                <span className="line-clamp-1 truncate">{product.location}</span>
              </span>
            )}
          </div>
        )}

        <div className="mt-auto flex items-end justify-between gap-2 pt-1">
          <div className="flex flex-col min-w-0">
            <span className="text-sm sm:text-base font-bold text-primary leading-tight whitespace-nowrap">
              {formatGhc(product.price)}
            </span>
            {product.originalPrice && product.originalPrice > product.price && (
              <span className="text-[10px] sm:text-xs text-gray-400 line-through leading-tight whitespace-nowrap">
                {formatGhc(product.originalPrice)}
              </span>
            )}
          </div>

          {product.rating != null && (
            <div className="flex items-center gap-0.5 flex-shrink-0 bg-accent-beige/40 rounded-md px-1.5 py-0.5">
              <Star className="w-3 h-3 fill-yellow-400 text-yellow-500" />
              <span className="text-[10px] sm:text-xs font-semibold text-text">
                {Number.isInteger(product.rating) ? `${product.rating}.0` : product.rating.toFixed(1)}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
