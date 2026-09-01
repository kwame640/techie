import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Rocket, X, Sparkles } from 'lucide-react';
import logoImage from '../images/nkay.png';

const LAUNCH_DEADLINE = new Date('2026-09-06T23:59:59').getTime();

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

export const LaunchCountdown = ({ onClose, closable = true }: { onClose: () => void; closable?: boolean }) => {
  const [timeLeft, setTimeLeft] = useState<TimeLeft>({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const navigate = useNavigate();

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date().getTime();
      const difference = LAUNCH_DEADLINE - now;

      if (difference > 0) {
        setTimeLeft({
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
          minutes: Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60)),
          seconds: Math.floor((difference % (1000 * 60)) / 1000),
        });
      } else {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
      }
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleRegister = () => {
    onClose();
    navigate('/business/register');
  };

  const pad = (n: number) => n.toString().padStart(2, '0');

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-md"
        onClick={closable ? onClose : undefined}
      />

      {/* Banner */}
      <div className="relative w-full max-w-[680px] bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl overflow-hidden border border-white/20">
        {/* Close button */}
        {closable && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition z-10"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        )}

        {/* Header */}
        <div className="bg-gradient-to-br from-primary to-primary-light px-8 py-6 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <img src={logoImage} alt="NKAY" className="h-8 w-auto" />
          </div>
          <p className="text-white/80 text-sm font-medium tracking-wider uppercase">
            NKAY LAUNCH 2026
          </p>
        </div>

        {/* Content */}
        <div className="px-8 py-8 text-center">
          {/* Rocket icon */}
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-accent-beige to-accent-tan mb-6">
            <Rocket className="w-8 h-8 text-primary" />
          </div>

          {/* Headline */}
          <h2 className="text-4xl md:text-5xl font-bold text-text mb-2">
            {pad(timeLeft.days)} DAYS LEFT
          </h2>
          <p className="text-xl md:text-2xl font-semibold text-primary mb-4">
            Register Your Business for FREE
          </p>

          {/* Countdown */}
          <div className="inline-flex items-center gap-2 bg-background rounded-2xl p-4 mb-6">
            <div className="text-center px-3">
              <div className="text-2xl md:text-3xl font-bold text-text">{pad(timeLeft.days)}</div>
              <div className="text-xs text-text-light uppercase">Days</div>
            </div>
            <span className="text-2xl font-bold text-gray-300">:</span>
            <div className="text-center px-3">
              <div className="text-2xl md:text-3xl font-bold text-text">{pad(timeLeft.hours)}</div>
              <div className="text-xs text-text-light uppercase">Hours</div>
            </div>
            <span className="text-2xl font-bold text-gray-300">:</span>
            <div className="text-center px-3">
              <div className="text-2xl md:text-3xl font-bold text-text">{pad(timeLeft.minutes)}</div>
              <div className="text-xs text-text-light uppercase">Min</div>
            </div>
            <span className="text-2xl font-bold text-gray-300">:</span>
            <div className="text-center px-3">
              <div className="text-2xl md:text-3xl font-bold text-text">{pad(timeLeft.seconds)}</div>
              <div className="text-xs text-text-light uppercase">Sec</div>
            </div>
          </div>

          {/* Supporting text */}
          <p className="text-text-light max-w-md mx-auto mb-4">
            We're launching soon! Register your business now and get listed on NKAY at no cost. After the launch offer ends, registration will be <span className="font-semibold text-primary">GHS 50</span>.
          </p>

          {/* Urgency message */}
          <div className="inline-flex items-center gap-2 bg-orange-50 text-orange-700 px-4 py-2 rounded-full text-sm font-medium mb-6">
            <Sparkles className="w-4 h-4" />
            Free registration ends soon. Don't miss out.
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={handleRegister}
              className="px-8 py-3 bg-primary text-white rounded-xl font-semibold hover:bg-primary-light transition shadow-lg shadow-primary/25"
            >
              REGISTER FOR FREE
            </button>
            {closable && (
              <button
                onClick={onClose}
                className="px-8 py-3 bg-gray-100 text-text-light rounded-xl font-medium hover:bg-gray-200 transition"
              >
                Maybe Later
              </button>
            )}
          </div>

          {/* Trust element */}
          <p className="mt-6 text-sm text-text-light">
            Join businesses getting ready to be discovered on NKAY.
          </p>
        </div>
      </div>
    </div>
  );
};
