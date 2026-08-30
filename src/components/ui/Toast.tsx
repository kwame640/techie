import React, { useEffect } from 'react';
import { X, CheckCircle, ShoppingCart, Heart } from 'lucide-react';
import { cn } from '../../lib/utils';

interface ToastProps {
  message: string;
  type?: 'success' | 'cart' | 'wishlist';
  onClose: () => void;
  duration?: number;
}

export const Toast: React.FC<ToastProps> = ({ message, type = 'success', onClose, duration = 3000 }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer);
  }, [duration, onClose]);
  
  const icons = {
    success: <CheckCircle className="text-green-500" size={20} />,
    cart: <ShoppingCart className="text-primary" size={20} />,
    wishlist: <Heart className="text-red-500" size={20} />
  };
  
  return (
    <div className="fixed bottom-4 right-4 z-50 animate-slide-up">
      <div className="bg-white rounded-lg shadow-lg p-4 flex items-center gap-3 min-w-[300px]">
        {icons[type]}
        <p className="flex-1 text-sm font-medium text-text">{message}</p>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
};
