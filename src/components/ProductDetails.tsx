import React, { useState } from 'react';
import { Product } from '../types';
import { Button } from './ui/Button';
import { StarRating } from './ui/StarRating';
import { Heart, ShoppingCart, Truck, RotateCcw, Shield } from 'lucide-react';
import { Icon } from './ui/Icon';
import { useShop } from '../context/ShopContext';
import { formatPrice } from '../lib/utils';

interface ProductDetailsProps {
  product: Product;
}

export const ProductDetails: React.FC<ProductDetailsProps> = ({ product }) => {
  const [selectedImage, setSelectedImage] = useState(0);
  const [selectedColor, setSelectedColor] = useState(product.colors[0]);
  const [selectedSize, setSelectedSize] = useState(product.sizes[0]);
  const [quantity, setQuantity] = useState(1);
  const { addToCart, addToWishlist, isInWishlist } = useShop();
  
  const handleAddToCart = () => {
    addToCart(product, quantity, selectedColor, selectedSize);
  };
  
  const handleWishlist = () => {
    if (isInWishlist(product.id)) {
      // removeFromWishlist(product.id);
    } else {
      addToWishlist(product);
    }
  };
  
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="grid lg:grid-cols-2 gap-12">
        {/* Product Gallery */}
        <div>
          <div className="relative aspect-square rounded-2xl overflow-hidden mb-4 shadow-soft">
            <img
              src={product.images[selectedImage]}
              alt={product.name}
              className="w-full h-full object-cover cursor-zoom-in"
            />
            {product.discount && (
              <div className="absolute top-4 left-4">
                <span className="bg-red-500 text-white px-3 py-1 rounded-full text-sm font-medium">
                  -{product.discount}%
                </span>
              </div>
            )}
          </div>
          
          <div className="grid grid-cols-3 gap-4">
            {product.images.map((image, index) => (
              <button
                key={index}
                onClick={() => setSelectedImage(index)}
                className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-colors ${
                  selectedImage === index ? 'border-primary' : 'border-transparent'
                }`}
              >
                <img
                  src={image}
                  alt={`${product.name} ${index + 1}`}
                  className="w-full h-full object-cover"
                />
              </button>
            ))}
          </div>
        </div>
        
        {/* Product Info */}
        <div>
          <p className="text-sm text-gray-500 mb-2">{product.category}</p>
          <h1 className="text-3xl lg:text-4xl font-bold text-text mb-4">
            {product.name}
          </h1>
          
          <div className="flex items-center gap-4 mb-4">
            <StarRating rating={product.rating} reviewCount={product.reviews} />
            <span className="text-gray-500">|</span>
            <span className="text-sm text-gray-500">{product.reviews} reviews</span>
          </div>
          
          <div className="flex items-center gap-4 mb-6">
            <span className="text-3xl font-bold text-primary">
              {formatPrice(product.price)}
            </span>
            {product.originalPrice && (
              <>
                <span className="text-xl text-gray-400 line-through">
                  {formatPrice(product.originalPrice)}
                </span>
                <span className="text-red-500 font-medium">
                  Save {formatPrice(product.originalPrice - product.price)}
                </span>
              </>
            )}
          </div>
          
          <p className="text-gray-600 mb-8 leading-relaxed">
            {product.description}
          </p>
          
          {/* Color Selection */}
          {product.colors.length > 0 && (
            <div className="mb-6">
              <h3 className="font-semibold text-text mb-3">Color</h3>
              <div className="flex gap-3">
                {product.colors.map((color) => (
                  <button
                    key={color}
                    onClick={() => setSelectedColor(color)}
                    className={`w-10 h-10 rounded-full border-2 transition-transform ${
                      selectedColor === color ? 'border-primary scale-110' : 'border-gray-300'
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>
          )}
          
          {/* Size Selection */}
          {product.sizes.length > 0 && (
            <div className="mb-6">
              <h3 className="font-semibold text-text mb-3">Size</h3>
              <div className="flex gap-3">
                {product.sizes.map((size) => (
                  <button
                    key={size}
                    onClick={() => setSelectedSize(size)}
                    className={`px-4 py-2 rounded-lg border-2 font-medium transition-colors ${
                      selectedSize === size
                        ? 'border-primary bg-primary text-white'
                        : 'border-gray-300 text-text hover:border-primary'
                    }`}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>
          )}
          
          {/* Quantity */}
          <div className="mb-6">
            <h3 className="font-semibold text-text mb-3">Quantity</h3>
            <div className="flex items-center gap-4">
              <button
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="w-10 h-10 rounded-lg border-2 border-gray-300 flex items-center justify-center hover:border-primary transition-colors"
              >
                -
              </button>
              <span className="text-xl font-semibold w-12 text-center">{quantity}</span>
              <button
                onClick={() => setQuantity(quantity + 1)}
                className="w-10 h-10 rounded-lg border-2 border-gray-300 flex items-center justify-center hover:border-primary transition-colors"
              >
                +
              </button>
            </div>
          </div>
          
          {/* Actions */}
          <div className="flex gap-4 mb-8">
            <Button onClick={handleAddToCart} size="lg" className="flex-1">
              <ShoppingCart size={20} className="mr-2" />
              Add to Cart
            </Button>
            <Button
              onClick={handleWishlist}
              variant="outline"
              size="lg"
              className="px-6"
            >
              <Heart
                size={20}
                className={isInWishlist(product.id) ? 'fill-red-500 text-red-500' : ''}
              />
            </Button>
          </div>
          
          {/* Features */}
          <div className="border-t border-gray-200 pt-6 space-y-4">
            <div className="flex items-center gap-3 text-gray-600">
              <Icon icon={Truck} size={20} className="text-primary" />
              <span>Free shipping on orders over $50</span>
            </div>
            <div className="flex items-center gap-3 text-gray-600">
              <Icon icon={RotateCcw} size={20} className="text-primary" />
              <span>30-day return policy</span>
            </div>
            <div className="flex items-center gap-3 text-gray-600">
              <Icon icon={Shield} size={20} className="text-primary" />
              <span>2-year warranty</span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Product Specifications */}
      <div className="mt-16 border-t border-gray-200 pt-8">
        <h2 className="text-2xl font-bold text-text mb-6">Product Specifications</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-background rounded-lg p-6">
            <h3 className="font-semibold text-text mb-4">Details</h3>
            <ul className="space-y-2 text-gray-600">
              <li>Category: {product.category}</li>
              <li>SKU: {product.id.toUpperCase()}</li>
              <li>Stock: {product.inStock ? 'In Stock' : 'Out of Stock'}</li>
            </ul>
          </div>
          <div className="bg-background rounded-lg p-6">
            <h3 className="font-semibold text-text mb-4">Delivery</h3>
            <ul className="space-y-2 text-gray-600">
              <li>Standard: 5-7 business days</li>
              <li>Express: 2-3 business days</li>
              <li>Free shipping on orders over $50</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
