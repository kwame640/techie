import React from 'react';
import { Facebook, Instagram, Twitter, Linkedin, CreditCard, Truck, Shield, RotateCcw } from 'lucide-react';
import { Icon } from './ui/Icon';

export const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear();
  
  const footerLinks = {
    shop: [
      { name: 'All Products', href: '#' },
      { name: 'New Arrivals', href: '#' },
      { name: 'Best Sellers', href: '#' },
      { name: 'Sale', href: '#' },
      { name: 'Categories', href: '#' }
    ],
    customerService: [
      { name: 'Contact Us', href: '#' },
      { name: 'FAQ', href: '#' },
      { name: 'Shipping Info', href: '#' },
      { name: 'Returns', href: '#' },
      { name: 'Track Order', href: '#' }
    ],
    about: [
      { name: 'Our Story', href: '#' },
      { name: 'Careers', href: '#' },
      { name: 'Press', href: '#' },
      { name: 'Blog', href: '#' },
      { name: 'Sustainability', href: '#' }
    ],
    followUs: [
      { name: 'Facebook', href: '#', icon: Facebook },
      { name: 'Instagram', href: '#', icon: Instagram },
      { name: 'Twitter', href: '#', icon: Twitter },
      { name: 'LinkedIn', href: '#', icon: Linkedin }
    ]
  };
  
  return (
    <footer className="bg-text text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
          {/* Shop Column */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Shop</h3>
            <ul className="space-y-3">
              {footerLinks.shop.map(link => (
                <li key={link.name}>
                  <a href={link.href} className="text-gray-400 hover:text-white transition-colors">
                    {link.name}
                  </a>
                </li>
              ))}
            </ul>
          </div>
          
          {/* Customer Service Column */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Customer Service</h3>
            <ul className="space-y-3">
              {footerLinks.customerService.map(link => (
                <li key={link.name}>
                  <a href={link.href} className="text-gray-400 hover:text-white transition-colors">
                    {link.name}
                  </a>
                </li>
              ))}
            </ul>
          </div>
          
          {/* About Column */}
          <div>
            <h3 className="text-lg font-semibold mb-4">About</h3>
            <ul className="space-y-3">
              {footerLinks.about.map(link => (
                <li key={link.name}>
                  <a href={link.href} className="text-gray-400 hover:text-white transition-colors">
                    {link.name}
                  </a>
                </li>
              ))}
            </ul>
          </div>
          
          {/* Follow Us Column */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Follow Us</h3>
            <div className="flex space-x-4 mb-6">
              {footerLinks.followUs.map(link => (
                <a
                  key={link.name}
                  href={link.href}
                  className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center hover:bg-white/20 transition-colors"
                >
                  <Icon icon={link.icon} size={20} className="text-white" />
                </a>
              ))}
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center gap-3 text-gray-400">
                <Icon icon={Truck} size={18} />
                <span className="text-sm">Free shipping over $50</span>
              </div>
              <div className="flex items-center gap-3 text-gray-400">
                <Icon icon={Shield} size={18} />
                <span className="text-sm">Secure payment</span>
              </div>
              <div className="flex items-center gap-3 text-gray-400">
                <Icon icon={RotateCcw} size={18} />
                <span className="text-sm">30-day returns</span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Payment Methods */}
        <div className="border-t border-white/10 mt-12 pt-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Icon icon={CreditCard} size={20} className="text-gray-400" />
              <span className="text-gray-400 text-sm">We accept:</span>
              <div className="flex gap-2 ml-2">
                <div className="bg-white/10 px-3 py-1 rounded text-xs">Visa</div>
                <div className="bg-white/10 px-3 py-1 rounded text-xs">Mastercard</div>
                <div className="bg-white/10 px-3 py-1 rounded text-xs">PayPal</div>
                <div className="bg-white/10 px-3 py-1 rounded text-xs">Apple Pay</div>
              </div>
            </div>
            
            <div className="flex flex-wrap gap-6 text-sm text-gray-400">
              <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
              <a href="#" className="hover:text-white transition-colors">Terms & Conditions</a>
              <a href="#" className="hover:text-white transition-colors">Refund Policy</a>
            </div>
          </div>
          
          <div className="text-center mt-8 pt-8 border-t border-white/10">
            <p className="text-gray-400 text-sm">
              © {currentYear} Premium Shop. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};
