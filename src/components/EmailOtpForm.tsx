import React, { useCallback, useEffect, useRef, useState } from 'react';

interface EmailOtpFormProps {
  email: string;
  onVerified: () => void;
  onCancel?: () => void;
  submitLabel?: string;
  cancelLabel?: string;
  /** Shown after the email address in the intro sentence. */
  purpose?: string;
}

/**
 * Reusable 6-digit email OTP form backed by /api/otp/send and /api/otp/verify.
 * Used when a new account is created and during checkout verification.
 */
export const EmailOtpForm: React.FC<EmailOtpFormProps> = ({
  email,
  onVerified,
  onCancel,
  submitLabel = 'Verify & Continue',
  cancelLabel = 'Cancel',
  purpose = 'Enter it below to verify your email.',
}) => {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [devCode, setDevCode] = useState('');
  const [cooldown, setCooldown] = useState(0);
  const [sending, setSending] = useState(false);
  const sentForEmail = useRef('');

  const sendCode = useCallback(async () => {
    setError('');
    setNotice('');
    setSending(true);
    try {
      const res = await fetch('/api/otp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 429 && typeof data?.waitSec === 'number') {
          setCooldown(data.waitSec);
          setNotice(
            `A code was already sent to ${email}. Enter it below, or resend in ${data.waitSec}s.`
          );
          return;
        }
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
    } finally {
      setSending(false);
    }
  }, [email]);

  useEffect(() => {
    // React 18 StrictMode runs this effect twice in development. The ref
    // survives the re-run, so only one code is requested per email.
    if (sentForEmail.current === email) return;
    sentForEmail.current = email;
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
      setDevCode('');
      setNotice('');
      setCode('');
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
        We sent a 6-digit code to <span className="font-semibold text-[#4e362a]">{email}</span>. {purpose}
      </p>

      {devCode && (
        <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-700 text-sm">
          Test mode: email sending is not configured, so the code was shown on the server. It has been filled in for you.
        </div>
      )}

      {notice && !error && (
        <div role="status" className="mb-4 p-3 bg-[#fbf7f4] border border-[#e7ddd7] rounded-xl text-[#6f3d27] text-sm">
          {notice}
        </div>
      )}

      {error && (
        <div role="alert" className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={verify} className="space-y-4">
        <div>
          <label htmlFor="email-otp-code" className="block text-sm font-semibold text-[#4e362a]">
            Verification code
          </label>
          <input
            id="email-otp-code"
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
          {loading ? 'Verifying...' : submitLabel}
        </button>
      </form>

      <div className="flex items-center justify-between mt-5">
        <button
          type="button"
          onClick={sendCode}
          disabled={cooldown > 0 || loading || sending}
          className="text-xs font-semibold text-[#6f3d27] hover:underline disabled:text-[#b8a89f] disabled:no-underline disabled:cursor-default transition"
        >
          {sending ? 'Sending…' : cooldown > 0 ? `Resend code in ${cooldown}s` : 'Resend code'}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="text-xs font-medium text-[#9a887d] hover:text-[#6f3d27] transition"
          >
            {cancelLabel}
          </button>
        )}
      </div>
    </div>
  );
};

export default EmailOtpForm;
