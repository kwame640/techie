import React from 'react';
import { useParams } from 'react-router-dom';
import { ProductCard } from './ProductCard';
import { products } from '../data/products';
import { Button } from './ui/Button';

export const CategoryPage: React.FC = () => {
  const { category } = useParams<{ category: string }>();
  
  const categoryProducts = products.filter(
    product => product.category.toLowerCase() === category?.toLowerCase()
  );
  
  const categoryTitle = category ? category.charAt(0).toUpperCase() + category.slice(1) : 'Category';
  
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Header */}
      <div className="mb-12">
        <h1 className="text-4xl font-bold text-text mb-4">{categoryTitle}</h1>
        <p className="text-gray-600">
          Browse our collection of {categoryProducts.length} {categoryTitle.toLowerCase()} products
        </p>
      </div>
      
      {/* Products Grid */}
      {categoryProducts.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {categoryProducts.map(product => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      ) : (
        <div className="text-center py-20">
          <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <span className="text-4xl">📦</span>
          </div>
          <h2 className="text-2xl font-bold text-text mb-4">No products found</h2>
          <p className="text-gray-600 mb-8">
            We couldn't find any products in this category.
          </p>
          <Button onClick={() => window.location.href = '/'}>
            Back to Home
          </Button>
        </div>
      )}
    </div>
  );
};
