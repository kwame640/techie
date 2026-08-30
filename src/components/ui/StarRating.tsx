import React from 'react';
import { Star, StarHalf } from 'lucide-react';
import { cn } from '../../lib/utils';

interface StarRatingProps {
  rating: number;
  reviewCount?: number;
  size?: number;
  className?: string;
}

export const StarRating: React.FC<StarRatingProps> = ({ rating, reviewCount, size = 16, className }) => {
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 >= 0.5;
  const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
  
  return (
    <div className={cn('flex items-center gap-1', className)}>
      {[...Array(fullStars)].map((_, i) => (
        <Star key={`full-${i}`} size={size} className="fill-yellow-400 text-yellow-400" />
      ))}
      {hasHalfStar && <StarHalf size={size} className="fill-yellow-400 text-yellow-400" />}
      {[...Array(emptyStars)].map((_, i) => (
        <Star key={`empty-${i}`} size={size} className="text-gray-300" />
      ))}
      {reviewCount !== undefined && (
        <span className="text-sm text-gray-500 ml-2">({reviewCount})</span>
      )}
    </div>
  );
};
