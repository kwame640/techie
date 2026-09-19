import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Check, X, ShoppingBag } from 'lucide-react';
import { useShop } from '../context/ShopContext';
import { formatGhc } from '../lib/utils';

export const CartMenu: React.FC = () => {
  const { lastAdded, cartTotal, cartCount } = useShop();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [closing, setClosing] = useState(false);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!lastAdded) return;
    setClosing(false);
    setOpen(true);
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(close, 5000);
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, [lastAdded]);

  const close = () => {
    setClosing(true);
    window.setTimeout(() => setOpen(false), 200);
  };

  if (!lastAdded || !open) return null;

  const item = lastAdded;
  const itemTotal = item.product.price * item.quantity;

  const goToCart = () => {
    close();
    navigate('/customer/cart');
  };

  const goToCheckout = () => {
    close();
    navigate('/customer/checkout');
  };

  return (
    <>
      <div
        aria-hidden
        onClick={close}
        className={`fixed inset-0 z-40 bg-black/30 backdrop-blur-[2px] transition-opacity duration-200 ${
          closing ? 'opacity-0' : 'opacity-100'
        }`}
      />
      <div
        role="dialog"
        aria-label="Added to cart"
        className={`fixed z-50 inset-x-0 bottom-0 sm:inset-x-auto sm:right-6 sm:bottom-6 sm:w-[380px] max-h-[85vh] overflow-y-auto bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl border border-accent-tan/40 transition-all duration-200 ${
          closing ? 'opacity-0 translate-y-4' : 'opacity-100 translate-y-0'
        }`}
      >
        <div className="flex items-center justify-between px-5 py-4 bg-primary text-white">
          <div className="flex items-center gap-2.5">
            <span className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center">
              <Check className="w-4 h-4" />
            </span>
            <span className="font-semibold">Added to Cart</span>
          </div>
          <button
            onClick={close}
            aria-label="Close"
            className="p-1 rounded-lg hover:bg-white/20 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="flex gap-3">
            <div className="w-16 h-16 rounded-xl overflow-hidden bg-accent-beige flex-shrink-0">
              {item.product.image ? (
                <img
                  src={item.product.image}
                  alt={item.product.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <ShoppingBag className="w-6 h-6 text-primary/40" />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <Link
                to={`/product/${item.product.id}`}
                onClick={close}
                className="block text-sm font-semibold text-text leading-snug line-clamp-2 hover:text-primary transition-colors"
              >
                {item.product.name}
              </Link>
              <p className="text-xs text-text-light mt-1">
                Qty: {item.quantity}
              </p>
              <p className="text-sm font-bold text-primary mt-1">
                {formatGhc(itemTotal)}
              </p>
            </div>
          </div>

          <div className="border-t border-dashed border-accent-tan/50 pt-4 flex items-center justify-between">
            <span className="text-sm text-text-light">
              Cart total ({cartCount} {cartCount === 1 ? 'item' : 'items'})
            </span>
            <span className="text-lg font-bold text-text">{formatGhc(cartTotal)}</span>
          </div>

          <div className="flex gap-3">
            <button
              onClick={goToCart}
              className="flex-1 bg-primary hover:bg-primary-light text-white py-3 rounded-xl text-sm font-semibold transition-colors"
            >
              Go to Cart
            </button>
            <button
              onClick={goToCheckout}
              className="flex-1 border border-primary text-primary hover:bg-primary hover:text-white py-3 rounded-xl text-sm font-semibold transition-colors"
            >
              Checkout
            </button>
          </div>

          <button
            onClick={close}
            className="w-full text-center text-xs font-medium text-text-light hover:text-primary py-1 transition-colors"
          >
            Continue shopping
          </button>
        </div>
      </div>
    </>
  );
};