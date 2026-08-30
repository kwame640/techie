import React from 'react';
import { cn } from '../../lib/utils';
import { LucideIcon } from 'lucide-react';

interface IconProps {
  icon: LucideIcon;
  size?: number;
  className?: string;
  onClick?: () => void;
}

export const Icon: React.FC<IconProps> = ({ icon: Icon, size = 24, className, onClick }) => {
  return (
    <Icon
      size={size}
      className={cn('transition-colors duration-200', onClick && 'cursor-pointer hover:text-primary', className)}
      onClick={onClick}
    />
  );
};
