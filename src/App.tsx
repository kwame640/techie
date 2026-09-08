import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ShopProvider } from './context/ShopContext';
import { NotificationProvider } from './context/NotificationContext';

// Customer Pages
import { BusinessDiscovery } from './pages/customer/BusinessDiscovery';
import { StorePage } from './pages/customer/StorePage';
import { ProductPage } from './pages/customer/ProductPage';
import { CustomerCart } from './pages/customer/CustomerCart';
import { CustomerCheckout } from './pages/customer/CustomerCheckout';
import { CustomerOrders } from './pages/customer/CustomerOrders';
import { CustomerProfile } from './pages/customer/CustomerProfile';
import { MarketplaceHome } from './pages/customer/MarketplaceHome';
import { LaunchCountdown } from './components/LaunchCountdown';

// Business Pages
import { BusinessDashboard } from './pages/business/BusinessDashboard';
import { BusinessRegistration } from './pages/business/BusinessRegistration';
import { MyStore } from './pages/business/MyStore';
import { AddProduct, ProductManagement } from './pages/business/ProductManagement';
import { OrderManagement } from './pages/business/OrderManagement';
import { CustomerManagement } from './pages/business/CustomerManagement';
import { DeliveryCenter } from './pages/business/DeliveryCenter';
import { EarningsDashboard } from './pages/business/EarningsDashboard';
import { AnalyticsDashboard } from './pages/business/AnalyticsDashboard';
import { ReviewsManagement } from './pages/business/ReviewsManagement';
import { PromotionsManagement } from './pages/business/PromotionsManagement';
import { NotificationCenter } from './pages/business/NotificationCenter';
import { BusinessSettings } from './pages/business/BusinessSettings';
import { MediaManagement } from './pages/business/MediaManagement';

// Admin Pages
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { VendorDashboard } from './pages/vendor/VendorDashboard';

// Driver Pages
import { DriverDashboard } from './pages/driver/DriverDashboard';

// Auth Pages
import { LoginPage } from './pages/auth/LoginPage';
import { RoleSelector } from './pages/auth/RoleSelector';
import { BusinessLoginPage } from './pages/auth/BusinessLoginPage';
import { AdminLogin } from './pages/auth/AdminLogin';

// Launch Countdown Page - shows only the banner (non-closable)
const LaunchCountdownPage: React.FC = () => {
  const handleClose = () => {
    // Do nothing - can't close the banner on homepage
  };

  return (
    <div className="min-h-screen bg-background">
      <LaunchCountdown onClose={handleClose} closable={false} />
    </div>
  );
};

// Protected Route Component
const ProtectedRoute: React.FC<{ children: React.ReactNode; allowedRoles?: string[] }> = ({ 
  children, 
  allowedRoles 
}) => {
  const { user, business, driver, admin, isAuthenticated, isLoading } = useAuth();
  const activeUser = user || business || driver || admin;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-text-light">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to={allowedRoles?.includes('business') ? '/business/login' : '/login'} replace />;
  }

  if (allowedRoles && (!activeUser || !allowedRoles.includes(activeUser.role))) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

function App() {
  return (
    <ShopProvider>
      <AuthProvider>
        <NotificationProvider>
          <Router>
        <Routes>
          {/* Auth Routes - Blurred */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/role-selector" element={<RoleSelector />} />
          <Route path="/business/login" element={<BusinessLoginPage />} />
          <Route path="/business/register" element={<BusinessRegistration />} />
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/vendor-dashboard" element={<VendorDashboard />} />

          {/* Customer Routes */}
          <Route path="/" element={<MarketplaceHome />} />
          <Route path="/launch" element={<LaunchCountdownPage />} />
          <Route path="/discover" element={<BusinessDiscovery />} />
          <Route path="/store/:storeId" element={<StorePage />} />
          <Route path="/product/:productId" element={<ProductPage />} />
          <Route 
            path="/customer/cart" 
            element={
              <ProtectedRoute allowedRoles={['customer']}>
                <CustomerCart />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/customer/checkout" 
            element={<CustomerCheckout />} 
          />
          <Route 
            path="/customer/orders" 
            element={
              <ProtectedRoute allowedRoles={['customer']}>
                <CustomerOrders />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/customer/profile" 
            element={
              <ProtectedRoute allowedRoles={['customer']}>
                <CustomerProfile />
              </ProtectedRoute>
            } 
          />

          {/* Business Routes */}
          <Route 
            path="/business/dashboard" 
            element={
              <ProtectedRoute allowedRoles={['business']}>
                <BusinessDashboard />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/business/store" 
            element={
              <ProtectedRoute allowedRoles={['business']}>
                <MyStore />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/business/media" 
            element={
              <ProtectedRoute allowedRoles={['business']}>
                <MediaManagement />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/business/products" 
            element={
              <ProtectedRoute allowedRoles={['business']}>
                <ProductManagement />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/business/products/add" 
            element={
              <ProtectedRoute allowedRoles={['business']}>
                <AddProduct />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/business/orders" 
            element={
              <ProtectedRoute allowedRoles={['business']}>
                <OrderManagement />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/business/customers" 
            element={
              <ProtectedRoute allowedRoles={['business']}>
                <CustomerManagement />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/business/delivery" 
            element={
              <ProtectedRoute allowedRoles={['business']}>
                <DeliveryCenter />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/business/earnings" 
            element={
              <ProtectedRoute allowedRoles={['business']}>
                <EarningsDashboard />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/business/analytics" 
            element={
              <ProtectedRoute allowedRoles={['business']}>
                <AnalyticsDashboard />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/business/reviews" 
            element={
              <ProtectedRoute allowedRoles={['business']}>
                <ReviewsManagement />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/business/promotions" 
            element={
              <ProtectedRoute allowedRoles={['business']}>
                <PromotionsManagement />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/business/notifications" 
            element={
              <ProtectedRoute allowedRoles={['business']}>
                <NotificationCenter />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/business/settings" 
            element={
              <ProtectedRoute allowedRoles={['business']}>
                <BusinessSettings />
              </ProtectedRoute>
            } 
          />

          {/* Admin Routes - using custom auth */}


          {/* Driver Routes */}
          <Route 
            path="/driver/dashboard" 
            element={
              <ProtectedRoute allowedRoles={['driver']}>
                <DriverDashboard />
              </ProtectedRoute>
            } 
          />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        </Router>
        </NotificationProvider>
      </AuthProvider>
    </ShopProvider>
  );
}

export default App;
