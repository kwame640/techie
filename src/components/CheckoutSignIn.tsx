import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, LockKeyhole, ShieldCheck } from 'lucide-react';
import { useShop } from '../context/ShopContext';
import { useAuth } from '../context/AuthContext';

const GoogleIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
  </svg>
);

export const CheckoutSignInForm: React.FC<{ onCancel?: () => void }> = ({ onCancel }) => {
  const { clearPendingCheckout, checkoutEmail, setCheckoutEmail } = useShop();
  const { login, loginWithGoogle } = useAuth();
  const [email, setEmail] = useState(checkoutEmail);
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleEmailLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!email || !password) {
      setError('Enter your email and password to continue.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await login(email, password, 'customer');
      setCheckoutEmail(email);
    } catch (err: any) {
      setError(err?.message || 'Sign in failed. Please check your credentials and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError('');
    try {
      await loginWithGoogle('customer');
    } catch (err: any) {
      setError(err?.message || 'Google sign-in failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const cancel = () => {
    clearPendingCheckout();
    onCancel?.();
  };

  return (
    <div>
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">{error}</div>
      )}

      <form onSubmit={handleEmailLogin} className="space-y-4">
        <div>
          <label className="block text-sm font-semibold text-[#4e362a]">Email</label>
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="Enter your email"
            autoComplete="email"
            className="mt-2 w-full h-11 rounded-xl border border-[#e7ddd7] px-3 text-sm outline-none focus:border-[#6f3d27]"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-[#4e362a]">Password</label>
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Enter your password"
            autoComplete="current-password"
            className="mt-2 w-full h-11 rounded-xl border border-[#e7ddd7] px-3 text-sm outline-none focus:border-[#6f3d27]"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-[#6f3d27] text-white py-3 rounded-xl text-sm font-semibold hover:bg-[#5d3524] transition disabled:opacity-60"
        >
          {loading ? 'Signing in...' : 'Sign In & Continue to Checkout'}
        </button>
      </form>

      <div className="flex items-center gap-3 my-5">
        <span className="flex-1 h-px bg-[#eee5df]" />
        <span className="text-xs text-[#a08b80]">or</span>
        <span className="flex-1 h-px bg-[#eee5df]" />
      </div>

      <button
        onClick={handleGoogleLogin}
        disabled={loading}
        className="w-full flex items-center justify-center gap-3 border border-[#e7ddd7] py-3 rounded-xl text-sm font-semibold text-[#4e362a] hover:bg-[#faf7f4] transition disabled:opacity-60"
      >
        <GoogleIcon />
        Continue with Google
      </button>

      {onCancel && (
        <button
          onClick={cancel}
          className="w-full text-center text-xs font-medium text-[#9a887d] hover:text-[#6f3d27] mt-5 transition"
        >
          Continue shopping
        </button>
      )}
    </div>
  );
};

export const CheckoutOtpForm: React.FC<{
  email: string;
  onVerified: () => void;
  onCancel?: () => void;
}> = ({ email, onVerified, onCancel }) => {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [devCode, setDevCode] = useState('');
  const [cooldown, setCooldown] = useState(0);

  const sendCode = useCallback(async () => {
    setError('');
    try {
      const res = await fetch('/api/otp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error || 'Could not send your code. Please try again.');
        if (typeof data?.waitSec === 'number') {
          setCooldown(data.waitSec);
        }
        return;
      }
      if (data?.devCode) setDevCode(data.devCode);
      setCooldown(60);
    } catch {
      setError('Could not reach the server. Please try again.');
    }
  }, [email]);

  useEffect(() => {
    sendCode();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [email]);

  useEffect(() => {
    if (!devCode) return;
    setCode(devCode);
  }, [devCode]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((current) => current - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const verify = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!/^\d{6}$/.test(code)) {
      setError('Enter the 6-digit code.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error || 'Verification failed. Please try again.');
        return;
      }
      onVerified();
    } catch {
      setError('Could not reach the server. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <p className="text-sm text-[#927f74] mb-5">
        We sent a 6-digit code to <span className="font-semibold text-[#4e362a]">{email}</span>. Enter it below to
        finish verifying your account.
      </p>

      {devCode && (
        <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-700 text-sm">
          Test mode: email sending is not configured, so the code was shown on the server. It has been filled in for you.
        </div>
      )}

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">{error}</div>
      )}

      <form onSubmit={verify} className="space-y-4">
        <div>
          <label className="block text-sm font-semibold text-[#4e362a]">Verification code</label>
          <input
            autoFocus
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            value={code}
            onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
            placeholder="••••••"
            className="mt-2 w-full h-14 rounded-xl border border-[#e7ddd7] px-3 text-center text-2xl font-bold tracking-[0.6em] outline-none focus:border-[#6f3d27]"
          />
        </div>
        <button
          type="submit"
          disabled={loading || code.length !== 6}
          className="w-full bg-[#6f3d27] text-white py-3 rounded-xl text-sm font-semibold hover:bg-[#5d3524] transition disabled:opacity-60"
        >
          {loading ? 'Verifying...' : 'Verify & Continue to Checkout'}
        </button>
      </form>

      <div className="flex items-center justify-between mt-5">
        <button
          type="button"
          onClick={sendCode}
          disabled={cooldown > 0 || loading}
          className="text-xs font-semibold text-[#6f3d27] hover:underline disabled:text-[#b8a89f] disabled:no-underline disabled:cursor-default transition"
        >
          {cooldown > 0 ? `Resend code in ${cooldown}s` : 'Resend code'}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="text-xs font-medium text-[#9a887d] hover:text-[#6f3d27] transition"
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  );
};

export const CheckoutSignInModal: React.FC = () => {
  const { pendingCheckout, clearPendingCheckout } = useShop();
  const { user, isNewUser, clearNewUser } = useAuth();
  const navigate = useNavigate();
  const [otpStep, setOtpStep] = useState(false);

  const goToCheckout = useCallback(() => {
    const target = pendingCheckout || '/customer/checkout';
    clearPendingCheckout();
    clearNewUser();
    navigate(target, { replace: true });
  }, [pendingCheckout, clearPendingCheckout, clearNewUser, navigate]);

  useEffect(() => {
    if (!pendingCheckout || !user) {
      setOtpStep(false);
      return;
    }
    if (isNewUser) {
      setOtpStep(true);
    } else {
      goToCheckout();
    }
  }, [pendingCheckout, user, isNewUser, goToCheckout]);

  if (!pendingCheckout || !user) return null;

  const otpVisible = otpStep && isNewUser;

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center">
      <div
        aria-hidden
        onClick={clearPendingCheckout}
        className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
      />
      <div className="relative w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl p-6 sm:p-8 max-h-[90vh] overflow-y-auto">
        <button
          onClick={clearPendingCheckout}
          aria-label="Close"
          className="absolute top-4 right-4 p-1.5 rounded-lg text-[#9a887d] hover:bg-[#f7f1ed] transition"
        >
          <X className="w-5 h-5" />
        </button>
        <div className="w-12 h-12 rounded-2xl bg-[#f5ebe5] text-[#6f3d27] flex items-center justify-center mb-4">
          {otpVisible ? <ShieldCheck className="w-6 h-6" /> : <LockKeyhole className="w-6 h-6" />}
        </div>
        <h2 className="text-xl font-bold text-[#2d211b]">
          {otpVisible ? 'Verify your email' : 'Sign in to continue'}
        </h2>
        {otpVisible ? (
          <div className="mt-4">
            <CheckoutOtpForm email={user.email} onVerified={goToCheckout} onCancel={clearPendingCheckout} />
          </div>
        ) : (
          <p className="text-sm text-[#927f74] mt-1.5 mb-6">Sign in to your account to complete checkout.</p>
        )}
        {otpVisible ? null : <CheckoutSignInForm onCancel={clearPendingCheckout} />}
      </div>
    </div>
  );
};