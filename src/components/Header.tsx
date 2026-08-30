import React, { useState } from 'react';
import { Search, ShoppingBag, Heart, User, Menu, X } from 'lucide-react';
import { useShop } from '../context/ShopContext';
import { Icon } from './ui/Icon';
import { Button } from './ui/Button';
import logoImage from '../images/nkay.png';

export const Header: React.FC = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const { cartCount } = useShop();
  
  const navLinks = [
    { name: 'Home', href: '#' },
    { name: 'Shop', href: '#shop' },
    { name: 'Categories', href: '#categories' },
    { name: 'New Arrivals', href: '#new-arrivals' }
  ];
  
  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-sm border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 lg:h-20">
          {/* Logo */}
          <div className="flex-shrink-0 flex items-center gap-2">
            <img src={logoImage} alt="Nkay" className="h-10 w-auto" />
            <h1 className="text-2xl font-bold text-primary">Nkay</h1>
          </div>
          
          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center space-x-8">
            {navLinks.map(link => (
              <a
                key={link.name}
                href={link.href}
                className="text-text hover:text-primary transition-colors font-medium"
              >
                {link.name}
              </a>
            ))}
          </nav>
          
          {/* Right Icons */}
          <div className="flex items-center space-x-4">
            {/* Search */}
            <button
              onClick={() => setIsSearchOpen(!isSearchOpen)}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <Icon icon={Search} size={20} />
            </button>
            
            {/* Wishlist */}
            <button className="p-2 hover:bg-gray-100 rounded-full transition-colors hidden sm:block">
              <Icon icon={Heart} size={20} />
            </button>
            
            {/* Account */}
            <button className="p-2 hover:bg-gray-100 rounded-full transition-colors hidden sm:block">
              <Icon icon={User} size={20} />
            </button>
            
            {/* Cart */}
            <button className="p-2 hover:bg-gray-100 rounded-full transition-colors relative">
              <Icon icon={ShoppingBag} size={20} />
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-primary text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
                  {cartCount}
                </span>
              )}
            </button>
            
            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="lg:hidden p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              {isMobileMenuOpen ? <Icon icon={X} size={24} /> : <Icon icon={Menu} size={24} />}
            </button>
          </div>
        </div>
        
        {/* Search Bar */}
        {isSearchOpen && (
          <div className="py-4 border-t border-gray-100">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Search products..."
                className="w-full pl-10 pr-4 py-3 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
          </div>
        )}
        
        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="lg:hidden py-4 border-t border-gray-100">
            <nav className="flex flex-col space-y-4">
              {navLinks.map(link => (
                <a
                  key={link.name}
                  href={link.href}
                  className="text-text hover:text-primary transition-colors font-medium py-2"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  {link.name}
                </a>
              ))}
            </nav>
          </div>
        )}
      </div>
    </header>
  );
};
