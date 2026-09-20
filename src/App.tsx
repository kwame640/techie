import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
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
import { ProductSearch } from './pages/customer/ProductSearch';
import { LaunchCountdown } from './components/LaunchCountdown';
import { CartMenu } from './components/CartMenu';
import { CheckoutSignInModal } from './components/CheckoutSignIn';

// Business Pages
import { BusinessDashboard } from './pages/business/BusinessDashboard';
import { BusinessRegistration } from './pages/business/BusinessRegistration';
import { EditStore } from './pages/business/EditStore';
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

// Admin Pages
import { AdminDashboard } from './pages/admin/AdminDashboard';

// Driver Pages
import { DriverDashboard } from './pages/driver/DriverDashboard';

// Auth Pages
import { LoginPage } from './pages/auth/LoginPage';
import { RoleSelector } from './pages/auth/RoleSelector';
import { BusinessLoginPage } from './pages/auth/BusinessLoginPage';
import { AdminLogin } from './pages/auth/AdminLogin';
import { VendorLoginPage } from './pages/auth/VendorLoginPage';

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

// Protected route that verifies the vendor session with the BACKEND.
// The frontend is NEVER the final authority â€” the backend
// (/api/vendor/session) re-checks the signed token and the live approval
// status stored in the database on every request.
const BusinessProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { business, isLoading: contextLoading, verifyVendorSession } = useAuth();
  const [sessionValid, setSessionValid] = useState<boolean | null>(null);
  const navigate = useNavigate();

  const hasToken = typeof localStorage !== 'undefined' && !!localStorage.getItem('vendorToken');

  useEffect(() => {
    if (contextLoading || sessionValid !== null) return;

    if (!hasToken) {
      setSessionValid(false);
      navigate('/business/login', { replace: true });
      return;
    }

    if (business) {
      setSessionValid(true);
      return;
    }

    verifyVendorSession().then((verified) => {
      setSessionValid(verified);
      if (!verified) {
        navigate('/business/login', { replace: true });
      }
    });
  }, [contextLoading, business, hasToken, sessionValid, navigate, verifyVendorSession]);

  if (contextLoading || sessionValid === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-text-light">Verifying session...</p>
        </div>
      </div>
    );
  }

  if (!sessionValid) {
    return <Navigate to="/business/login" replace />;
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
          <Route path="/vendor-login" element={<VendorLoginPage />} />
          <Route path="/vendor-dashboard" element={<Navigate to="/business/dashboard" replace />} />

          {/* Customer Routes */}
          <Route path="/" element={<MarketplaceHome />} />
          <Route path="/search" element={<ProductSearch />} />
          <Route path="/launch" element={<LaunchCountdownPage />} />
           <Route path="/discover" element={<BusinessDiscovery />} />
           <Route
             path="/store/biz-4"
             element={
               <BusinessProtectedRoute>
                 <StorePage />
               </BusinessProtectedRoute>
             }
           />
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

          {/* Business Routes - all protected by BusinessProtectedRoute
              which verifies the vendor session with the backend */}
          <Route 
            path="/business/dashboard" 
            element={
              <BusinessProtectedRoute>
                <BusinessDashboard />
              </BusinessProtectedRoute>
            } 
          />
           <Route
             path="/business/store"
             element={
              <BusinessProtectedRoute>
                <EditStore />
              </BusinessProtectedRoute>
            }
          />
          <Route 
            path="/business/products" 
            element={
              <BusinessProtectedRoute>
                <ProductManagement />
              </BusinessProtectedRoute>
            } 
          />
          <Route 
            path="/business/products/add" 
            element={
              <BusinessProtectedRoute>
                <AddProduct />
              </BusinessProtectedRoute>
            } 
          />
          <Route 
            path="/business/orders" 
            element={
              <BusinessProtectedRoute>
                <OrderManagement />
              </BusinessProtectedRoute>
            } 
          />
          <Route 
            path="/business/customers" 
            element={
              <BusinessProtectedRoute>
                <CustomerManagement />
              </BusinessProtectedRoute>
            } 
          />
          <Route 
            path="/business/delivery" 
            element={
              <BusinessProtectedRoute>
                <DeliveryCenter />
              </BusinessProtectedRoute>
            } 
          />
          <Route 
            path="/business/earnings" 
            element={
              <BusinessProtectedRoute>
                <EarningsDashboard />
              </BusinessProtectedRoute>
            } 
          />
          <Route 
            path="/business/analytics" 
            element={
              <BusinessProtectedRoute>
                <AnalyticsDashboard />
              </BusinessProtectedRoute>
            } 
          />
          <Route 
            path="/business/reviews" 
            element={
              <BusinessProtectedRoute>
                <ReviewsManagement />
              </BusinessProtectedRoute>
            } 
          />
          <Route 
            path="/business/promotions" 
            element={
              <BusinessProtectedRoute>
                <PromotionsManagement />
              </BusinessProtectedRoute>
            } 
          />
          <Route 
            path="/business/notifications" 
            element={
              <BusinessProtectedRoute>
                <NotificationCenter />
              </BusinessProtectedRoute>
            } 
          />
          <Route 
            path="/business/settings" 
            element={
              <BusinessProtectedRoute>
                <BusinessSettings />
              </BusinessProtectedRoute>
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
        <CartMenu />
        <CheckoutSignInModal />
      </Router>
        </NotificationProvider>
      </AuthProvider>
    </ShopProvider>
  );
}

export default App;

