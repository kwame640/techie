import React, { useState, useEffect } from 'react';
import { Button } from './ui/Button';

export const PromoBanner: React.FC = () => {
  const [timeLeft, setTimeLeft] = useState({
    days: 3,
    hours: 12,
    minutes: 45,
    seconds: 30
  });
  
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        const { days, hours, minutes, seconds } = prev;
        
        if (seconds > 0) {
          return { ...prev, seconds: seconds - 1 };
        }
        
        if (minutes > 0) {
          return { ...prev, minutes: minutes - 1, seconds: 59 };
        }
        
        if (hours > 0) {
          return { ...prev, hours: hours - 1, minutes: 59, seconds: 59 };
        }
        
        if (days > 0) {
          return { ...prev, days: days - 1, hours: 23, minutes: 59, seconds: 59 };
        }
        
        return prev;
      });
    }, 1000);
    
    return () => clearInterval(timer);
  }, []);
  
  const TimeBox: React.FC<{ value: number; label: string }> = ({ value, label }) => (
    <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 min-w-[80px] text-center">
      <p className="text-3xl font-bold text-white">{String(value).padStart(2, '0')}</p>
      <p className="text-sm text-white/80">{label}</p>
    </div>
  );
  
  return (
    <section id="deals" className="py-16 lg:py-24 bg-primary">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div className="text-white">
            <Badge variant="sale" className="mb-4">Limited Time Offer</Badge>
            <h2 className="text-4xl lg:text-5xl font-bold mb-4">
              Up to 40% Off Selected Products
            </h2>
            <p className="text-lg text-white/90 mb-8 max-w-lg">
              Don't miss out on our biggest sale of the season. Premium products at unbeatable prices.
            </p>
            
            <div className="flex gap-4 mb-8">
              <TimeBox value={timeLeft.days} label="Days" />
              <TimeBox value={timeLeft.hours} label="Hours" />
              <TimeBox value={timeLeft.minutes} label="Minutes" />
              <TimeBox value={timeLeft.seconds} label="Seconds" />
            </div>
            
            <Button size="lg" className="bg-white text-primary hover:bg-gray-100">
              Shop Deals
            </Button>
          </div>
          
          <div className="relative">
            <div className="relative rounded-2xl overflow-hidden shadow-2xl">
              <img
                src="https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=800&h=600&fit=crop"
                alt="Sale Products"
                className="w-full h-auto object-cover"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

const Badge: React.FC<{ variant: string; className?: string; children: React.ReactNode }> = ({ variant, className, children }) => {
  return (
    <span className={className}>
      {children}
    </span>
  );
};
