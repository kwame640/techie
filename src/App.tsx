import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';

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
import { ProductManagement } from './pages/business/ProductManagement';
import { OrderManagement } from './pages/business/OrderManagement';
import { CustomerManagement } from './pages/business/CustomerManagement';
import { DeliveryCenter } from './pages/business/DeliveryCenter';
import { EarningsDashboard } from './pages/business/EarningsDashboard';
import { AnalyticsDashboard } from './pages/business/AnalyticsDashboard';
import { ReviewsManagement } from './pages/business/ReviewsManagement';
import { PromotionsManagement } from './pages/business/PromotionsManagement';
import { NotificationCenter } from './pages/business/NotificationCenter';
import { BusinessSettings } from './pages/business/BusinessSettings';

// Admin Pages
import { AdminDashboard } from './pages/admin/AdminDashboard';

// Driver Pages
import { DriverDashboard } from './pages/driver/DriverDashboard';

// Auth Pages
import { LoginPage } from './pages/auth/LoginPage';
import { RoleSelector } from './pages/auth/RoleSelector';
import { BusinessLoginPage } from './pages/auth/BusinessLoginPage';
import { AdminLogin } from './pages/auth/AdminLogin';

// Blur Wrapper Component
const BlurWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="relative">
      <div className="filter blur-sm pointer-events-none select-none">
        {children}
      </div>
      <div className="absolute inset-0 flex items-center justify-center bg-white/30 backdrop-blur-sm">
        <div className="text-center p-6">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-text mb-2">Coming Soon</h2>
          <p className="text-text-light text-sm">This page is currently under development</p>
        </div>
      </div>
    </div>
  );
};

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
  const { user, isAuthenticated, isLoading } = useAuth();

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
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user!.role)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Auth Routes - Blurred */}
          <Route path="/login" element={<BlurWrapper><LoginPage /></BlurWrapper>} />
          <Route path="/role-selector" element={<BlurWrapper><RoleSelector /></BlurWrapper>} />
          <Route path="/business/login" element={<BlurWrapper><BusinessLoginPage /></BlurWrapper>} />
          <Route path="/business/register" element={<BusinessRegistration />} />
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin" element={<AdminDashboard />} />

          {/* Customer Routes */}
          <Route path="/" element={<MarketplaceHome />} />
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
            element={
              <ProtectedRoute allowedRoles={['customer']}>
                <CustomerCheckout />
              </ProtectedRoute>
            } 
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
            path="/business/products" 
            element={
              <ProtectedRoute allowedRoles={['business']}>
                <ProductManagement />
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
    </AuthProvider>
  );
}

export default App;
