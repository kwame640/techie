import React from 'react';
import { Button } from './ui/Button';
import adImage from '../images/Ad.png';

export const Hero: React.FC = () => {
  return (
    <section className="relative overflow-hidden bg-background">
      {/* Decorative Elements */}
      <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-accent-beige/30 to-transparent" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-24">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Content */}
          <div className="relative z-10">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-text leading-tight mb-6">
              Discover Products You'll Love
            </h1>
            <p className="text-lg text-gray-600 mb-8 max-w-lg">
              Curated collection of premium products that combine quality, style, and functionality. Shop the latest trends with confidence.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Button size="lg" className="w-full sm:w-auto">
                Shop Now
              </Button>
              <Button variant="outline" size="lg" className="w-full sm:w-auto">
                Explore Collection
              </Button>
            </div>
            
            {/* Stats */}
            <div className="mt-12 flex gap-8">
              <div>
                <p className="text-3xl font-bold text-primary">0</p>
                <p className="text-sm text-gray-500">Products</p>
              </div>
              <div>
                <p className="text-3xl font-bold text-primary">0</p>
                <p className="text-sm text-gray-500">Customers</p>
              </div>
              <div>
                <p className="text-3xl font-bold text-primary">0</p>
                <p className="text-sm text-gray-500">Rating</p>
              </div>
            </div>
          </div>
          
          {/* Image */}
          <div className="relative">
            <div className="relative rounded-2xl overflow-hidden shadow-soft">
              <img
                src={adImage}
                alt="Nkay Products"
                className="w-full h-auto object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
              
              {/* Phone Screen Overlay */}
              <div className="absolute top-[35%] left-[55%] w-[25%] h-[35%] bg-white rounded-lg shadow-2xl overflow-hidden border-4 border-gray-800">
                {/* Mini Website Content */}
                <div className="h-full flex flex-col">
                  {/* Mini Header */}
                  <div className="bg-primary px-2 py-1 flex items-center gap-1">
                    <div className="w-3 h-3 bg-white/80 rounded-full"></div>
                    <div className="flex-1">
                      <div className="h-1 bg-white/60 rounded w-full"></div>
                    </div>
                  </div>
                  
                  {/* Mini Hero */}
                  <div className="bg-accent-beige p-2 flex-1">
                    <div className="h-2 bg-primary/40 rounded w-3/4 mb-1"></div>
                    <div className="h-1 bg-primary/30 rounded w-1/2 mb-2"></div>
                    <div className="grid grid-cols-2 gap-1">
                      {[1, 2, 3, 4].map(i => (
                        <div key={i} className="bg-white/80 rounded h-8"></div>
                      ))}
                    </div>
                  </div>
                  
                  {/* Mini Products */}
                  <div className="p-2 bg-white">
                    <div className="grid grid-cols-2 gap-1">
                      {[1, 2, 3, 4].map(i => (
                        <div key={i} className="bg-gray-100 rounded h-6"></div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Floating Card */}
            <div className="absolute -bottom-6 -left-6 bg-white rounded-xl shadow-soft p-4 hidden sm:block">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                  <span className="text-2xl">🎉</span>
                </div>
                <div>
                  <p className="font-semibold text-text">New Collection</p>
                  <p className="text-sm text-gray-500">Just dropped</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
