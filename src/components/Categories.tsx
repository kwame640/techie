import React from 'react';
import { Link } from 'react-router-dom';
import { categories } from '../data/products';
import { Card, CardContent } from './ui/Card';

export const Categories: React.FC = () => {
  return (
    <section id="categories" className="py-16 lg:py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl lg:text-4xl font-bold text-text mb-4">
            Featured Categories
          </h2>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Browse our carefully curated categories and find exactly what you're looking for
          </p>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 lg:gap-6">
          {categories.map(category => (
            <Link key={category.id} to={`/category/${category.name.toLowerCase()}`}>
              <Card className="group cursor-pointer">
                <CardContent className="p-0">
                  <div className="relative aspect-square overflow-hidden rounded-t-xl">
                    <img
                      src={category.image}
                      alt={category.name}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300" />
                  </div>
                  <div className="p-4 text-center">
                    <h3 className="font-semibold text-text mb-1">{category.name}</h3>
                    <p className="text-sm text-gray-500">{category.productCount} Products</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
};
