import { useParams } from 'react-router-dom';
import { Link } from 'react-router-dom';
import { ShoppingCart, Star, Store, Truck } from 'lucide-react';
import { sampleProducts, sampleBusinesses } from '../../data/marketplaceData';

export const ProductPage = () => {
  const { productId } = useParams<{ productId: string }>();
  const product = sampleProducts.find(p => p.id === productId);
  const business = sampleBusinesses.find(b => b.id === product?.businessId);

  if (!product || !business) {
    return <div className="min-h-screen bg-background flex items-center justify-center">Product not found</div>;
  }

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

            <div className="flex gap-3">
              <button className="flex-1 bg-primary text-white py-3 rounded-lg font-medium hover:bg-opacity-90 transition flex items-center justify-center gap-2">
                <ShoppingCart className="w-5 h-5" />
                Add to Cart
              </button>
              <button className="px-6 py-3 rounded-lg border border-primary text-primary hover:bg-primary hover:text-white transition">
                Buy Now
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
