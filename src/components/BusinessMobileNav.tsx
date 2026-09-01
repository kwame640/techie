import { Link, useLocation } from 'react-router-dom';
import { 
  TrendingUp, 
  Store, 
  Package, 
  ShoppingBag, 
  Users, 
  Truck, 
  DollarSign,
  Bell
} from 'lucide-react';

export const BusinessMobileNav = () => {
  const location = useLocation();

  const navItems = [
    { path: '/business/dashboard', icon: TrendingUp, label: 'Dashboard' },
    { path: '/business/products', icon: Package, label: 'Products' },
    { path: '/business/orders', icon: ShoppingBag, label: 'Orders' },
    { path: '/business/delivery', icon: Truck, label: 'Delivery' },
    { path: '/business/earnings', icon: DollarSign, label: 'Earnings' },
  ];

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50">
      <div className="flex justify-around items-center py-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center py-2 px-3 rounded-lg transition ${
                isActive ? 'text-primary' : 'text-text-light'
              }`}
            >
              <Icon className="w-5 h-5 mb-1" />
              <span className="text-xs">{item.label}</span>
            </Link>
          );
        })}
        <Link
          to="/business/notifications"
          className="flex flex-col items-center py-2 px-3 rounded-lg transition text-text-light"
        >
          <div className="relative">
            <Bell className="w-5 h-5 mb-1" />
            <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full"></span>
          </div>
          <span className="text-xs">Alerts</span>
        </Link>
      </div>
    </nav>
  );
};
