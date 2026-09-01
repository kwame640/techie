import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Store } from 'lucide-react';

export const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedRole, setSelectedRole] = useState<'customer' | 'business' | 'driver' | null>(null);
  const { login, loginWithGoogle } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (role: 'customer' | 'business' | 'driver' | 'admin') => {
    if (!email || !password) {
      setError('Please enter both email and password');
      return;
    }

    setIsLoading(true);
    setError('');
    try {
      await login(email, password, role);
      if (role === 'customer') {
        navigate('/');
      } else if (role === 'business') {
        navigate('/business/dashboard');
      } else if (role === 'driver') {
        navigate('/driver/dashboard');
      } else if (role === 'admin') {
        navigate('/admin/dashboard');
      }
    } catch (err: any) {
      console.error('Login failed:', err);
      setError(err.message || 'Sign in failed. Please check your credentials and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async (role: 'customer' | 'business' | 'driver') => {
    setIsLoading(true);
    setError('');
    try {
      await loginWithGoogle(role);
      if (role === 'customer') {
        navigate('/');
      } else if (role === 'business') {
        navigate('/business/dashboard');
      } else if (role === 'driver') {
        navigate('/driver/dashboard');
      }
    } catch (err: any) {
      console.error('Google sign-in failed:', err);
      setError(err.message || 'Google sign-in failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const navigateToSignUp = () => {
    navigate('/signup');
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <img src="/src/images/nkay.png" alt="NKAY" className="h-16 w-auto mx-auto mb-2" />
          <p className="text-text-light text-lg">Grow your business with NKAY</p>
        </div>

        <div className="bg-white rounded-2xl p-8 shadow-card">
          <h2 className="text-2xl font-semibold mb-6">Sign In</h2>
          
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          {!selectedRole ? (
            <>
              <button
                onClick={() => handleGoogleSignIn('customer')}
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-3 bg-white border border-gray-300 py-3 rounded-lg font-medium hover:bg-gray-50 transition disabled:opacity-50 mb-6"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Sign in with Google
              </button>

              <div className="mt-6 text-center">
                <p className="text-text-light text-sm">
                  Don't have an account?{' '}
                  <button 
                    onClick={navigateToSignUp}
                    className="text-primary font-medium hover:underline"
                  >
                    Sign up
                  </button>
                </p>
              </div>

              <div className="mt-6 border-t pt-6">
                <p className="text-center text-sm font-medium mb-4">Sign up as:</p>
                <div className="grid grid-cols-1 gap-3">
                  <button
                    onClick={() => navigate('/business/register')}
                    className="bg-accent-beige rounded-lg p-3 hover:bg-opacity-80 transition text-center"
                  >
                    <Store className="w-5 h-5 text-primary mx-auto mb-2" />
                    <p className="text-xs font-medium">Business</p>
                  </button>
                </div>
              </div>
            </>
          ) : (
            <>
              <button
                onClick={() => setSelectedRole(null)}
                className="text-primary text-sm font-medium mb-4 hover:underline"
              >
                ← Back
              </button>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email"
                    className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Password</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <button
                  onClick={() => handleLogin(selectedRole)}
                  disabled={isLoading}
                  className="w-full bg-primary text-white py-3 rounded-lg font-medium hover:bg-opacity-90 transition disabled:opacity-50"
                >
                  {isLoading ? 'Signing in...' : `Sign In as ${selectedRole?.charAt(0).toUpperCase()}${selectedRole?.slice(1)}`}
                </button>
              </div>

              <div className="mt-6 border-t pt-6">
                <button
                  onClick={() => handleGoogleSignIn(selectedRole)}
                  disabled={isLoading}
                  className="w-full flex items-center justify-center gap-3 bg-white border border-gray-300 py-3 rounded-lg font-medium hover:bg-gray-50 transition disabled:opacity-50"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  Sign in with Google
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
