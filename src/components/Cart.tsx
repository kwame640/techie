import React from 'react';
import { useShop } from '../context/ShopContext';
import { Button } from './ui/Button';
import { Trash2, Plus, Minus } from 'lucide-react';
import { Icon } from './ui/Icon';
import { formatPrice } from '../lib/utils';

export const Cart: React.FC = () => {
  const { cart, removeFromCart, updateQuantity, cartTotal } = useShop();
  
  if (cart.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center">
          <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <span className="text-4xl">🛒</span>
          </div>
          <h2 className="text-2xl font-bold text-text mb-4">Your cart is empty</h2>
          <p className="text-gray-600 mb-8">Looks like you haven't added any items to your cart yet.</p>
          <Button size="lg">Continue Shopping</Button>
        </div>
      </div>
    );
  }
  
  const shipping = cartTotal >= 50 ? 0 : 9.99;
  const total = cartTotal + shipping;
  
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-3xl font-bold text-text mb-8">Shopping Cart ({cart.length} items)</h1>
      
      <div className="grid lg:grid-cols-3 gap-8">
        {/* Cart Items */}
        <div className="lg:col-span-2 space-y-4">
          {cart.map((item) => (
            <div
              key={item.product.id}
              className="bg-white rounded-xl p-6 shadow-card flex gap-6"
            >
              <img
                src={item.product.image}
                alt={item.product.name}
                className="w-24 h-24 object-cover rounded-lg"
              />
              
              <div className="flex-1">
                <h3 className="font-semibold text-text mb-1">{item.product.name}</h3>
                <p className="text-sm text-gray-500 mb-2">{item.product.category}</p>
                
                {item.selectedColor && (
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm text-gray-500">Color:</span>
                    <div
                      className="w-5 h-5 rounded-full border border-gray-300"
                      style={{ backgroundColor: item.selectedColor }}
                    />
                  </div>
                )}
                
                {item.selectedSize && (
                  <p className="text-sm text-gray-500 mb-2">Size: {item.selectedSize}</p>
                )}
                
                <div className="flex items-center gap-4 mt-4">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                      className="w-8 h-8 rounded border border-gray-300 flex items-center justify-center hover:border-primary transition-colors"
                    >
                      <Icon icon={Minus} size={16} />
                    </button>
                    <span className="w-8 text-center font-medium">{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                      className="w-8 h-8 rounded border border-gray-300 flex items-center justify-center hover:border-primary transition-colors"
                    >
                      <Icon icon={Plus} size={16} />
                    </button>
                  </div>
                  
                  <button
                    onClick={() => removeFromCart(item.product.id)}
                    className="text-red-500 hover:text-red-600 transition-colors"
                  >
                    <Icon icon={Trash2} size={18} />
                  </button>
                </div>
              </div>
              
              <div className="text-right">
                <p className="text-lg font-bold text-primary">
                  {formatPrice(item.product.price * item.quantity)}
                </p>
                {item.product.originalPrice && (
                  <p className="text-sm text-gray-400 line-through">
                    {formatPrice(item.product.originalPrice * item.quantity)}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
        
        {/* Order Summary */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl p-6 shadow-card sticky top-24">
            <h2 className="text-xl font-bold text-text mb-6">Order Summary</h2>
            
            <div className="space-y-4 mb-6">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal</span>
                <span>{formatPrice(cartTotal)}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Shipping</span>
                <span>{shipping === 0 ? 'Free' : formatPrice(shipping)}</span>
              </div>
              <div className="border-t border-gray-200 pt-4 flex justify-between font-bold text-text">
                <span>Total</span>
                <span className="text-xl">{formatPrice(total)}</span>
              </div>
            </div>
            
            <div className="mb-6">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Promo code"
                  className="flex-1 px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                />
                <Button variant="outline">Apply</Button>
              </div>
            </div>
            
            <Button size="lg" className="w-full">
              Proceed to Checkout
            </Button>
            
            <p className="text-center text-sm text-gray-500 mt-4">
              Secure checkout powered by Stripe
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
