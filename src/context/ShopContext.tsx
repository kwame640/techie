import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { Product, CartItem } from '../types';
import { useAuth } from './AuthContext';

export interface LastAddedItem {
  product: Product;
  quantity: number;
}

interface ShopContextType {
  cart: CartItem[];
  wishlist: Product[];
  lastAdded: LastAddedItem | null;
  pendingCheckout: string | null;
  checkoutEmail: string;
  addToCart: (product: Product, quantity?: number, color?: string, size?: string) => void;
  removeFromCart: (productId: string) => void;
  clearCart: () => void;
  updateQuantity: (productId: string, quantity: number) => void;
  requestCheckout: (path: string) => void;
  clearPendingCheckout: () => void;
  setCheckoutEmail: (email: string) => void;
  addToWishlist: (product: Product) => void;
  removeFromWishlist: (productId: string) => void;
  isInWishlist: (productId: string) => boolean;
  cartTotal: number;
  cartCount: number;
}

const ShopContext = createContext<ShopContextType | undefined>(undefined);

const GUEST_CART_KEY = 'cart:guest';
const GUEST_WISHLIST_KEY = 'wishlist:guest';

// Carts and wishlists belong to the account that created them. Guests get
// their own storage, so a brand-new visitor always starts with 0 items and a
// new account never inherits another user's cart from the same device.
const storageKeysFor = (userId?: string) =>
  userId
    ? { cart: `cart:user:${userId}`, wishlist: `wishlist:user:${userId}` }
    : { cart: GUEST_CART_KEY, wishlist: GUEST_WISHLIST_KEY };

const readStoredList = <T,>(key: string): T[] => {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
};

const mergeCarts = (target: CartItem[], extra: CartItem[]): CartItem[] => {
  const byProductId = new Map(target.map((item) => [item.product.id, item]));
  for (const item of extra) {
    const existing = byProductId.get(item.product.id);
    byProductId.set(
      item.product.id,
      existing ? { ...existing, quantity: existing.quantity + item.quantity } : item
    );
  }
  return Array.from(byProductId.values());
};

const mergeWishlist = (target: Product[], extra: Product[]): Product[] => {
  const ids = new Set(target.map((product) => product.id));
  return [...target, ...extra.filter((product) => !ids.has(product.id))];
};

export const ShopProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const storageKeys = storageKeysFor(user?.id);

  // Read persisted data in the lazy initialiser. A separate load effect would
  // race the save effect and overwrite the stored cart with the empty state.
  const [cart, setCart] = useState<CartItem[]>(() => readStoredList<CartItem>(storageKeys.cart));
  const [wishlist, setWishlist] = useState<Product[]>(() => readStoredList<Product>(storageKeys.wishlist));
  const [lastAdded, setLastAdded] = useState<LastAddedItem | null>(null);
  const [pendingCheckout, setPendingCheckout] = useState<string | null>(null);
  const [checkoutEmail, setCheckoutEmail] = useState('');

  // Track which storage key the in-memory data belongs to so switching
  // accounts never writes one user's cart under another user's key.
  const cartKeyRef = useRef(storageKeys.cart);
  const wishlistKeyRef = useRef(storageKeys.wishlist);

  // Switch carts when the signed-in account changes. Items a guest added are
  // carried into the account they sign in with, then the guest cart is cleared.
  useEffect(() => {
    if (cartKeyRef.current === storageKeys.cart) return;
    const previousKey = cartKeyRef.current;
    cartKeyRef.current = storageKeys.cart;
    const stored = readStoredList<CartItem>(storageKeys.cart);

    if (previousKey === GUEST_CART_KEY && user?.id) {
      localStorage.removeItem(previousKey);
      setCart(mergeCarts(stored, cart));
      return;
    }
    setCart(stored);
  }, [storageKeys.cart, user?.id, cart]);

  useEffect(() => {
    if (wishlistKeyRef.current === storageKeys.wishlist) return;
    const previousKey = wishlistKeyRef.current;
    wishlistKeyRef.current = storageKeys.wishlist;
    const stored = readStoredList<Product>(storageKeys.wishlist);

    if (previousKey === GUEST_WISHLIST_KEY && user?.id) {
      localStorage.removeItem(previousKey);
      setWishlist(mergeWishlist(stored, wishlist));
      return;
    }
    setWishlist(stored);
  }, [storageKeys.wishlist, user?.id, wishlist]);

  // Save to localStorage
  useEffect(() => {
    localStorage.setItem(cartKeyRef.current, JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    localStorage.setItem(wishlistKeyRef.current, JSON.stringify(wishlist));
  }, [wishlist]);
  
  const addToCart = (product: Product, quantity = 1, color?: string, size?: string) => {
    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) {
        return prev.map(item =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      }
      return [...prev, { product, quantity, selectedColor: color, selectedSize: size }];
    });
    setLastAdded({ product, quantity });
  };
  
  const requestCheckout = (path: string) => setPendingCheckout(path);

  const clearPendingCheckout = () => setPendingCheckout(null);

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item.product.id !== productId));
  };

  const clearCart = () => setCart([]);
  
  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }
    setCart(prev =>
      prev.map(item =>
        item.product.id === productId ? { ...item, quantity } : item
      )
    );
  };
  
  const addToWishlist = (product: Product) => {
    setWishlist(prev => {
      if (prev.some(p => p.id === product.id)) return prev;
      return [...prev, product];
    });
  };
  
  const removeFromWishlist = (productId: string) => {
    setWishlist(prev => prev.filter(p => p.id !== productId));
  };
  
  const isInWishlist = (productId: string) => {
    return wishlist.some(p => p.id === productId);
  };
  
  const cartTotal = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  
  return (
    <ShopContext.Provider
      value={{
        cart,
        wishlist,
        lastAdded,
        pendingCheckout,
        checkoutEmail,
        addToCart,
        removeFromCart,
        clearCart,
        updateQuantity,
        requestCheckout,
        clearPendingCheckout,
        setCheckoutEmail,
        addToWishlist,
        removeFromWishlist,
        isInWishlist,
        cartTotal,
        cartCount
      }}
    >
      {children}
    </ShopContext.Provider>
  );
};

export const useShop = () => {
  const context = useContext(ShopContext);
  if (context === undefined) {
    throw new Error('useShop must be used within a ShopProvider');
  }
  return context;
};
