import { FormEvent, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../../firebase';
import {
  AlertCircle,
  ArrowRight,
  Eye,
  EyeOff,
  Loader2,
  LockKeyhole,
  Mail,
  ShieldCheck,
  Store,
  Truck,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import logoImage from '../../images/nkay.png';

type Mode = 'signin' | 'signup';

const inputClass =
  'w-full h-12 rounded-xl border border-[#e7ddd7] bg-white pl-11 pr-4 text-sm text-[#2d211b] placeholder:text-[#b3a49b] outline-none transition focus:border-[#6f3d27] focus:ring-2 focus:ring-[#6f3d27]/10';

function GoogleIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

function friendlyAuthError(error: unknown, mode: Mode): string {
  const code = (error as { code?: string } | null)?.code || '';
  switch (code) {
    case 'auth/invalid-email':
      return 'That email address doesn’t look right. Check it and try again.';
    case 'auth/user-disabled':
      return 'This account has been disabled. Please contact NKAY support.';
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return mode === 'signup'
        ? 'We couldn’t create that account. Try a different email or sign in instead.'
        : 'Email or password is incorrect. Check your details and try again.';
    case 'auth/email-already-in-use':
      return 'An account with this email already exists. Sign in instead.';
    case 'auth/weak-password':
      return 'Choose a password with at least 6 characters.';
    case 'auth/too-many-requests':
      return 'Too many attempts. Please wait a moment and try again.';
    case 'auth/popup-closed-by-user':
    case 'auth/cancelled-popup-request':
      return 'Google sign-in was cancelled.';
    case 'auth/popup-blocked':
      return 'Your browser blocked the Google sign-in window. Allow pop-ups and try again.';
    case 'auth/network-request-failed':
      return 'Network error. Check your connection and try again.';
    case 'auth/operation-not-allowed':
      return 'This sign-in method isn’t enabled. Please contact NKAY support.';
    default: {
      const message = (error as Error | null)?.message || '';
      return message.replace(/^Firebase:\s*/, '').replace(/\s*\(auth\/[^)]+\)\.?$/, '') ||
        'Something went wrong. Please try again.';
    }
  }
}

const highlights = [
  { icon: ShieldCheck, title: 'Secure mobile money', text: 'Approve payments from your own wallet.' },
  { icon: Truck, title: 'Local delivery', text: 'Order from businesses near you.' },
  { icon: Store, title: 'Real Ghanaian sellers', text: 'Every order supports a local business.' },
];

export const LoginPage = () => {
  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [hasFirebaseSession, setHasFirebaseSession] = useState(false);

  const { login, signup, loginWithGoogle, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setHasFirebaseSession(!!firebaseUser);
    });
    return () => unsubscribe();
  }, []);

  const switchMode = (next: Mode) => {
    if (next === mode) return;
    setMode(next);
    setError('');
    setPassword('');
    setConfirmPassword('');
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');

    const cleanEmail = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setError('Enter a valid email address.');
      return;
    }
    if (password.length < 6) {
      setError('Your password must be at least 6 characters.');
      return;
    }
    if (mode === 'signup' && password !== confirmPassword) {
      setError('The two passwords don’t match.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (mode === 'signup') {
        await signup(cleanEmail, password, 'customer');
      } else {
        await login(cleanEmail, password, 'customer');
      }
      navigate('/');
    } catch (authError) {
      setError(friendlyAuthError(authError, mode));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogle = async () => {
    setError('');
    setIsSubmitting(true);
    try {
      await loginWithGoogle('customer');
      navigate('/');
    } catch (authError) {
      setError(friendlyAuthError(authError, mode));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#faf8f6] text-[#2d211b] flex justify-center p-4 sm:p-6 lg:p-8">
      <div className="my-auto w-full max-w-5xl overflow-hidden rounded-3xl border border-[#eee5df] bg-white shadow-[0_24px_80px_-32px_rgba(74,43,28,0.35)] lg:grid lg:grid-cols-[1.05fr_1fr]">
        {/* Brand panel */}
        <aside className="relative flex flex-col justify-between overflow-hidden bg-[#2d211b] p-6 text-white sm:p-8 lg:p-10 xl:p-12">
          <div className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-[#6f3d27]/50 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-28 -left-16 h-80 w-80 rounded-full bg-[#c9a227]/20 blur-3xl" />

          <div className="relative">
            <div className="inline-flex items-center gap-2.5 sm:gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white p-1.5 shadow-lg sm:h-12 sm:w-12 sm:rounded-2xl">
                <img src={logoImage} alt="" className="h-full w-full object-contain" />
              </span>
              <div>
                <p className="text-lg font-bold tracking-tight sm:text-xl">NKAY</p>
                <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-[#d8c7bd] sm:text-[10px]">
                  Shop • Sell • Grow
                </p>
              </div>
            </div>

            <h2 className="mt-5 max-w-sm text-[22px] font-bold leading-tight sm:mt-8 sm:text-3xl lg:mt-12 xl:text-4xl">
              Your neighbourhood,
              <span className="text-[#e6c9a8]"> delivered.</span>
            </h2>
            <p className="mt-2 max-w-sm text-[13px] leading-relaxed text-[#d8c7bd] sm:mt-3 sm:text-sm lg:mt-4">
              Discover trusted businesses across Ghana and pay with the mobile money wallet already in your pocket.
            </p>
          </div>

          <ul className="relative mt-5 grid grid-cols-3 gap-2.5 sm:mt-6 sm:gap-4 lg:mt-10 lg:block lg:space-y-5">
            {highlights.map(({ icon: Icon, title, text }) => (
              <li key={title} className="flex items-start gap-2 sm:gap-3">
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/10 ring-1 ring-white/10 sm:h-9 sm:w-9 sm:rounded-xl">
                  <Icon className="h-4 w-4 text-[#e6c9a8]" />
                </span>
                <div>
                  <p className="text-[11px] font-semibold leading-tight sm:text-sm">{title}</p>
                  <p className="hidden text-xs text-[#bdaca2] sm:block">{text}</p>
                </div>
              </li>
            ))}
          </ul>

          <p className="relative mt-5 hidden text-[11px] text-[#8f7d72] sm:block lg:mt-10">
            By shopping on NKAY you support local businesses in your community.
          </p>
        </aside>

        {/* Form panel */}
        <section className="flex flex-col justify-center p-6 sm:p-10 lg:p-12">
          <div className="mb-6 flex items-center justify-between gap-4 sm:mb-8">
            <Link
              to="/"
              className="ml-auto inline-flex items-center gap-1.5 text-xs font-semibold text-[#927f74] transition hover:text-[#6f3d27]"
            >
              Back to marketplace <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {isAuthenticated && hasFirebaseSession && (
            <div className="mb-5 flex items-start gap-2 rounded-xl border border-[#d9e7dd] bg-[#f2f8f4] p-3 text-xs text-[#2f6b45]">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                You’re already signed in on this device.{' '}
                <Link to="/" className="font-semibold underline underline-offset-2">
                  Continue to NKAY
                </Link>{' '}
                or sign in below with a different account.
              </span>
            </div>
          )}

          <div className="inline-flex w-fit rounded-full bg-[#f4ece7] p-1" role="tablist" aria-label="Account access">
            {([['signin', 'Sign in'], ['signup', 'Create account']] as const).map(([value, label]) => (
              <button
                key={value}
                type="button"
                role="tab"
                aria-selected={mode === value}
                onClick={() => switchMode(value)}
                className={`rounded-full px-4 py-2 text-xs font-semibold transition ${
                  mode === value
                    ? 'bg-white text-[#6f3d27] shadow-sm'
                    : 'text-[#927f74] hover:text-[#6f3d27]'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <h1 className="mt-6 text-2xl font-bold tracking-tight sm:text-3xl">
            {mode === 'signin' ? 'Welcome back' : 'Join NKAY'}
          </h1>
          {mode === 'signin' && (
            <p className="mt-2 text-sm text-[#806e64]">
              Sign in to track orders and check out faster.
            </p>
          )}

          {error && (
            <div
              role="alert"
              className="mt-5 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="button"
            onClick={handleGoogle}
            disabled={isSubmitting}
            className="mt-6 flex h-12 w-full items-center justify-center gap-3 rounded-xl border border-[#e7ddd7] bg-white text-sm font-semibold text-[#3d2b22] transition hover:bg-[#fbf7f4] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <GoogleIcon />
            Continue with Google
          </button>

          <div className="my-6 flex items-center gap-3">
            <span className="h-px flex-1 bg-[#f0e8e3]" />
            <span className="text-[11px] font-medium uppercase tracking-wider text-[#b3a49b]">
              or with email
            </span>
            <span className="h-px flex-1 bg-[#f0e8e3]" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div>
              <label htmlFor="login-email" className="mb-1.5 block text-xs font-semibold text-[#4e362a]">
                Email address
              </label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#b3a49b]" />
                <input
                  id="login-email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@example.com"
                  autoComplete="email"
                  autoFocus
                  required
                  aria-invalid={Boolean(error)}
                  className={inputClass}
                />
              </div>
            </div>

            <div>
              <label htmlFor="login-password" className="mb-1.5 block text-xs font-semibold text-[#4e362a]">
                Password
              </label>
              <div className="relative">
                <LockKeyhole className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#b3a49b]" />
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder={mode === 'signup' ? 'At least 6 characters' : 'Enter your password'}
                  autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                  required
                  className={`${inputClass} pr-11`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((current) => !current)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-[#b3a49b] transition hover:bg-[#f4ece7] hover:text-[#6f3d27]"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {mode === 'signup' && (
              <div>
                <label
                  htmlFor="login-confirm-password"
                  className="mb-1.5 block text-xs font-semibold text-[#4e362a]"
                >
                  Confirm password
                </label>
                <div className="relative">
                  <ShieldCheck className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#b3a49b]" />
                  <input
                    id="login-confirm-password"
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    placeholder="Enter it once more"
                    autoComplete="new-password"
                    required
                    className={inputClass}
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="mt-2 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#6f3d27] text-sm font-semibold text-white transition hover:bg-[#5d3524] focus:outline-none focus:ring-2 focus:ring-[#6f3d27]/30 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {mode === 'signin' ? 'Signing in…' : 'Creating account…'}
                </>
              ) : (
                <>
                  {mode === 'signin' ? 'Sign in' : 'Create account'}
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>

            {mode === 'signup' && (
              <p className="text-center text-[11px] leading-relaxed text-[#9a887d]">
                By creating an account you agree to NKAY’s terms of service and privacy policy.
              </p>
            )}
          </form>
        </section>
      </div>
    </div>
  );
};
