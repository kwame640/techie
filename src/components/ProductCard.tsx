import React from 'react';
import { Link } from 'react-router-dom';
import { Product } from '../types';
import { Card, CardContent, CardFooter } from './ui/Card';
import { Button } from './ui/Button';
import { StarRating } from './ui/StarRating';
import { Badge } from './ui/Badge';
import { Heart, Eye, ShoppingCart } from 'lucide-react';
import { Icon } from './ui/Icon';
import { useShop } from '../context/ShopContext';
import { formatPrice } from '../lib/utils';

interface ProductCardProps {
  product: Product;
  onQuickView?: (product: Product) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product, onQuickView }) => {
  const { addToCart, addToWishlist, isInWishlist } = useShop();
  
  const handleAddToCart = (e: React.MouseEvent) => {
    e.stopPropagation();
    addToCart(product);
  };
  
  const handleWishlist = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isInWishlist(product.id)) {
      // removeFromWishlist(product.id);
    } else {
      addToWishlist(product);
    }
  };
  
  const handleQuickView = (e: React.MouseEvent) => {
    e.stopPropagation();
    onQuickView?.(product);
  };
  
  return (
    <Link to={`/product/${product.id}`}>
      <Card className="group cursor-pointer">
        <CardContent className="p-0">
          <div className="relative aspect-square overflow-hidden rounded-t-xl">
            <img
              src={product.image}
              alt={product.name}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
            />
            
            {/* Badges */}
            <div className="absolute top-3 left-3 flex flex-col gap-2">
              {product.isNew && <Badge variant="new">New</Badge>}
              {product.isBestSeller && <Badge variant="default">Best Seller</Badge>}
              {product.discount && <Badge variant="discount">-{product.discount}%</Badge>}
            </div>
            
            {/* Quick Actions */}
            <div className="absolute top-3 right-3 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              <button
                onClick={handleWishlist}
                className="p-2 bg-white rounded-full shadow-md hover:bg-gray-100 transition-colors"
              >
                <Heart
                  size={18}
                  className={isInWishlist(product.id) ? 'fill-red-500 text-red-500' : 'text-gray-600'}
                />
              </button>
              <button
                onClick={handleQuickView}
                className="p-2 bg-white rounded-full shadow-md hover:bg-gray-100 transition-colors"
              >
                <Eye size={18} className="text-gray-600" />
              </button>
            </div>
            
            {/* Add to Cart Button */}
            <div className="absolute bottom-3 left-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              <Button
                onClick={handleAddToCart}
                className="w-full bg-primary text-white hover:bg-primary-light"
                size="sm"
              >
                <ShoppingCart size={16} className="mr-2" />
                Add to Cart
              </Button>
            </div>
          </div>
          
          <div className="p-4">
            <Link 
              to={`/category/${product.category.toLowerCase()}`}
              onClick={(e) => e.stopPropagation()}
              className="text-sm text-gray-500 hover:text-primary transition-colors mb-1 inline-block"
            >
              {product.category}
            </Link>
            <h3 className="font-semibold text-text mb-2 line-clamp-2 h-12">
              {product.name}
            </h3>
            <p className="text-sm text-gray-500 mb-3 line-clamp-2">
              {product.description}
            </p>
            <StarRating rating={product.rating} reviewCount={product.reviews} size={14} />
            <div className="mt-3 flex items-center gap-2">
              <span className="text-lg font-bold text-primary">
                {formatPrice(product.price)}
              </span>
              {product.originalPrice && (
                <span className="text-sm text-gray-400 line-through">
                  {formatPrice(product.originalPrice)}
                </span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
};
