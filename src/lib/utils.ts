import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatPrice(price: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(price)
}

export function formatGhc(price: number): string {
  const rounded = Math.round(price * 100) / 100
  return (
    'GH₵ ' +
    new Intl.NumberFormat('en-GH', {
      minimumFractionDigits: rounded % 1 === 0 ? 0 : 2,
      maximumFractionDigits: 2,
    }).format(rounded)
  )
}

export function calculateDiscount(originalPrice: number, currentPrice: number): number {
  if (!originalPrice || originalPrice <= currentPrice) return 0
  return Math.round(((originalPrice - currentPrice) / originalPrice) * 100)
}
