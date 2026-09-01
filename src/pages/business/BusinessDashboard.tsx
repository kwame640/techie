import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { BusinessMobileNav } from '../../components/BusinessMobileNav';
import logoImage from '../../images/nkay.png';
import { 
  TrendingUp, 
  ShoppingBag, 
  Users, 
  Package, 
  Clock, 
  CheckCircle, 
  DollarSign,
  Truck,
  Bell,
  Store,
  ArrowUpRight,
  Menu,
  X
} from 'lucide-react';
import { sampleOrders, sampleProducts, sampleNotifications } from '../../data/marketplaceData';

export const BusinessDashboard = () => {
  const { business, logout } = useAuth();
  const navigate = useNavigate();
  const [selectedPeriod, setSelectedPeriod] = useState('7days');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (!business) {
    return <div className="min-h-screen bg-background flex items-center justify-center">Loading...</div>;
  }

  // Calculate metrics
  const totalSales = sampleOrders
    .filter(o => o.businessId === business.id)
    .reduce((sum, o) => sum + o.total, 0);

  const totalOrders = sampleOrders.filter(o => o.businessId === business.id).length;
  const totalProducts = sampleProducts.filter(p => p.businessId === business.id).length;
  const pendingOrders = sampleOrders.filter(o => 
    o.businessId === business.id && o.orderStatus === 'new'
  ).length;
  const completedOrders = sampleOrders.filter(o => 
    o.businessId === business.id && o.orderStatus === 'delivered'
  ).length;
  const availableBalance = totalSales * 0.85; // After NKAY fees

  const recentOrders = sampleOrders
    .filter(o => o.businessId === business.id)
    .slice(0, 5);

  const topProducts = sampleProducts
    .filter(p => p.businessId === business.id)
    .sort((a, b) => b.salesCount - a.salesCount)
    .slice(0, 5);

  const unreadNotifications = sampleNotifications.filter(n => !n.read);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="lg:hidden p-2 hover:bg-accent-beige rounded-lg transition"
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
              <Link to="/" className="flex items-center gap-2">
                <img src={logoImage} alt="NKAY" className="h-8 w-auto" />
              </Link>
              <span className="hidden md:inline text-text-light">|</span>
              <span className="hidden md:inline font-medium">{business.name}</span>
              {business.status === 'live' && (
                <span className="bg-green-100 text-green-700 text-xs px-2 py-1 rounded-full">LIVE ✓</span>
              )}
            </div>
            <div className="flex items-center gap-4">
              <button className="relative p-2 hover:bg-accent-beige rounded-lg transition">
                <Bell className="w-5 h-5" />
                {unreadNotifications.length > 0 && (
                  <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
                )}
              </button>
              <button 
                onClick={handleLogout}
                className="text-text-light hover:text-primary transition"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-40" onClick={() => setMobileMenuOpen(false)}>
          <div className="bg-white w-64 h-full p-6" onClick={(e) => e.stopPropagation()}>
            <nav className="space-y-2">
              <Link 
                to="/business/dashboard" 
                className="flex items-center gap-3 px-4 py-3 rounded-lg bg-primary text-white"
                onClick={() => setMobileMenuOpen(false)}
              >
                <TrendingUp className="w-5 h-5" />
                Dashboard
              </Link>
              <Link 
                to="/business/store" 
                className="flex items-center gap-3 px-4 py-3 rounded-lg text-text-light hover:bg-accent-beige transition"
                onClick={() => setMobileMenuOpen(false)}
              >
                <Store className="w-5 h-5" />
                My Store
              </Link>
              <Link 
                to="/business/products" 
                className="flex items-center gap-3 px-4 py-3 rounded-lg text-text-light hover:bg-accent-beige transition"
                onClick={() => setMobileMenuOpen(false)}
              >
                <Package className="w-5 h-5" />
                Products
              </Link>
              <Link 
                to="/business/orders" 
                className="flex items-center gap-3 px-4 py-3 rounded-lg text-text-light hover:bg-accent-beige transition"
                onClick={() => setMobileMenuOpen(false)}
              >
                <ShoppingBag className="w-5 h-5" />
                Orders
              </Link>
              <Link 
                to="/business/customers" 
                className="flex items-center gap-3 px-4 py-3 rounded-lg text-text-light hover:bg-accent-beige transition"
                onClick={() => setMobileMenuOpen(false)}
              >
                <Users className="w-5 h-5" />
                Customers
              </Link>
              <Link 
                to="/business/delivery" 
                className="flex items-center gap-3 px-4 py-3 rounded-lg text-text-light hover:bg-accent-beige transition"
                onClick={() => setMobileMenuOpen(false)}
              >
                <Truck className="w-5 h-5" />
                Delivery
              </Link>
              <Link 
                to="/business/earnings" 
                className="flex items-center gap-3 px-4 py-3 rounded-lg text-text-light hover:bg-accent-beige transition"
                onClick={() => setMobileMenuOpen(false)}
              >
                <DollarSign className="w-5 h-5" />
                Earnings
              </Link>
              <Link 
                to="/business/analytics" 
                className="flex items-center gap-3 px-4 py-3 rounded-lg text-text-light hover:bg-accent-beige transition"
                onClick={() => setMobileMenuOpen(false)}
              >
                <TrendingUp className="w-5 h-5" />
                Analytics
              </Link>
              <Link 
                to="/business/promotions" 
                className="flex items-center gap-3 px-4 py-3 rounded-lg text-text-light hover:bg-accent-beige transition"
                onClick={() => setMobileMenuOpen(false)}
              >
                <Package className="w-5 h-5" />
                Promotions
              </Link>
              <Link 
                to="/business/reviews" 
                className="flex items-center gap-3 px-4 py-3 rounded-lg text-text-light hover:bg-accent-beige transition"
                onClick={() => setMobileMenuOpen(false)}
              >
                <CheckCircle className="w-5 h-5" />
                Reviews
              </Link>
              <Link 
                to="/business/notifications" 
                className="flex items-center gap-3 px-4 py-3 rounded-lg text-text-light hover:bg-accent-beige transition"
                onClick={() => setMobileMenuOpen(false)}
              >
                <Bell className="w-5 h-5" />
                Notifications
                {unreadNotifications.length > 0 && (
                  <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                    {unreadNotifications.length}
                  </span>
                )}
              </Link>
              <Link 
                to="/business/settings" 
                className="flex items-center gap-3 px-4 py-3 rounded-lg text-text-light hover:bg-accent-beige transition"
                onClick={() => setMobileMenuOpen(false)}
              >
                <Clock className="w-5 h-5" />
                Settings
              </Link>
            </nav>

            <div className="mt-8 pt-8 border-t border-gray-200">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-accent-beige rounded-full flex items-center justify-center">
                  <Store className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-sm">{business.name}</p>
                  <p className="text-xs text-text-light">Store Status: {business.status === 'live' ? 'LIVE' : 'Pending'}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex">
        {/* Sidebar */}
        <aside className="w-64 bg-white min-h-screen p-6 hidden lg:block">
          <nav className="space-y-2">
            <Link 
              to="/business/dashboard" 
              className="flex items-center gap-3 px-4 py-3 rounded-lg bg-primary text-white"
            >
              <TrendingUp className="w-5 h-5" />
              Dashboard
            </Link>
            <Link 
              to="/business/store" 
              className="flex items-center gap-3 px-4 py-3 rounded-lg text-text-light hover:bg-accent-beige transition"
            >
              <Store className="w-5 h-5" />
              My Store
            </Link>
            <Link 
              to="/business/products" 
              className="flex items-center gap-3 px-4 py-3 rounded-lg text-text-light hover:bg-accent-beige transition"
            >
              <Package className="w-5 h-5" />
              Products
            </Link>
            <Link 
              to="/business/orders" 
              className="flex items-center gap-3 px-4 py-3 rounded-lg text-text-light hover:bg-accent-beige transition"
            >
              <ShoppingBag className="w-5 h-5" />
              Orders
            </Link>
            <Link 
              to="/business/customers" 
              className="flex items-center gap-3 px-4 py-3 rounded-lg text-text-light hover:bg-accent-beige transition"
            >
              <Users className="w-5 h-5" />
              Customers
            </Link>
            <Link 
              to="/business/delivery" 
              className="flex items-center gap-3 px-4 py-3 rounded-lg text-text-light hover:bg-accent-beige transition"
            >
              <Truck className="w-5 h-5" />
              Delivery
            </Link>
            <Link 
              to="/business/earnings" 
              className="flex items-center gap-3 px-4 py-3 rounded-lg text-text-light hover:bg-accent-beige transition"
            >
              <DollarSign className="w-5 h-5" />
              Earnings
            </Link>
            <Link 
              to="/business/analytics" 
              className="flex items-center gap-3 px-4 py-3 rounded-lg text-text-light hover:bg-accent-beige transition"
            >
              <TrendingUp className="w-5 h-5" />
              Analytics
            </Link>
            <Link 
              to="/business/promotions" 
              className="flex items-center gap-3 px-4 py-3 rounded-lg text-text-light hover:bg-accent-beige transition"
            >
              <Package className="w-5 h-5" />
              Promotions
            </Link>
            <Link 
              to="/business/reviews" 
              className="flex items-center gap-3 px-4 py-3 rounded-lg text-text-light hover:bg-accent-beige transition"
            >
              <CheckCircle className="w-5 h-5" />
              Reviews
            </Link>
            <Link 
              to="/business/notifications" 
              className="flex items-center gap-3 px-4 py-3 rounded-lg text-text-light hover:bg-accent-beige transition"
            >
              <Bell className="w-5 h-5" />
              Notifications
              {unreadNotifications.length > 0 && (
                <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                  {unreadNotifications.length}
                </span>
              )}
            </Link>
            <Link 
              to="/business/settings" 
              className="flex items-center gap-3 px-4 py-3 rounded-lg text-text-light hover:bg-accent-beige transition"
            >
              <Clock className="w-5 h-5" />
              Settings
            </Link>
          </nav>

          <div className="mt-8 pt-8 border-t border-gray-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-accent-beige rounded-full flex items-center justify-center">
                <Store className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="font-medium text-sm">{business.name}</p>
                <p className="text-xs text-text-light">Store Status: {business.status === 'live' ? 'LIVE' : 'Pending'}</p>
              </div>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-6 lg:p-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Welcome back, {business.name} 👋</h1>
            <p className="text-text-light">Here's what's happening with your store today.</p>
          </div>

          {/* Period Selector */}
          <div className="flex gap-2 mb-6">
            {['Today', '7days', '30days', '3months', '1year'].map((period) => (
              <button
                key={period}
                onClick={() => setSelectedPeriod(period)}
                className={`px-4 py-2 rounded-lg text-sm transition ${
                  selectedPeriod === period
                    ? 'bg-primary text-white'
                    : 'bg-white text-text-light hover:bg-accent-beige'
                }`}
              >
                {period === '7days' ? '7 Days' : period === '30days' ? '30 Days' : period}
              </button>
            ))}
          </div>

          {/* Overview Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <div className="bg-white rounded-xl p-6 shadow-card">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-accent-beige rounded-lg">
                  <DollarSign className="w-6 h-6 text-primary" />
                </div>
                <span className="flex items-center text-green-600 text-sm">
                  <ArrowUpRight className="w-4 h-4 mr-1" />
                  12%
                </span>
              </div>
              <p className="text-text-light text-sm mb-1">Total Sales</p>
              <p className="text-2xl font-bold">GH₵{totalSales.toLocaleString()}</p>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-card">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-accent-beige rounded-lg">
                  <ShoppingBag className="w-6 h-6 text-primary" />
                </div>
                <span className="flex items-center text-green-600 text-sm">
                  <ArrowUpRight className="w-4 h-4 mr-1" />
                  8%
                </span>
              </div>
              <p className="text-text-light text-sm mb-1">Orders</p>
              <p className="text-2xl font-bold">{totalOrders}</p>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-card">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-accent-beige rounded-lg">
                  <Package className="w-6 h-6 text-primary" />
                </div>
                <span className="flex items-center text-green-600 text-sm">
                  <ArrowUpRight className="w-4 h-4 mr-1" />
                  5%
                </span>
              </div>
              <p className="text-text-light text-sm mb-1">Products</p>
              <p className="text-2xl font-bold">{totalProducts}</p>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-card">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-accent-beige rounded-lg">
                  <Users className="w-6 h-6 text-primary" />
                </div>
                <span className="flex items-center text-green-600 text-sm">
                  <ArrowUpRight className="w-4 h-4 mr-1" />
                  15%
                </span>
              </div>
              <p className="text-text-light text-sm mb-1">Customers</p>
              <p className="text-2xl font-bold">{business.followerCount}</p>
            </div>
          </div>

          {/* Secondary Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <div className="bg-white rounded-xl p-6 shadow-card">
              <div className="flex items-center gap-3 mb-2">
                <Clock className="w-5 h-5 text-orange-500" />
                <p className="text-text-light text-sm">Pending Orders</p>
              </div>
              <p className="text-xl font-bold">{pendingOrders}</p>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-card">
              <div className="flex items-center gap-3 mb-2">
                <CheckCircle className="w-5 h-5 text-green-500" />
                <p className="text-text-light text-sm">Completed Orders</p>
              </div>
              <p className="text-xl font-bold">{completedOrders}</p>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-card">
              <div className="flex items-center gap-3 mb-2">
                <DollarSign className="w-5 h-5 text-primary" />
                <p className="text-text-light text-sm">Available Balance</p>
              </div>
              <p className="text-xl font-bold">GH₵{availableBalance.toLocaleString()}</p>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-card">
              <div className="flex items-center gap-3 mb-2">
                <Truck className="w-5 h-5 text-blue-500" />
                <p className="text-text-light text-sm">Total Deliveries</p>
              </div>
              <p className="text-xl font-bold">{completedOrders}</p>
            </div>
          </div>

          {/* Recent Orders & Top Products */}
          <div className="grid lg:grid-cols-2 gap-6 mb-8">
            <div className="bg-white rounded-xl shadow-card">
              <div className="p-6 border-b border-gray-100">
                <h2 className="text-lg font-semibold">Recent Orders</h2>
              </div>
              <div className="p-6">
                {recentOrders.length === 0 ? (
                  <p className="text-text-light text-center py-8">No orders yet</p>
                ) : (
                  <div className="space-y-4">
                    {recentOrders.map((order) => (
                      <Link
                        key={order.id}
                        to={`/business/orders`}
                        className="flex items-center justify-between p-4 bg-background rounded-lg hover:bg-accent-beige transition"
                      >
                        <div>
                          <p className="font-medium">{order.id}</p>
                          <p className="text-sm text-text-light">{order.customerName}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">GH₵{order.total}</p>
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            order.orderStatus === 'new' ? 'bg-orange-100 text-orange-700' :
                            order.orderStatus === 'delivered' ? 'bg-green-100 text-green-700' :
                            'bg-blue-100 text-blue-700'
                          }`}>
                            {order.orderStatus.replace('_', ' ')}
                          </span>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-card">
              <div className="p-6 border-b border-gray-100">
                <h2 className="text-lg font-semibold">Top Selling Products</h2>
              </div>
              <div className="p-6">
                {topProducts.length === 0 ? (
                  <p className="text-text-light text-center py-8">No products yet</p>
                ) : (
                  <div className="space-y-4">
                    {topProducts.map((product) => (
                      <div
                        key={product.id}
                        className="flex items-center justify-between p-4 bg-background rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 bg-accent-beige rounded-lg flex items-center justify-center">
                            <Package className="w-6 h-6 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium">{product.name}</p>
                            <p className="text-sm text-text-light">{product.salesCount} sold</p>
                          </div>
                        </div>
                        <p className="font-medium">GH₵{product.price}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Store Performance */}
          <div className="bg-white rounded-xl shadow-card p-6">
            <h2 className="text-lg font-semibold mb-4">Store Performance</h2>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
              <div>
                <p className="text-text-light text-sm mb-2">Store Rating</p>
                <p className="text-2xl font-bold flex items-center gap-2">
                  {business.rating} ★
                </p>
              </div>
              <div>
                <p className="text-text-light text-sm mb-2">Total Reviews</p>
                <p className="text-2xl font-bold">{business.reviewCount}</p>
              </div>
              <div>
                <p className="text-text-light text-sm mb-2">Store Followers</p>
                <p className="text-2xl font-bold">{business.followerCount}</p>
              </div>
              <div>
                <p className="text-text-light text-sm mb-2">Store Views</p>
                <p className="text-2xl font-bold">12,450</p>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <BusinessMobileNav />
    </div>
  );
};
