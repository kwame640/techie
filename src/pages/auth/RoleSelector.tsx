import { useNavigate } from 'react-router-dom';
import { Store, ShoppingBag, Truck } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import logoImage from '../../images/nkay.png';

export const RoleSelector = () => {
  const navigate = useNavigate();
  const { loginWithGoogle } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showCustomerOptions, setShowCustomerOptions] = useState(false);

  const handleCustomerGoogleSignIn = async () => {
    setIsLoading(true);
    setError('');
    try {
      await loginWithGoogle('customer');
      navigate('/');
    } catch (err: any) {
      console.error('Google sign-in failed:', err);
      setError(err.message || 'Google sign-in failed. Please try again.');
      setIsLoading(false);
    }
  };

  const handleCustomerEmailSignIn = () => {
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-4xl w-full">
        <div className="text-center mb-12">
          <img src={logoImage} alt="NKAY" className="h-16 w-auto mx-auto mb-2" />
          <p className="text-text-light text-lg">Choose how you want to use NKAY</p>
        </div>

        {error && (
          <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm text-center">
            {error}
          </div>
        )}

        {showCustomerOptions ? (
          <div className="max-w-md mx-auto bg-white rounded-2xl p-8 shadow-card">
            <div className="text-center mb-6">
              <button
                onClick={() => setShowCustomerOptions(false)}
                className="text-gray-500 hover:text-gray-700 font-semibold"
              >
                ← Back
              </button>
              <h3 className="text-2xl font-semibold mt-4 mb-2">Sign in as Customer</h3>
            </div>

            <button
              onClick={handleCustomerGoogleSignIn}
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-3 bg-white border border-gray-300 py-3 rounded-lg font-medium hover:bg-gray-50 transition disabled:opacity-50 mb-4"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              {isLoading ? 'Signing in...' : 'Sign in with Google'}
            </button>

            <div className="relative mb-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-text-light">or</span>
              </div>
            </div>

            <button
              onClick={handleCustomerEmailSignIn}
              className="w-full bg-primary text-white py-3 rounded-lg font-medium hover:bg-primary/90 transition"
            >
              Sign in with Email
            </button>
          </div>
        ) : (
          <div className="grid md:grid-cols-3 gap-6">
            <div 
              onClick={() => setShowCustomerOptions(true)}
              className="bg-white rounded-2xl p-8 shadow-card hover:shadow-soft transition cursor-pointer text-center"
            >
              <div className="p-4 bg-accent-beige rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <ShoppingBag className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Customer</h3>
              <p className="text-sm text-text-light">Shop from businesses and get deliveries</p>
            </div>

          <div 
            onClick={() => navigate('/login')}
            className="bg-white rounded-2xl p-8 shadow-card hover:shadow-soft transition cursor-pointer text-center"
          >
            <div className="p-4 bg-accent-beige rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
              <Store className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Business Owner</h3>
            <p className="text-sm text-text-light">Sell products and grow your business</p>
          </div>

          <div 
            onClick={() => navigate('/login')}
            className="bg-white rounded-2xl p-8 shadow-card hover:shadow-soft transition cursor-pointer text-center"
          >
            <div className="p-4 bg-accent-beige rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
              <Truck className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Delivery Driver</h3>
            <p className="text-sm text-text-light">Earn money delivering orders</p>
          </div>
          </div>
        )}
      </div>
    </div>
  );
};
