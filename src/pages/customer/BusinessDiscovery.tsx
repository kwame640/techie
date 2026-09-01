import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, MapPin, Star, Filter, Store } from 'lucide-react';
import { sampleBusinesses, businessCategories, ghanaRegions } from '../../data/marketplaceData';

export const BusinessDiscovery = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  const filteredBusinesses = sampleBusinesses.filter(biz => {
    const matchesSearch = biz.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         biz.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = !selectedCategory || biz.category === selectedCategory;
    const matchesRegion = !selectedRegion || biz.region === selectedRegion;
    const isLive = biz.status === 'live';
    
    return matchesSearch && matchesCategory && matchesRegion && isLive;
  });

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2">
              <img src="/src/images/nkay.png" alt="NKAY" className="h-10 w-auto" />
            </Link>
            <div className="flex items-center gap-4">
              <Link to="/" className="text-text-light hover:text-primary transition">
                Home
              </Link>
              <Link to="/login" className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-opacity-90 transition">
                Sign In
              </Link>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Explore Businesses</h1>
          <p className="text-text-light">Discover amazing businesses across Ghana</p>
        </div>

        {/* Search and Filters */}
        <div className="mb-8">
          <div className="flex gap-4 mb-4">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search businesses..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 px-4 py-3 rounded-xl border border-gray-200 hover:bg-accent-beige transition"
            >
              <Filter className="w-5 h-5" />
              Filters
            </button>
          </div>

          {showFilters && (
            <div className="bg-white rounded-xl p-6 shadow-card mb-4">
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium mb-3">Category</label>
                  <select
                    value={selectedCategory || ''}
                    onChange={(e) => setSelectedCategory(e.target.value || null)}
                    className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="">All Categories</option>
                    {businessCategories.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-3">Region</label>
                  <select
                    value={selectedRegion || ''}
                    onChange={(e) => setSelectedRegion(e.target.value || null)}
                    className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="">All Regions</option>
                    {ghanaRegions.map((region) => (
                      <option key={region} value={region}>{region}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="mt-4 flex gap-2">
                <button
                  onClick={() => {
                    setSelectedCategory(null);
                    setSelectedRegion(null);
                    setSearchQuery('');
                  }}
                  className="px-4 py-2 rounded-lg border border-gray-200 hover:bg-accent-beige transition"
                >
                  Clear Filters
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Category Quick Links */}
        <div className="mb-8">
          <h3 className="font-semibold mb-4">Browse by Category</h3>
          <div className="flex flex-wrap gap-2">
            {businessCategories.slice(0, 12).map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-4 py-2 rounded-full text-sm transition ${
                  selectedCategory === category 
                    ? 'bg-primary text-white' 
                    : 'bg-white border border-gray-200 hover:border-primary'
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        </div>

        {/* Business Grid */}
        <div className="mb-4">
          <p className="text-text-light mb-4">{filteredBusinesses.length} businesses found</p>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredBusinesses.map((business) => (
              <Link
                key={business.id}
                to={`/store/${business.id}`}
                className="bg-white rounded-2xl shadow-card hover:shadow-soft transition overflow-hidden"
              >
                <div className="h-40 bg-gradient-to-br from-accent-beige to-accent-tan flex items-center justify-center relative">
                  <Store className="w-16 h-16 text-primary opacity-50" />
                  {business.status === 'live' && (
                    <span className="absolute top-3 right-3 bg-green-500 text-white text-xs px-2 py-1 rounded-full">
                      LIVE
                    </span>
                  )}
                </div>
                <div className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="font-semibold text-lg">{business.name}</h3>
                    <span className="flex items-center gap-1 text-sm">
                      <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                      {business.rating}
                    </span>
                  </div>
                  <p className="text-sm text-text-light mb-2">{business.category}</p>
                  <p className="text-sm text-text-light mb-3 line-clamp-2">{business.description}</p>
                  <div className="flex items-center gap-4 text-sm text-text-light">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-4 h-4" />
                      {business.city}, {business.region}
                    </span>
                  </div>
                  <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
                    <span className="text-sm text-text-light">
                      {business.productCount} products
                    </span>
                    <span className="text-sm text-text-light">
                      {business.reviewCount} reviews
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {filteredBusinesses.length === 0 && (
          <div className="text-center py-12">
            <Store className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-text-light">No businesses found matching your criteria</p>
          </div>
        )}
      </div>
    </div>
  );
};
