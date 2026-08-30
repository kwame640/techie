import React from 'react';
import { Truck, Lock, Award, MessageSquare } from 'lucide-react';
import { Icon } from './ui/Icon';

export const Features: React.FC = () => {
  const features = [
    {
      icon: Truck,
      title: 'Fast & Reliable Delivery',
      description: 'Free shipping on orders over $50. Quick and secure delivery to your doorstep.'
    },
    {
      icon: Lock,
      title: 'Secure Payments',
      description: 'Your payment information is safe with our encrypted and secure checkout process.'
    },
    {
      icon: Award,
      title: 'Quality Products',
      description: 'We carefully curate our products to ensure the highest quality standards.'
    },
    {
      icon: MessageSquare,
      title: 'Customer Support',
      description: 'Our dedicated support team is here to help you 24/7 with any questions.'
    }
  ];
  
  return (
    <section className="py-16 lg:py-24 bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl lg:text-4xl font-bold text-text mb-4">
            Why Shop With Us
          </h2>
          <p className="text-gray-600 max-w-2xl mx-auto">
            We're committed to providing you with the best shopping experience
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((feature, index) => (
            <div
              key={index}
              className="bg-white rounded-xl p-6 text-center shadow-card hover:shadow-soft transition-shadow duration-300"
            >
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Icon icon={feature.icon} size={32} className="text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-text mb-2">
                {feature.title}
              </h3>
              <p className="text-gray-600 text-sm">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
