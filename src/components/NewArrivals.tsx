import React from 'react';
import { products } from '../data/products';
import { ProductCard } from './ProductCard';

export const NewArrivals: React.FC = () => {
  const newProducts = products.filter(p => p.isNew);
  
  return (
    <section id="new-arrivals" className="py-16 lg:py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h2 className="text-3xl lg:text-4xl font-bold text-text mb-2">
            New Arrivals
          </h2>
          <p className="text-gray-600">
            Check out the latest additions to our collection
          </p>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {newProducts.map(product => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </div>
    </section>
  );
};
