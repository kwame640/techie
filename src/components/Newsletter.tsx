import React, { useState } from 'react';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Mail } from 'lucide-react';
import { Icon } from './ui/Icon';

export const Newsletter: React.FC = () => {
  const [email, setEmail] = useState('');
  const [isSubscribed, setIsSubscribed] = useState(false);
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) {
      setIsSubscribed(true);
      setEmail('');
    }
  };
  
  return (
    <section className="py-16 lg:py-24 bg-primary">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto text-center">
          <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <Icon icon={Mail} size={32} className="text-white" />
          </div>
          
          <h2 className="text-3xl lg:text-4xl font-bold text-white mb-4">
            Get the Latest Deals & New Arrivals
          </h2>
          <p className="text-white/90 mb-8">
            Subscribe to our newsletter and be the first to know about exclusive offers, new products, and more.
          </p>
          
          {isSubscribed ? (
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6">
              <p className="text-white font-semibold">
                Thank you for subscribing! 🎉
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-4">
              <Input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="flex-1 bg-white text-text"
              />
              <Button type="submit" size="lg" className="bg-white text-primary hover:bg-gray-100">
                Subscribe
              </Button>
            </form>
          )}
          
          <p className="text-white/70 text-sm mt-4">
            By subscribing, you agree to our Privacy Policy. Unsubscribe anytime.
          </p>
        </div>
      </div>
    </section>
  );
};
