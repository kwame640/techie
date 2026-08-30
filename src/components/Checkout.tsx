import React, { useState } from 'react';
import { useShop } from '../context/ShopContext';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Select } from './ui/Select';
import { formatPrice } from '../lib/utils';

export const Checkout: React.FC = () => {
  const { cartTotal } = useShop();
  const [formData, setFormData] = useState({
    email: '',
    firstName: '',
    lastName: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    country: 'US',
    phone: '',
    cardNumber: '',
    cardName: '',
    expiryDate: '',
    cvv: ''
  });
  
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  const shipping = cartTotal >= 50 ? 0 : 9.99;
  const total = cartTotal + shipping;
  
  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.email) newErrors.email = 'Email is required';
    if (!formData.firstName) newErrors.firstName = 'First name is required';
    if (!formData.lastName) newErrors.lastName = 'Last name is required';
    if (!formData.address) newErrors.address = 'Address is required';
    if (!formData.city) newErrors.city = 'City is required';
    if (!formData.zipCode) newErrors.zipCode = 'ZIP code is required';
    if (!formData.cardNumber) newErrors.cardNumber = 'Card number is required';
    if (!formData.cardName) newErrors.cardName = 'Cardholder name is required';
    if (!formData.expiryDate) newErrors.expiryDate = 'Expiry date is required';
    if (!formData.cvv) newErrors.cvv = 'CVV is required';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      // Process order
      alert('Order placed successfully!');
    }
  };
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (errors[e.target.name]) {
      setErrors({ ...errors, [e.target.name]: '' });
    }
  };
  
  const countryOptions = [
    { value: 'US', label: 'United States' },
    { value: 'CA', label: 'Canada' },
    { value: 'UK', label: 'United Kingdom' },
    { value: 'AU', label: 'Australia' }
  ];
  
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-3xl font-bold text-text mb-8">Checkout</h1>
      
      <form onSubmit={handleSubmit} className="grid lg:grid-cols-3 gap-8">
        {/* Checkout Form */}
        <div className="lg:col-span-2 space-y-8">
          {/* Contact Information */}
          <div className="bg-white rounded-xl p-6 shadow-card">
            <h2 className="text-xl font-bold text-text mb-6">Contact Information</h2>
            <Input
              label="Email"
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              error={errors.email}
              placeholder="your@email.com"
            />
          </div>
          
          {/* Shipping Address */}
          <div className="bg-white rounded-xl p-6 shadow-card">
            <h2 className="text-xl font-bold text-text mb-6">Shipping Address</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="First Name"
                name="firstName"
                value={formData.firstName}
                onChange={handleChange}
                error={errors.firstName}
              />
              <Input
                label="Last Name"
                name="lastName"
                value={formData.lastName}
                onChange={handleChange}
                error={errors.lastName}
              />
            </div>
            <Input
              label="Address"
              name="address"
              value={formData.address}
              onChange={handleChange}
              error={errors.address}
              placeholder="123 Main St"
              className="mt-4"
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
              <Input
                label="City"
                name="city"
                value={formData.city}
                onChange={handleChange}
                error={errors.city}
              />
              <Input
                label="State/Province"
                name="state"
                value={formData.state}
                onChange={handleChange}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
              <Input
                label="ZIP/Postal Code"
                name="zipCode"
                value={formData.zipCode}
                onChange={handleChange}
                error={errors.zipCode}
              />
              <Select
                label="Country"
                name="country"
                value={formData.country}
                onChange={handleChange}
                options={countryOptions}
              />
            </div>
            <Input
              label="Phone"
              name="phone"
              type="tel"
              value={formData.phone}
              onChange={handleChange}
              placeholder="+1 (555) 000-0000"
              className="mt-4"
            />
          </div>
          
          {/* Payment Method */}
          <div className="bg-white rounded-xl p-6 shadow-card">
            <h2 className="text-xl font-bold text-text mb-6">Payment Method</h2>
            
            <div className="space-y-4">
              <Input
                label="Card Number"
                name="cardNumber"
                value={formData.cardNumber}
                onChange={handleChange}
                error={errors.cardNumber}
                placeholder="1234 5678 9012 3456"
              />
              <Input
                label="Cardholder Name"
                name="cardName"
                value={formData.cardName}
                onChange={handleChange}
                error={errors.cardName}
                placeholder="John Doe"
              />
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Expiry Date"
                  name="expiryDate"
                  value={formData.expiryDate}
                  onChange={handleChange}
                  error={errors.expiryDate}
                  placeholder="MM/YY"
                />
                <Input
                  label="CVV"
                  name="cvv"
                  value={formData.cvv}
                  onChange={handleChange}
                  error={errors.cvv}
                  placeholder="123"
                />
              </div>
            </div>
            
            <div className="flex items-center gap-2 mt-4 text-sm text-gray-500">
              <span>🔒</span>
              <span>Your payment information is secure and encrypted</span>
            </div>
          </div>
        </div>
        
        {/* Order Summary */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl p-6 shadow-card sticky top-24">
            <h2 className="text-xl font-bold text-text mb-6">Order Summary</h2>
            
            <div className="space-y-4 mb-6">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal</span>
                <span>{formatPrice(cartTotal)}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Shipping</span>
                <span>{shipping === 0 ? 'Free' : formatPrice(shipping)}</span>
              </div>
              <div className="border-t border-gray-200 pt-4 flex justify-between font-bold text-text">
                <span>Total</span>
                <span className="text-xl">{formatPrice(total)}</span>
              </div>
            </div>
            
            <Button type="submit" size="lg" className="w-full">
              Place Order
            </Button>
            
            <p className="text-center text-sm text-gray-500 mt-4">
              By placing this order, you agree to our Terms & Conditions
            </p>
          </div>
        </div>
      </form>
    </div>
  );
};
