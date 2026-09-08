import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Check, MessageCircle, Phone, Send, Star, Store, Truck, WalletCards, X } from 'lucide-react';
import { sampleProducts, sampleBusinesses } from '../../data/marketplaceData';
import mtnMomoLogo from '../../images/mtn-momo.svg';
import { useShop } from '../../context/ShopContext';
import { Product as CartProduct } from '../../types';

export const ProductPage = () => {
  const { productId } = useParams<{ productId: string }>();
  const [selectedPayment, setSelectedPayment] = useState('mtn');
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessage, setChatMessage] = useState('');
  const [messages, setMessages] = useState<{ sender: 'customer' | 'vendor'; text: string }[]>([]);
  const shop = useShop();
  const navigate = useNavigate();
  const product = sampleProducts.find(p => p.id === productId);
  const business = sampleBusinesses.find(b => b.id === product?.businessId);

  if (!product || !business) {
    return <div className="min-h-screen bg-background flex items-center justify-center">Product not found</div>;
  }

  const sendMessage = () => {
    const message = chatMessage.trim();
    if (!message) return;
    setMessages((current) => [...current, { sender: 'customer', text: message }]);
    setChatMessage('');
  };

  const cartProduct: CartProduct = {
    id: product.id,
    name: product.name,
    description: product.description,
    price: product.discountPrice || product.price,
    originalPrice: product.discountPrice ? product.price : undefined,
    image: product.images[0] || '',
    images: product.images,
    category: product.category,
    rating: product.rating,
    reviews: product.reviewCount,
    colors: [],
    sizes: [],
    inStock: product.stock > 0,
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <Link to={`/store/${business.id}`} className="text-primary hover:underline mb-4 inline-block">
          ← Back to {business.name}
        </Link>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Product Image */}
          <div className="bg-white rounded-2xl p-8 shadow-card">
            <div className="aspect-square bg-gradient-to-br from-accent-beige to-accent-tan rounded-xl flex items-center justify-center">
              <Store className="w-24 h-24 text-primary opacity-50" />
            </div>
          </div>

          {/* Product Details */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Link to={`/store/${business.id}`} className="text-primary hover:underline">
                {business.name}
              </Link>
            </div>
            <h1 className="text-3xl font-bold mb-4">{product.name}</h1>
            
            <div className="flex items-center gap-4 mb-4">
              <div className="flex items-center gap-1">
                <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                <span className="font-medium">{product.rating}</span>
                <span className="text-text-light text-sm">({product.reviewCount} reviews)</span>
              </div>
              <span className="text-text-light text-sm">{product.salesCount} sold</span>
            </div>

            <div className="mb-6">
              <div className="flex items-center gap-3">
                <span className="text-3xl font-bold text-primary">
                  GH₵{product.discountPrice || product.price}
                </span>
                {product.discountPrice && (
                  <span className="text-xl text-text-light line-through">
                    GH₵{product.price}
                  </span>
                )}
              </div>
              {product.discountPrice && (
                <span className="text-green-600 text-sm">
                  Save GH₵{product.price - product.discountPrice}
                </span>
              )}
            </div>

            <p className="text-text-light mb-6">{product.description}</p>

            <div className="space-y-3 mb-6">
              <div className="flex items-center gap-2 text-sm">
                <span className="font-medium">Category:</span>
                <span className="text-text-light">{product.category}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className="font-medium">Stock:</span>
                <span className={product.stock > 0 ? 'text-green-600' : 'text-red-600'}>
                  {product.stock > 0 ? `${product.stock} available` : 'Out of stock'}
                </span>
              </div>
              {product.weight && (
                <div className="flex items-center gap-2 text-sm">
                  <span className="font-medium">Weight:</span>
                  <span className="text-text-light">{product.weight} kg</span>
                </div>
              )}
            </div>

            <div className="bg-accent-beige rounded-xl p-4 mb-6">
              <div className="flex items-center gap-2 text-sm mb-2">
                <Truck className="w-5 h-5 text-primary" />
                <span className="font-medium">Delivery</span>
              </div>
              <p className="text-sm text-text-light">
                {business.deliveryOptions.includes('nkay_delivery') ? 'NKAY Delivery available' : 
                 business.deliveryOptions.includes('business_delivery') ? 'Business delivery available' : 
                 'Customer pickup available'}
              </p>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl p-4 mb-6">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-accent-beige flex items-center justify-center text-primary">
                    <Store className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">Talk to {business.name}</p>
                    <p className="text-xs text-text-light mt-1">Have a question about this product?</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <a
                    href={`tel:${business.phone}`}
                    className="p-2 rounded-lg text-primary hover:bg-accent-beige transition"
                    aria-label={`Call ${business.name}`}
                    title={business.phone ? `Call ${business.phone}` : 'Phone number unavailable'}
                    onClick={(event) => { if (!business.phone) event.preventDefault(); }}
                  >
                    <Phone className="w-5 h-5" />
                  </a>
                  <button
                    type="button"
                    onClick={() => setChatOpen((open) => !open)}
                    className="p-2 rounded-lg text-primary hover:bg-accent-beige transition"
                    aria-label="Open chat"
                    title="Chat with vendor"
                  >
                    <MessageCircle className="w-5 h-5" />
                  </button>
                </div>
              </div>
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100 text-xs text-text-light">
                <span>{business.phone || 'Phone number not provided'}</span>
                <button type="button" onClick={() => setChatOpen(true)} className="font-semibold text-primary hover:underline">Message vendor</button>
              </div>

              {chatOpen && (
                <div className="mt-4 border border-gray-200 rounded-xl overflow-hidden">
                  <div className="flex items-center justify-between bg-accent-beige px-3 py-2">
                    <span className="text-sm font-semibold">Chat with {business.name}</span>
                    <button type="button" onClick={() => setChatOpen(false)} aria-label="Close chat"><X className="w-4 h-4" /></button>
                  </div>
                  <div className="min-h-24 max-h-40 overflow-y-auto p-3 space-y-2 bg-gray-50">
                    {messages.length === 0 ? (
                      <p className="text-xs text-text-light text-center py-3">Ask about availability, delivery, or product details.</p>
                    ) : messages.map((message, index) => (
                      <div key={`${message.sender}-${index}`} className={`flex ${message.sender === 'customer' ? 'justify-end' : 'justify-start'}`}>
                        <p className={`max-w-[85%] rounded-lg px-3 py-2 text-xs ${message.sender === 'customer' ? 'bg-primary text-white' : 'bg-white border border-gray-200 text-text'}`}>{message.text}</p>
                      </div>
                    ))}
                  </div>
                  <form onSubmit={(event) => { event.preventDefault(); sendMessage(); }} className="flex gap-2 p-2 bg-white border-t border-gray-200">
                    <input value={chatMessage} onChange={(event) => setChatMessage(event.target.value)} placeholder="Write a message..." className="min-w-0 flex-1 rounded-lg border border-gray-200 px-3 py-2 text-xs outline-none focus:border-primary" />
                    <button type="submit" className="p-2 rounded-lg bg-primary text-white hover:bg-primary-light" aria-label="Send message"><Send className="w-4 h-4" /></button>
                  </form>
                </div>
              )}
            </div>

            <div className="bg-white border border-gray-200 rounded-xl p-4 mb-6">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="font-semibold text-text">Pay with</p>
                  <p className="text-xs text-text-light mt-1">Choose your preferred payment method at checkout.</p>
                </div>
                <WalletCards className="w-5 h-5 text-primary" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'mtn', label: 'MTN MoMo', logo: mtnMomoLogo, color: 'bg-[#fff3b0]' },
                  { id: 'telecel', label: 'Telecel Cash', logo: 'https://cdn.simpleicons.org/telecel', color: 'bg-[#fce0df]' },
                  { id: 'airteltigo', label: 'AirtelTigo Money', logo: 'https://cdn.simpleicons.org/airtel', color: 'bg-[#e3eafb]' },
                  { id: 'card', label: 'Visa / Mastercard', logo: 'https://cdn.simpleicons.org/visa', color: 'bg-[#e8e4f5]' },
                  { id: 'bank', label: 'Bank transfer', logo: 'https://cdn.simpleicons.org/bankofamerica', color: 'bg-[#e4f1e7]' },
                  { id: 'cash', label: 'Cash on delivery', logo: 'https://cdn.simpleicons.org/cashapp', color: 'bg-[#f3e7df]' },
                ].map(({ id, label, logo, color }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setSelectedPayment(id)}
                    className={`relative flex items-center gap-2 rounded-lg border p-2.5 text-left transition ${selectedPayment === id ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'border-gray-200 hover:border-primary/50'}`}
                  >
                    <span className={`w-8 h-8 rounded-md flex items-center justify-center p-1.5 ${color}`}><img src={logo} alt={`${label} logo`} className="w-full h-full object-contain" /></span>
                    <span className="text-xs font-medium leading-tight">{label}</span>
                    {selectedPayment === id && <Check className="absolute top-2 right-2 w-3.5 h-3.5 text-primary" />}
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-text-light mt-3">Payment is completed securely when you place your order.</p>
            </div>

             <div className="flex flex-col gap-3">
               <button
                 onClick={() => {
                   shop.addToCart(cartProduct, 1);
                   navigate('/customer/checkout');
                 }}
                 className="w-full bg-primary text-white py-3 rounded-lg font-medium hover:bg-opacity-90 transition flex items-center justify-center gap-2"
               >
                 Buy Now
               </button>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};
