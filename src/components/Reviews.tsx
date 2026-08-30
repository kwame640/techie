import React from 'react';
import { reviews } from '../data/products';
import { StarRating } from './ui/StarRating';
import { Quote } from 'lucide-react';
import { Icon } from './ui/Icon';

export const Reviews: React.FC = () => {
  return (
    <section className="py-16 lg:py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl lg:text-4xl font-bold text-text mb-4">
            What Our Customers Say
          </h2>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Real reviews from real customers who love our products
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {reviews.map(review => (
            <div
              key={review.id}
              className="bg-background rounded-xl p-6 shadow-card hover:shadow-soft transition-shadow duration-300"
            >
              <div className="flex items-start gap-4 mb-4">
                <img
                  src={review.avatar}
                  alt={review.customerName}
                  className="w-12 h-12 rounded-full object-cover"
                />
                <div className="flex-1">
                  <h4 className="font-semibold text-text">{review.customerName}</h4>
                  <p className="text-sm text-gray-500">{review.date}</p>
                </div>
                <Icon icon={Quote} size={20} className="text-primary/30" />
              </div>
              
              <StarRating rating={review.rating} size={14} />
              
              <p className="text-gray-600 mt-3 text-sm line-clamp-4">
                {review.review}
              </p>
              
              <div className="mt-4 pt-4 border-t border-gray-200">
                <p className="text-xs text-gray-500">
                  Purchased: <span className="text-primary font-medium">{review.productPurchased}</span>
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
