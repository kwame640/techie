import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Store } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import logoImage from '../../images/nkay.png';

export const BusinessLoginPage = () => {
  const [businessName, setBusinessName] = useState('');
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const { loginVendor } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!businessName.trim() || !email.trim()) {
      setError('Enter the business name and email used during registration.');
      return;
    }

    setIsLoading(true);
    setError('');
    try {
      await loginVendor(businessName.trim(), email.trim());
      navigate('/business/dashboard');
    } catch (err: any) {
      setError(err.message || 'We could not find an approved vendor with those details.');
    } finally {
      setIsLoading(false);
    }
  };

  return <div className="min-h-screen bg-[#faf8f6] flex items-center justify-center p-4">
    <div className="max-w-md w-full">
      <div className="text-center mb-8"><img src={logoImage} alt="NKAY" className="h-14 w-auto mx-auto mb-5" /><h1 className="text-2xl font-bold text-[#2d211b]">Welcome to your NKAY Store</h1><p className="text-[#806e64] mt-2">Use the business name and email from your registration.</p></div>
      <div className="bg-white border border-[#eee5df] rounded-2xl shadow-[0_8px_30px_rgba(74,43,28,0.06)] p-7">
        {error && <div className="mb-5 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">{error}</div>}
        <form onSubmit={handleLogin} className="space-y-5">
          <label className="block text-sm font-semibold text-[#3d2b22]">Registered business name<div className="relative mt-2"><Store className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#ad9b91]" /><input value={businessName} onChange={(event) => setBusinessName(event.target.value)} placeholder="e.g. Kofi Electronics" className="w-full pl-10 pr-4 py-3 rounded-xl border border-[#e7ddd7] outline-none focus:border-[#6f3d27]" /></div></label>
          <label className="block text-sm font-semibold text-[#3d2b22]">Registered email<div className="relative mt-2"><Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#ad9b91]" /><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="business@example.com" className="w-full pl-10 pr-4 py-3 rounded-xl border border-[#e7ddd7] outline-none focus:border-[#6f3d27]" /></div></label>
          <button type="submit" disabled={isLoading} className="w-full bg-[#6f3d27] text-white py-3 rounded-xl font-semibold hover:bg-[#54301f] transition disabled:opacity-60">{isLoading ? 'Checking approval...' : 'Enter Vendor Dashboard'}</button>
        </form>
        <p className="text-xs text-[#927f74] text-center mt-5">Only vendors approved by NKAY can enter the dashboard.</p>
      </div>
      <button onClick={() => navigate('/business/register')} className="block mx-auto mt-6 text-sm text-[#6f3d27] font-semibold hover:underline">Register a new business</button>
    </div>
  </div>;
};
