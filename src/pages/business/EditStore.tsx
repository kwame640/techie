import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Store,
  Phone,
  Mail,
  Tag,
  MapPin,
  Building,
  Globe,
  Clock,
  Save,
  X,
  Check,
  Upload,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { PageHeading, VendorLayout } from '../../components/VendorLayout';

interface BusinessData {
  id: string;
  businessName: string;
  businessType: string;
  businessCategory: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  region: string;
  country: string;
  preferredContactMethod: string;
  description: string;
  storeLogo: string;
  storeBanner: string;
  whatsappNumber: string;
  businessHours: Record<string, { open: string; close: string; closed?: boolean }>;
  socialLinks: Record<string, string>;
  storeUrl: string;
  rating: number;
  reviewCount: number;
  followerCount: number;
  productCount: number;
  orderCount: number;
  status: string;
  registrationDate: string;
}

const BUSINESS_CATEGORIES = [
  { value: 'food', label: 'Food & Beverages' },
  { value: 'fashion', label: 'Fashion & Clothing' },
  { value: 'electronics', label: 'Electronics & Gadgets' },
  { value: 'home', label: 'Home & Furniture' },
  { value: 'beauty', label: 'Beauty & Personal Care' },
  { value: 'health', label: 'Health & Wellness' },
  { value: 'sports', label: 'Sports & Outdoors' },
  { value: 'books', label: 'Books & Stationery' },
  { value: 'automotive', label: 'Automotive' },
  { value: 'services', label: 'Services' },
  { value: 'grocery', label: 'Grocery' },
  { value: 'pharmacy', label: 'Pharmacy' },
  { value: 'other', label: 'Other' },
];

const BUSINESS_TYPES = [
  { value: 'retail', label: 'Retail Store' },
  { value: 'restaurant', label: 'Restaurant/Food Service' },
  { value: 'electronics', label: 'Electronics' },
  { value: 'fashion', label: 'Fashion & Apparel' },
  { value: 'grocery', label: 'Grocery' },
  { value: 'pharmacy', label: 'Pharmacy' },
  { value: 'other', label: 'Other' },
];

export const EditStore = () => {
  const { business } = useAuth();
  const navigate = useNavigate();
  const vendorToken = business?.vendorToken || localStorage.getItem('vendorToken') || '';
  const authHeaders: HeadersInit = vendorToken ? { Authorization: `Bearer ${vendorToken}` } : {};

  const [storeData, setStoreData] = useState<BusinessData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const [draft, setDraft] = useState<Record<string, any>>({});

  useEffect(() => {
    const loadStore = async () => {
      if (!business?.id) return;
      setLoading(true);
      try {
        const res = await fetch(`/api/business/${business.id}`, { headers: authHeaders });
        if (res.status === 401 || res.status === 403) {
          localStorage.removeItem('vendorToken');
          localStorage.removeItem('vendorSession');
          window.location.href = '/business/login';
          return;
        }
        const data = await res.json();
        if (data.success && data.registration) {
          setStoreData(data.registration);
          setDraft({});
        }
      } catch (e) {
        console.error('Failed to load store:', e);
      } finally {
        setLoading(false);
      }
    };
    loadStore();
  }, [business?.id]);

  const handleEdit = (section: string) => {
    setExpandedSection(section);
    setDraft({});
    setSaveError('');
  };

  const handleChange = (key: string, value: any) => {
    setDraft((prev) => ({ ...prev, [key]: value }));
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: 'storeLogo' | 'storeBanner') => {
    const file = e.target.files?.[0];
    if (!file || !business?.id) return;
    setSaving(true);
    setSaveError('');
    try {
      const formData = new FormData();
      formData.append('image', file);
      const res = await fetch(`/api/business/${business.id}/images`, {
        method: 'POST',
        headers: authHeaders,
        body: formData,
      });
      const data = await res.json();
      if (data.success && data.url) {
        const updates = { [field]: data.url };
        const putRes = await fetch(`/api/business/${business.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', ...authHeaders },
          body: JSON.stringify(updates),
        });
        const putData = await putRes.json();
        if (putData.success && putData.registration) {
          setStoreData(putData.registration);
          setSaveSuccess(true);
          setTimeout(() => setSaveSuccess(false), 3000);
        }
      } else {
        setSaveError(data.error || 'Image upload failed');
      }
    } catch (e) {
      setSaveError('Image upload failed');
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async () => {
    if (!business?.id || !storeData || Object.keys(draft).length === 0) return;
    setSaving(true);
    setSaveError('');
    try {
      const res = await fetch(`/api/business/${business.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify(draft),
      });
      const data = await res.json();
      if (data.success && data.registration) {
        setStoreData(data.registration);
        setDraft({});
        setExpandedSection(null);
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      } else {
        setSaveError(data.error || 'Save failed');
      }
    } catch (e) {
      setSaveError('Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  const handleSubmitStore = async () => {
    if (!business?.id || !storeData) return;

    // Flush any pending edits first so latest changes are saved before completion check
    if (Object.keys(draft).length > 0) {
      setSaving(true);
      setSaveError('');
      try {
        const res = await fetch(`/api/business/${business.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', ...authHeaders },
          body: JSON.stringify(draft),
        });
        const data = await res.json();
        if (data.success && data.registration) {
          setStoreData(data.registration);
          setDraft({});
          setExpandedSection(null);
        } else {
          setSaveError(data.error || 'Failed to save changes before submitting');
          setSaving(false);
          return;
        }
      } catch (e) {
        setSaveError('Failed to save changes before submitting');
        setSaving(false);
        return;
      } finally {
        setSaving(false);
      }
    }

    // Re-check completion from the latest (refreshed) storeData
    const checks = [
      { label: 'Store name', done: Boolean(storeData.businessName?.trim()) },
      { label: 'Category', done: Boolean(storeData.businessCategory?.trim()) },
      { label: 'Phone number', done: Boolean(storeData.phone?.trim()) },
      { label: 'Email address', done: Boolean(storeData.email?.trim()) },
      { label: 'Location (city)', done: Boolean(storeData.city?.trim()) },
      { label: 'Description', done: Boolean(storeData.description?.trim()) },
      { label: 'Store logo', done: Boolean(storeData.storeLogo?.trim()) },
      { label: 'Store banner', done: Boolean(storeData.storeBanner?.trim()) },
    ];
    const missing = checks.filter((c) => !c.done).map((c) => c.label);
    if (missing.length > 0) {
      setSaveError(
        `Please complete your store profile first. Missing: ${missing.join(', ')}.`
      );
      return;
    }

    setSaveSuccess(true);
    setTimeout(() => {
      setSaveSuccess(false);
      navigate(`/store/${business.id}`);
    }, 900);
  };

  const handleCancel = () => {
    setExpandedSection(null);
    setDraft({});
    setSaveError('');
  };

  const getField = (key: keyof BusinessData, placeholder = 'Not set') => {
    const val = storeData?.[key];
    return val && String(val).trim().length > 0 ? String(val) : placeholder;
  };

  const calculateCompletion = () => {
    if (!storeData) return 0;
    const checks = [
      Boolean(storeData.businessName?.trim()),
      Boolean(storeData.businessCategory?.trim()),
      Boolean(storeData.phone?.trim()),
      Boolean(storeData.email?.trim()),
      Boolean(storeData.city?.trim()),
      Boolean(storeData.description?.trim()),
      Boolean(storeData.storeLogo?.trim()),
      Boolean(storeData.storeBanner?.trim()),
    ];
    const filled = checks.filter(Boolean).length;
    return Math.round((filled / checks.length) * 100);
  };

  const completionItems = [
    { label: 'Store name', done: Boolean(storeData?.businessName?.trim()) },
    { label: 'Category', done: Boolean(storeData?.businessCategory?.trim()) },
    { label: 'Phone number', done: Boolean(storeData?.phone?.trim()) },
    { label: 'Email address', done: Boolean(storeData?.email?.trim()) },
    { label: 'Location', done: Boolean(storeData?.city?.trim()) },
    { label: 'Description', done: Boolean(storeData?.description?.trim()) },
    { label: 'Store logo', done: Boolean(storeData?.storeLogo?.trim()) },
    { label: 'Store banner', done: Boolean(storeData?.storeBanner?.trim()) },
  ];

  const completion = calculateCompletion();

  // ---- Reusable display component ----
  type DisplayFieldProps = {
    label: string;
    value: string;
    icon?: any;
  };
  const DisplayField = ({ label, value, icon: Icon }: DisplayFieldProps) => (
    <div className="flex items-start gap-3 py-3 border-b border-[#f1ebe7] last:border-0">
      {Icon && <Icon className="w-4 h-4 text-[#9a7968] mt-0.5 flex-shrink-0" />}
      <div className="flex-1 min-w-0">
        <p className="text-xs text-[#9a7968] uppercase tracking-[0.05em]">{label}</p>
        <p className="mt-1 text-sm font-medium text-text break-words">{value}</p>
      </div>
    </div>
  );

  // ---- Editable input component for compact inline editing ----
  const compactInput = (key: string, type: 'input' | 'textarea' | 'select' = 'input', opts?: { options?: { value: string; label: string }[]; placeholder?: string }) => {
    const value = draft.hasOwnProperty(key) ? draft[key] : (storeData?.[key as keyof BusinessData] ?? '');
    if (type === 'select' && opts?.options) {
      return (
        <select
          value={value || ''}
          onChange={(e) => handleChange(key, e.target.value)}
          className="w-full px-3 py-2 rounded-lg border border-[#dfe8e1] bg-white text-sm text-text outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary"
        >
          <option value="">{opts.placeholder || 'Select...'}</option>
          {opts.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      );
    }
    if (type === 'textarea') {
      return (
        <textarea
          value={value || ''}
          onChange={(e) => handleChange(key, e.target.value)}
          rows={3}
          placeholder={opts?.placeholder || ''}
          className="w-full px-3 py-2 rounded-lg border border-[#dfe8e1] bg-white text-sm text-text outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary resize-none"
        />
      );
    }
    return (
      <input
        type="text"
        value={value || ''}
        onChange={(e) => handleChange(key, e.target.value)}
        placeholder={opts?.placeholder || ''}
        className="w-full px-3 py-2 rounded-lg border border-[#dfe8e1] bg-white text-sm text-text outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary"
      />
    );
  };

  if (loading) {
    return (
      <VendorLayout title="Edit Store">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="ml-3 text-text-light">Loading your store...</p>
        </div>
      </VendorLayout>
    );
  }

  if (!storeData) return null;

  return (
    <VendorLayout title="Edit Store">
      <PageHeading
        eyebrow="Store settings"
        title="Edit Store"
        description="Update your store profile. Changes are saved immediately."
      />

      {/* Completion indicator */}
      <div className="mb-8 bg-white border border-[#eee5df] rounded-2xl p-6 shadow-[0_4px_18px_rgba(74,43,28,0.04)]">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-text">Store profile completion</h2>
          <span className="text-sm font-semibold text-primary">{completion}% complete</span>
        </div>
        <div className="w-full h-3 bg-[#eee5df] rounded-full overflow-hidden mb-4">
          <div className="h-full bg-primary transition-all duration-300" style={{ width: `${completion}%` }} />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {completionItems.map((item) => (
            <div key={item.label} className="flex items-center gap-2">
              {item.done ? (
                <Check className="w-4 h-4 text-green-600" />
              ) : (
                <div className="w-4 h-4 rounded-full border border-[#dfe8e1] text-xs flex items-center justify-center text-[#927f74]" />
              )}
              <span className={`text-xs ${item.done ? 'text-text' : 'text-[#927f74]'}`}>
                {item.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Save success/error banner */}
      {saveSuccess && (
        <div className="mb-6 flex items-center gap-3 p-4 bg-[#e6f5ed] border border-[#b6d9c1] text-[#16734b] rounded-xl text-sm font-medium">
          <Check className="w-5 h-5" />
          Store updated successfully
        </div>
      )}
      {saveError && (
        <div className="mb-6 flex items-center gap-3 p-4 bg-[#fdecea] border border-[#f4c5be] text-[#a23d35] rounded-xl text-sm font-medium">
          <X className="w-5 h-5" />
          {saveError}
        </div>
      )}

      {/* Store Profile Section */}
      <div className="mb-6 bg-white border border-[#eee5df] rounded-2xl shadow-[0_4px_18px_rgba(74,43,28,0.04)] overflow-hidden">
        <div
          className="p-6 cursor-pointer hover:bg-[#faf8f6] transition"
          onClick={() => handleEdit('profile')}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#e6f5ed] text-[#16734b] flex items-center justify-center">
                <Store className="w-4 h-4" />
              </div>
              <h3 className="font-semibold text-text">Store Profile</h3>
            </div>
            {expandedSection === 'profile' ? <ChevronUp className="w-5 h-5 text-[#927f74]" /> : <ChevronDown className="w-5 h-5 text-[#927f74]" />}
          </div>
        </div>

        <DisplayField label="Store name" value={getField('businessName')} icon={Store} />
        <DisplayField label="Category" value={getField('businessCategory', 'Not set')} icon={Tag} />
        <DisplayField label="Business type" value={getField('businessType', 'Not set')} icon={Building} />
        <DisplayField label="Short description" value={getField('description', 'No description added')} icon={Store} />

        {expandedSection === 'profile' && (
          <div className="border-t border-[#f1ebe7] p-6 space-y-4">
            <div>
              <label className="block text-xs font-medium text-[#9a7968] mb-1.5">Store name</label>
              {compactInput('businessName', 'input', { placeholder: 'Enter your store name' })}
            </div>
            <div>
              <label className="block text-xs font-medium text-[#9a7968] mb-1.5">Category</label>
              {compactInput('businessCategory', 'select', { options: BUSINESS_CATEGORIES, placeholder: 'Select a category' })}
            </div>
            <div>
              <label className="block text-xs font-medium text-[#9a7968] mb-1.5">Business type</label>
              {compactInput('businessType', 'select', { options: BUSINESS_TYPES, placeholder: 'Select business type' })}
            </div>
            <div>
              <label className="block text-xs font-medium text-[#9a7968] mb-1.5">Short description</label>
              {compactInput('description', 'textarea', { placeholder: 'Tell customers about your store...' })}
            </div>
            <div className="flex gap-3 pt-2">
              <button
                onClick={handleSave}
                disabled={saving}
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-semibold hover:bg-primary/90 transition disabled:opacity-60"
              >
                {saving ? 'Saving...' : <><Save className="w-4 h-4" /> Save changes</>}
              </button>
              <button
                onClick={handleCancel}
                className="px-4 py-2 border border-[#dfe8e1] text-[#6f5c50] rounded-lg text-sm font-medium hover:bg-[#f7f1ed] transition"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Contact Section */}
      <div className="mb-6 bg-white border border-[#eee5df] rounded-2xl shadow-[0_4px_18px_rgba(74,43,28,0.04)] overflow-hidden">
        <div
          className="p-6 cursor-pointer hover:bg-[#faf8f6] transition"
          onClick={() => handleEdit('contact')}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#e6f5ed] text-[#16734b] flex items-center justify-center">
                <Phone className="w-4 h-4" />
              </div>
              <h3 className="font-semibold text-text">Contact</h3>
            </div>
            {expandedSection === 'contact' ? <ChevronUp className="w-5 h-5 text-[#927f74]" /> : <ChevronDown className="w-5 h-5 text-[#927f74]" />}
          </div>
        </div>

        <DisplayField label="Phone" value={getField('phone', 'Not set')} icon={Phone} />
        <DisplayField label="Email" value={getField('email', 'Not set')} icon={Mail} />
        <DisplayField label="WhatsApp" value={getField('whatsappNumber', 'Not set')} icon={Phone} />
        <DisplayField label="Location" value={`${getField('city', 'No city')} • ${getField('region', 'No region')}`} icon={MapPin} />
        <DisplayField label="Preferred contact" value={getField('preferredContactMethod', 'Not set')} icon={Mail} />

        {expandedSection === 'contact' && (
          <div className="border-t border-[#f1ebe7] p-6 space-y-4">
            <div>
              <label className="block text-xs font-medium text-[#9a7968] mb-1.5">Phone number</label>
              {compactInput('phone', 'input', { placeholder: '+233 50 123 4567' })}
            </div>
            <div>
              <label className="block text-xs font-medium text-[#9a7968] mb-1.5">Email address</label>
              {compactInput('email', 'input', { placeholder: 'you@example.com' })}
            </div>
            <div>
              <label className="block text-xs font-medium text-[#9a7968] mb-1.5">WhatsApp number</label>
              {compactInput('whatsappNumber', 'input', { placeholder: '+233 50 123 4567' })}
            </div>
            <div>
              <label className="block text-xs font-medium text-[#9a7968] mb-1.5">City</label>
              {compactInput('city', 'input', { placeholder: 'Accra, Kumasi...' })}
            </div>
            <div>
              <label className="block text-xs font-medium text-[#9a7968] mb-1.5">Region</label>
              {compactInput('region', 'input', { placeholder: 'Greater Accra, Ashanti...' })}
            </div>
            <div>
              <label className="block text-xs font-medium text-[#9a7968] mb-1.5">Preferred contact method</label>
              {compactInput('preferredContactMethod', 'select', {
                options: [
                  { value: 'email', label: 'Email' },
                  { value: 'phone', label: 'Phone' },
                  { value: 'whatsapp', label: 'WhatsApp' },
                ],
                placeholder: 'Select contact method',
              })}
            </div>
            <div className="flex gap-3 pt-2">
              <button
                onClick={handleSave}
                disabled={saving}
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-semibold hover:bg-primary/90 transition disabled:opacity-60"
              >
                {saving ? 'Saving...' : <><Save className="w-4 h-4" /> Save changes</>}
              </button>
              <button
                onClick={handleCancel}
                className="px-4 py-2 border border-[#dfe8e1] text-[#6f5c50] rounded-lg text-sm font-medium hover:bg-[#f7f1ed] transition"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Store Appearance Section */}
      <div className="mb-6 bg-white border border-[#eee5df] rounded-2xl shadow-[0_4px_18px_rgba(74,43,28,0.04)] overflow-hidden">
        <div
          className="p-6 cursor-pointer hover:bg-[#faf8f6] transition"
          onClick={() => handleEdit('appearance')}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#e6f5ed] text-[#16734b] flex items-center justify-center">
                <Upload className="w-4 h-4" />
              </div>
              <h3 className="font-semibold text-text">Store Appearance</h3>
            </div>
            {expandedSection === 'appearance' ? <ChevronUp className="w-5 h-5 text-[#927f74]" /> : <ChevronDown className="w-5 h-5 text-[#927f74]" />}
          </div>
        </div>

        <div className="p-6 border-t border-[#f1ebe7]">
          {storeData.storeLogo ? (
            <img src={storeData.storeLogo} alt="Store logo" className="w-20 h-20 rounded-xl object-cover border border-[#eee5df]" />
          ) : (
            <div className="w-20 h-20 rounded-xl bg-[#f6f8f6] border border-[#eee5df] flex items-center justify-center">
              <Store className="w-8 h-8 text-[#c5b4a7]" />
            </div>
          )}
          <p className="text-xs text-[#9a7968] mt-2">Store logo</p>
        </div>

        <div className="p-6 border-t border-[#f1ebe7]">
          {storeData.storeBanner ? (
            <img src={storeData.storeBanner} alt="Store banner" className="w-full h-24 rounded-xl object-cover border border-[#eee5df]" />
          ) : (
            <div className="w-full h-24 rounded-xl bg-[#f6f8f6] border border-[#eee5df] flex items-center justify-center">
              <Upload className="w-6 h-6 text-[#c5b4a7]" />
            </div>
          )}
          <p className="text-xs text-[#9a7968] mt-2">Store banner</p>
        </div>

        {expandedSection === 'appearance' && (
          <div className="border-t border-[#f1ebe7] p-6 space-y-4">
            <div>
              <label className="block text-xs font-medium text-[#9a7968] mb-1.5">Store logo</label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => handleImageUpload(e, 'storeLogo')}
                className="text-sm text-[#6f5c50] file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-[#f5ebe5] file:text-[#6f3d27] hover:file:bg-[#f7f1ed]"
              />
              {storeData.storeLogo && <p className="text-xs text-[#9a7968] mt-1">Current logo is set</p>}
            </div>
            <div>
              <label className="block text-xs font-medium text-[#9a7968] mb-1.5">Cover/banner image</label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => handleImageUpload(e, 'storeBanner')}
                className="text-sm text-[#6f5c50] file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-[#f5ebe5] file:text-[#6f3d27] hover:file:bg-[#f7f1ed]"
              />
              {storeData.storeBanner && <p className="text-xs text-[#9a7968] mt-1">Current banner is set</p>}
            </div>
            <div className="flex gap-3 pt-2">
              <button
                onClick={handleCancel}
                className="px-4 py-2 border border-[#dfe8e1] text-[#6f5c50] rounded-lg text-sm font-medium hover:bg-[#f7f1ed] transition"
              >
                Done
              </button>
            </div>
          </div>
        )}
      </div>

      {/* About Your Store Section */}
      <div className="mb-6 bg-white border border-[#eee5df] rounded-2xl shadow-[0_4px_18px_rgba(74,43,28,0.04)] overflow-hidden">
        <div
          className="p-6 cursor-pointer hover:bg-[#faf8f6] transition"
          onClick={() => handleEdit('about')}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#e6f5ed] text-[#16734b] flex items-center justify-center">
                <Globe className="w-4 h-4" />
              </div>
              <h3 className="font-semibold text-text">About Your Store</h3>
            </div>
            {expandedSection === 'about' ? <ChevronUp className="w-5 h-5 text-[#927f74]" /> : <ChevronDown className="w-5 h-5 text-[#927f74]" />}
          </div>
        </div>

        <DisplayField label="Description" value={getField('description', 'No description added')} icon={Store} />
        <DisplayField label="Business hours" value="Set in business hours section" icon={Clock} />
        <DisplayField label="Store URL" value={getField('storeUrl', 'Not set')} icon={Globe} />
        <DisplayField label="Social links" value={getField('socialLinks', 'None set')} icon={Globe} />

        {expandedSection === 'about' && (
          <div className="border-t border-[#f1ebe7] p-6 space-y-4">
            <div>
              <label className="block text-xs font-medium text-[#9a7968] mb-1.5">Full description</label>
              {compactInput('description', 'textarea', { placeholder: 'Tell customers more about your store...' })}
            </div>
            <div>
              <label className="block text-xs font-medium text-[#9a7968] mb-1.5">Store URL</label>
              {compactInput('storeUrl', 'input', { placeholder: 'your-store.nkay.com' })}
            </div>
            <div>
              <label className="block text-xs font-medium text-[#9a7968] mb-1.5">Facebook URL</label>
              {compactInput('socialLinks.facebook', 'input', { placeholder: 'facebook.com/yourstore' })}
            </div>
            <div>
              <label className="block text-xs font-medium text-[#9a7968] mb-1.5">Instagram URL</label>
              {compactInput('socialLinks.instagram', 'input', { placeholder: 'instagram.com/yourstore' })}
            </div>
            <div className="flex gap-3 pt-2">
              <button
                onClick={handleSave}
                disabled={saving}
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-semibold hover:bg-primary/90 transition disabled:opacity-60"
              >
                {saving ? 'Saving...' : <><Save className="w-4 h-4" /> Save changes</>}
              </button>
              <button
                onClick={handleCancel}
                className="px-4 py-2 border border-[#dfe8e1] text-[#6f5c50] rounded-lg text-sm font-medium hover:bg-[#f7f1ed] transition"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Business Details Section */}
      <div className="mb-6 bg-white border border-[#eee5df] rounded-2xl shadow-[0_4px_18px_rgba(74,43,28,0.04)] overflow-hidden">
        <div
          className="p-6 cursor-pointer hover:bg-[#faf8f6] transition"
          onClick={() => handleEdit('details')}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#e6f5ed] text-[#16734b] flex items-center justify-center">
                <Building className="w-4 h-4" />
              </div>
              <h3 className="font-semibold text-text">Business Details</h3>
            </div>
            {expandedSection === 'details' ? <ChevronUp className="w-5 h-5 text-[#927f74]" /> : <ChevronDown className="w-5 h-5 text-[#927f74]" />}
          </div>
        </div>

        <DisplayField label="Business type" value={getField('businessType', 'Not set')} icon={Building} />
        <DisplayField label="Address" value={getField('address', 'Not set')} icon={MapPin} />
        <DisplayField label="Country" value={getField('country', 'Not set')} icon={Globe} />
        <DisplayField label="Store status" value={storeData.status === 'live' ? 'Live' : 'Pending'} icon={Check} />
        <DisplayField label="Registration date" value={storeData.registrationDate ? new Date(storeData.registrationDate).toLocaleDateString('en-GH', { year: 'numeric', month: 'short', day: 'numeric' }) : 'Not set'} icon={Clock} />

        {expandedSection === 'details' && (
          <div className="border-t border-[#f1ebe7] p-6 space-y-4">
            <div>
              <label className="block text-xs font-medium text-[#9a7968] mb-1.5">Address</label>
              {compactInput('address', 'input', { placeholder: 'Street address' })}
            </div>
            <div>
              <label className="block text-xs font-medium text-[#9a7968] mb-1.5">Country</label>
              {compactInput('country', 'select', {
                options: [
                  { value: 'Ghana', label: 'Ghana' },
                  { value: 'Nigeria', label: 'Nigeria' },
                  { value: 'Kenya', label: 'Kenya' },
                  { value: 'South Africa', label: 'South Africa' },
                  { value: 'Other', label: 'Other' },
                ],
                placeholder: 'Select country',
              })}
            </div>
            <div className="flex gap-3 pt-2">
              <button
                onClick={handleSave}
                disabled={saving}
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-semibold hover:bg-primary/90 transition disabled:opacity-60"
              >
                {saving ? 'Saving...' : <><Save className="w-4 h-4" /> Save changes</>}
              </button>
              <button
                onClick={handleCancel}
                className="px-4 py-2 border border-[#dfe8e1] text-[#6f5c50] rounded-lg text-sm font-medium hover:bg-[#f7f1ed] transition"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Submit / Publish Store */}
      <div className="mb-6 bg-gradient-to-br from-primary/5 via-accent-beige/60 to-primary/5 border border-primary/15 rounded-2xl shadow-[0_4px_18px_rgba(74,43,28,0.04)] p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 sm:gap-6">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-9 h-9 rounded-xl bg-primary/15 text-primary flex items-center justify-center flex-shrink-0">
                <Check className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h2 className="text-lg font-bold text-text leading-tight">Submit &amp; View Your Store</h2>
                <p className="text-xs sm:text-sm text-text-light mt-0.5">
                  Finish your profile and publish it live on the NKAY marketplace — customers will be able to find your business at <span className="font-mono font-semibold text-primary">/store/{business?.id || 'your-business'}</span>
                </p>
              </div>
            </div>
            {/* Live completion summary inline */}
            <div className="mt-3">
              <div className="flex items-center justify-between mb-1.5 text-xs sm:text-sm">
                <span className="font-medium text-text">Profile completion</span>
                <span className={`font-bold ${completion === 100 ? 'text-green-700' : 'text-primary'}`}>
                  {completion}%
                </span>
              </div>
              <div className="w-full h-2.5 bg-white rounded-full overflow-hidden border border-[#eee5df]">
                <div
                  className={`h-full transition-all duration-400 ${completion === 100 ? 'bg-green-500' : 'bg-primary'}`}
                  style={{ width: `${completion}%` }}
                />
              </div>
              {completion < 100 && (
                <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] sm:text-xs">
                  {completionItems.map((item) => (
                    <div
                      key={item.label}
                      className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg border ${
                        item.done
                          ? 'border-green-200 bg-green-50 text-green-800'
                          : 'border-[#f1ebe7] bg-white text-[#927f74]'
                      }`}
                    >
                      {item.done ? (
                        <Check className="w-3.5 h-3.5 text-green-600 flex-shrink-0" />
                      ) : (
                        <div className="w-3.5 h-3.5 rounded-full border border-[#dfe8e1] text-[10px] flex items-center justify-center text-[#927f74] flex-shrink-0">
                          !
                        </div>
                      )}
                      <span className="truncate">{item.label}</span>
                    </div>
                  ))}
                </div>
              )}
              {completion === 100 && (
                <p className="text-xs sm:text-sm text-green-700 mt-2 flex items-center gap-1.5">
                  <Check className="w-4 h-4" />
                  Your store profile is complete — you're ready to publish.
                </p>
              )}
            </div>
          </div>
          <div className="flex-shrink-0 w-full sm:w-auto flex gap-3 sm:flex-col sm:items-stretch">
            <button
              onClick={handleSubmitStore}
              disabled={saving}
              className="inline-flex items-center justify-center gap-2 w-full sm:w-auto px-5 sm:px-6 py-3 bg-primary text-white rounded-2xl text-sm sm:text-base font-bold hover:bg-primary/90 transition disabled:opacity-60 shadow-lg shadow-primary/20"
            >
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                  Saving changes…
                </>
              ) : (
                <>
                  <Globe className="w-4 h-4 sm:w-5 sm:h-5" />
                  Submit &amp; View My Store
                </>
              )}
            </button>
            <p className="text-[11px] text-[#927f74] text-center sm:text-right leading-tight">
              Saves pending edits, then redirects<br className="hidden sm:inline" /> to your live store page.
            </p>
          </div>
        </div>
      </div>

      {/* Already saved notice */}
      <div className="mb-6 text-xs text-[#9a7968]">
        <Check className="w-4 h-4 inline mr-1" />
        All data is already saved from your registration. Edit any section above to update.
      </div>
    </VendorLayout>
  );
};
