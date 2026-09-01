import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, Filter, MoreVertical } from 'lucide-react';
import { sampleProducts } from '../../data/marketplaceData';

export const ProductManagement = () => {
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Products</h1>
        <button className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg hover:bg-opacity-90 transition">
          <Plus className="w-5 h-5" />
          Add Product
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-card">
        <div className="p-4 border-b border-gray-200 flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <button className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg hover:bg-accent-beige transition">
            <Filter className="w-5 h-5" />
            Filter
          </button>
        </div>

        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-medium text-text-light">Product</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-text-light">Category</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-text-light">Price</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-text-light">Stock</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-text-light">Status</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-text-light">Actions</th>
            </tr>
          </thead>
          <tbody>
            {sampleProducts.map((product) => (
              <tr key={product.id} className="border-t border-gray-100 hover:bg-gray-50">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-accent-beige rounded-lg"></div>
                    <div>
                      <p className="font-medium">{product.name}</p>
                      <p className="text-sm text-text-light">{product.salesCount} sold</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 text-sm">{product.category}</td>
                <td className="px-6 py-4 text-sm font-medium">GH₵{product.price}</td>
                <td className="px-6 py-4 text-sm">{product.stock}</td>
                <td className="px-6 py-4">
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    product.status === 'active' ? 'bg-green-100 text-green-700' :
                    product.status === 'draft' ? 'bg-gray-100 text-gray-700' :
                    'bg-red-100 text-red-700'
                  }`}>
                    {product.status}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <button className="p-2 hover:bg-accent-beige rounded-lg transition">
                    <MoreVertical className="w-5 h-5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
