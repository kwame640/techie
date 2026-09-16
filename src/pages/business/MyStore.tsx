import { ChangeEvent, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Clock3, ExternalLink, MapPin, Pencil, Phone, Save, Store, X, Instagram, Facebook, Twitter, MessageCircle, Globe, Upload } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { PageHeading, VendorLayout } from '../../components/VendorLayout';
import { BusinessCategory } from '../../types/marketplace';

const safeJsonResponse = async (res: Response): Promise<any> => {
  const text = await res.text();
  if (!text.trim()) {
    throw new Error(`Server returned empty response (HTTP ${res.status})`);
  }
  try {
    return JSON.parse(text);
  } catch {
    const preview = text.length > 200 ? text.substring(0, 200) + '...' : text;
    throw new Error(`Server returned non-JSON response (HTTP ${res.status}): ${preview}`);
  }
};

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const;

interface HoursValue {
  open: string;
  close: string;
  closed: boolean;
}

interface StoreData {
  businessName: string;
  businessType: string;
  businessCategory: BusinessCategory | '';
  phone: string;
  whatsappNumber: string;
  address: string;
  city: string;
  region: string;
  country: string;
  preferredContactMethod: string;
  description: string;
  storeLogo: string;
  storeBanner: string;
  businessHours: Record<string, HoursValue>;
  socialLinks: Partial<Record<'facebook' | 'instagram' | 'twitter' | 'whatsapp' | 'website', string>>;
  storeStatus: 'live' | 'paused';
}

const initialHours: Record<string, HoursValue> = {
  monday: { open: '09:00', close: '18:00', closed: false },
  tuesday: { open: '09:00', close: '18:00', closed: false },
  wednesday: { open: '09:00', close: '18:00', closed: false },
  thursday: { open: '09:00', close: '18:00', closed: false },
  friday: { open: '09:00', close: '18:00', closed: false },
  saturday: { open: '10:00', close: '16:00', closed: false },
  sunday: { open: '00:00', close: '00:00', closed: true },
};

export const MyStore = () => {
  const { business } = useAuth();
  const vendorToken = business?.vendorToken || localStorage.getItem('vendorToken') || '';
  const authHeaders: HeadersInit = vendorToken ? { Authorization: `Bearer ${vendorToken}` } : {};
  const [storeData, setStoreData] = useState<StoreData | null>(() => {
    if (!business) return null;
    return {
      businessName: (business.name as string) || '',
      businessType: '',
      businessCategory: (business.category as BusinessCategory) || '',
      phone: business.phone || '',
      whatsappNumber: '',
      address: '',
      city: business.city || '',
      region: business.region || '',
      country: business.country || '',
      preferredContactMethod: '',
      description: business.description || '',
      storeLogo: business.storeLogo || business.logo || '',
      storeBanner: business.storeBanner || business.coverImage || '',
      businessHours: { ...initialHours },
      socialLinks: {},
      storeStatus: (business.status as 'live' | 'paused') || 'live',
    };
  });
  const [logoPreview, setLogoPreview] = useState('');
  const [bannerPreview, setBannerPreview] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [loadingStore, setLoadingStore] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loadAttempted, setLoadAttempted] = useState(false);

  if (!business) return null;

  const loadStoreData = async () => {
    setLoadingStore(true);
    setError('');
    try {
      const regId = business.id;
      if (!regId) {
        setError('No business ID available. Please log in again.');
        return;
      }
      const res = await fetch(`/api/business/${regId}`, { headers: authHeaders });
      const data = await safeJsonResponse(res);
      if (!res.ok && (res.status === 401 || res.status === 403)) {
        localStorage.removeItem('vendorToken');
        localStorage.removeItem('vendorSession');
        window.location.href = '/business/login';
        return;
      }
      if (!data.success || !data.registration) {
        setLogoPreview('');
        setBannerPreview('');
        setStoreData((prev) => prev ? {
          ...prev,
          storeLogo: '',
          storeBanner: '',
        } : prev);
      } else {
        const reg = data.registration;
        setStoreData({
          businessName: reg.businessName || '',
          businessType: reg.businessType || '',
          businessCategory: (reg.businessCategory as BusinessCategory) || '',
          phone: reg.phone || '',
          whatsappNumber: reg.whatsappNumber || '',
          address: reg.address || '',
          city: reg.city || '',
          region: reg.region || '',
          country: reg.country || '',
          preferredContactMethod: reg.preferredContactMethod || '',
          description: reg.description || '',
          storeLogo: reg.storeLogo || '',
          storeBanner: reg.storeBanner || '',
          businessHours: reg.businessHours || { ...initialHours },
          socialLinks: reg.socialLinks || {},
          storeStatus: reg.storeStatus || 'live',
        });
        setLogoPreview(reg.storeLogo || '');
        setBannerPreview(reg.storeBanner || '');
      }
    } catch (e: any) {
      setError(e.message || 'Failed to load store data');
    } finally {
      setLoadingStore(false);
      setLoadAttempted(true);
    }
  };

  useEffect(() => {
    if (business?.id && !loadAttempted) {
      loadStoreData();
    }
  }, [business?.id]);

  const handleEdit = () => {
    setSuccess('');
    if (!storeData) {
      loadStoreData();
    }
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setError('');
    setSuccess('');
    setLogoPreview(storeData?.storeLogo || '');
    setBannerPreview(storeData?.storeBanner || '');
  };

  const handleFieldChange = (field: string, value: string) => {
    setStoreData((prev: any) => ({ ...prev, [field]: value }));
  };

  const handleHoursChange = (day: string, field: keyof HoursValue, value: string | boolean) => {
    setStoreData((prev: any) => ({
      ...prev,
      businessHours: {
        ...prev.businessHours,
        [day]: { ...prev.businessHours[day], [field]: value },
      },
    }));
  };

  const handleSocialChange = (platform: keyof StoreData['socialLinks'], value: string) => {
    setStoreData((prev: any) => ({
      ...prev,
      socialLinks: {
        ...prev.socialLinks,
        [platform]: value,
      },
    }));
  };

  const uploadImage = async (file: File): Promise<string> => {
    const regId = business.id;
    if (!regId) throw new Error('No business ID available');
    const formData = new FormData();
    formData.append('image', file);
    const res = await fetch(`/api/business/${regId}/images`, {
      method: 'POST',
      headers: authHeaders,
      body: formData,
    });
    const data = await safeJsonResponse(res);
    if (!data.success) {
      throw new Error(data.error || 'Upload failed');
    }
    return data.url;
  };

  const handleImageSelect = async (event: ChangeEvent<HTMLInputElement>, kind: 'logo' | 'banner') => {
    const file = event.target.files?.[0];
    if (!file) return;
    const previewUrl = URL.createObjectURL(file);
    error && setError('');
    if (kind === 'logo') {
      setLogoPreview(previewUrl);
    } else {
      setBannerPreview(previewUrl);
    }
    try {
      const url = await uploadImage(file);
      setStoreData((prev: any) => {
        if (!prev) return prev;
        return { ...prev, [kind === 'logo' ? 'storeLogo' : 'storeBanner']: url };
      });
    } catch (e: any) {
      setError(e.message || 'Upload failed');
      if (kind === 'logo') {
        setLogoPreview(storeData?.storeLogo || '');
      } else {
        setBannerPreview(storeData?.storeBanner || '');
      }
    }
    event.target.value = '';
  };

  const handleSave = async () => {
    if (!storeData) return;
    const regId = business.id;
    if (!regId) return;
    if (!storeData.businessName.trim()) {
      setError('Store name is required');
      return;
    }
    if (storeData.phone && storeData.phone.replace(/\D/g, '').length !== 10) {
      setError('Phone number must be exactly 10 digits');
      return;
    }

    setSaving(true);
    setError('');
    setSuccess('');

    try {
       const res = await fetch(`/api/business/${business.id}`, {
         method: 'PUT',
         headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify({
          businessName: storeData.businessName,
          businessType: storeData.businessType,
          businessCategory: storeData.businessCategory,
          phone: storeData.phone,
          whatsappNumber: storeData.whatsappNumber,
          address: storeData.address,
          city: storeData.city,
          region: storeData.region,
          country: storeData.country,
          preferredContactMethod: storeData.preferredContactMethod,
          description: storeData.description,
          storeLogo: storeData.storeLogo,
          storeBanner: storeData.storeBanner,
          businessHours: storeData.businessHours,
          socialLinks: storeData.socialLinks,
          storeStatus: storeData.storeStatus,
        }),
      });
      const data = await safeJsonResponse(res);
      if (!data.success) {
        setError(data.error || 'Failed to save store information');
      } else {
        setSuccess('Store information updated successfully');
        setIsEditing(false);
        loadStoreData();
      }
    } catch (e: any) {
      setError(e.message || 'Failed to save store information');
    } finally {
      setSaving(false);
    }
  };

  const publicStoreUrl = storeData?.businessName
    ? `/store/${storeData.businessName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')}`
    : '';

  const daysDisplay = {
    monday: 'Monday', tuesday: 'Tuesday', wednesday: 'Wednesday',
    thursday: 'Thursday', friday: 'Friday', saturday: 'Saturday', sunday: 'Sunday',
  };

  const socialIcons = {
    facebook: Facebook, instagram: Instagram, twitter: Twitter,
    whatsapp: MessageCircle, website: Globe,
  };

  const renderStoreView = () => {
    if (!storeData) return null;
    const hoursEntries = Object.entries(storeData.businessHours || {});
    const openDays = hoursEntries.filter(([_, v]) => !v.closed);
    const firstOpen = openDays[0];
    const lastOpen = openDays[openDays.length - 1];
    const hoursSummary = firstOpen && lastOpen
      ? `${firstOpen[1].open} – ${lastOpen[1].close}`
      : 'Closed all hours';

    return (
      <div className="grid xl:grid-cols-[1.1fr_0.9fr] gap-6">
        <section className="bg-white border border-[#eee5df] rounded-2xl p-6 shadow-[0_4px_18px_rgba(74,43,28,0.04)]">
          <div className="relative h-32 rounded-xl bg-[#f5ebe5] overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-[#6f3d27]/60 to-transparent" />
            {storeData.storeBanner && <img src={storeData.storeBanner} alt="Store banner" className="w-full h-full object-cover" />}
            {!storeData.storeBanner && <span className="text-xs text-[#927f74] absolute bottom-3 right-3">No banner</span>}
          </div>
          <div className="flex items-end gap-4 -mt-8 ml-4 relative">
            <div className="w-20 h-20 rounded-2xl bg-[#ead9ce] border-4 border-white text-[#70402b] flex items-center justify-center overflow-hidden">
              {storeData.storeLogo ? <img src={storeData.storeLogo} alt="Store logo" className="w-full h-full object-cover" /> : <Store className="w-9 h-9" />}
            </div>
          </div>
          <div className="mt-4 pb-4 border-b border-[#f1ebe7]">
            <h2 className="text-2xl font-bold">{storeData.businessName || business.name}</h2>
            <p className="text-sm text-[#927f74] mt-1">{storeData.businessCategory || business.category || 'Marketplace store'}</p>
            <span className={`inline-flex mt-2 px-2.5 py-1 rounded-full text-xs font-semibold ${
              storeData.storeStatus === 'live'
                ? 'bg-[#e6f4ea] text-[#23723a]'
                : 'bg-[#fff4e5] text-[#926a00]'
            }`}>
              {storeData.storeStatus === 'live' ? 'Active' : 'Paused'}
            </span>
          </div>
          <p className="text-sm text-[#806e64] leading-6 mt-4">
            {storeData.description || 'Add a short description to tell customers what makes your store special.'}
          </p>

          <div className="grid sm:grid-cols-2 gap-4 mt-6 text-sm">
            <div className="flex gap-3">
              <Phone className="w-4 h-4 text-[#8a553a] mt-0.5" />
              <div>
                <p className="text-xs text-[#927f74]">Phone number</p>
                <p className="font-medium mt-1">{storeData.phone || 'Not added'}</p>
              </div>
            </div>
            <div className="flex gap-3">
              <MessageCircle className="w-4 h-4 text-[#8a553a] mt-0.5" />
              <div>
                <p className="text-xs text-[#927f74]">WhatsApp</p>
                <p className="font-medium mt-1">{storeData.whatsappNumber || 'Not added'}</p>
              </div>
            </div>
            <div className="flex gap-3">
              <MapPin className="w-4 h-4 text-[#8a553a] mt-0.5" />
              <div>
                <p className="text-xs text-[#927f74]">Location</p>
                <p className="font-medium mt-1">{storeData.city || '—'}, {storeData.region || '—'}</p>
              </div>
            </div>
            <div className="flex gap-3">
              <Clock3 className="w-4 h-4 text-[#8a553a] mt-0.5" />
              <div>
                <p className="text-xs text-[#927f74]">Opening hours</p>
                <p className="font-medium mt-1">{hoursSummary}</p>
              </div>
            </div>
          </div>

          {Object.values(storeData.socialLinks || {}).some((v) => v) && (
            <div className="flex gap-3 mt-4">
              {Object.entries(storeData.socialLinks).map(([platform, value]) => {
                if (!value) return null;
                const Icon = socialIcons[platform as keyof typeof socialIcons];
                if (!Icon) return null;
                return (
                  <a key={platform} href={value as string} target="_blank" rel="noopener noreferrer"
                    className="p-2 rounded-lg bg-[#f5ebe5] text-[#6f3d27] hover:bg-[#ead9ce] transition">
                    <Icon className="w-4 h-4" />
                  </a>
                );
              })}
            </div>
          )}
        </section>

        <section className="bg-[#3f2418] rounded-2xl p-6 text-white min-h-[300px] flex flex-col justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-[#d8b7a3]">Store preview</p>
            <h2 className="text-2xl font-bold mt-3">{storeData.businessName || business.name}</h2>
            <p className="text-sm text-[#e5d4ca] mt-3 leading-6">This is how customers will see your store on NKAY Marketplace.</p>
          </div>
          <Link to="/"
            className="inline-flex items-center justify-center gap-2 bg-white text-[#3f2418] rounded-xl px-4 py-3 text-sm font-semibold w-full sm:w-fit mt-6 hover:bg-[#f0e6dd]">
            <ExternalLink className="w-4 h-4" />
            View My Store on Homepage
          </Link>
        </section>
      </div>
    );
  };

  const renderEditForm = () => {
    if (!storeData) return null;
    return (
      <div className="space-y-6">
        {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>}
        {success && <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">{success}</div>}

        <div className="sm:col-span-2">
          <label className="text-sm font-semibold text-[#4e362a]">Store Name</label>
          <input
            type="text"
            value={storeData.businessName}
            onChange={(e) => handleFieldChange('businessName', e.target.value)}
            className="mt-2 w-full h-11 rounded-xl border border-[#e7ddd7] px-3 text-sm outline-none focus:border-[#6f3d27]"
            placeholder="e.g. NKAY Artisan Shop"
          />
          {storeData.businessName && publicStoreUrl && (
            <p className="mt-1 text-xs text-[#927f74]">Public URL: <span className="text-[#6f3d27] font-medium">{publicStoreUrl}</span></p>
          )}
        </div>

        <div className="sm:col-span-2">
          <label className="text-sm font-semibold text-[#4e362a]">Store Description</label>
          <textarea
            value={storeData.description}
            onChange={(e) => handleFieldChange('description', e.target.value)}
            className="mt-2 w-full min-h-28 rounded-xl border border-[#e7ddd7] p-3 text-sm font-normal outline-none focus:border-[#6f3d27]"
            placeholder="Tell customers what makes your store special."
          />
        </div>

        <div className="grid sm:grid-cols-2 gap-5">
          <div>
            <label className="text-sm font-semibold text-[#4e362a]">Category</label>
            <select
              value={storeData.businessCategory}
              onChange={(e) => handleFieldChange('businessCategory', e.target.value)}
              className="mt-2 w-full h-11 rounded-xl border border-[#e7ddd7] px-3 text-sm bg-white outline-none focus:border-[#6f3d27]"
            >
              <option value="">Choose category</option>
              <option>Fashion</option><option>Electronics</option><option>Beauty</option><option>Groceries</option><option>Food</option><option>Home &amp; Kitchen</option><option>Phones &amp; Accessories</option><option>Automotive</option><option>Computer &amp; Technology</option><option>Health &amp; Personal Care</option><option>Sports</option><option>Baby &amp; Kids</option><option>Books &amp; Education</option><option>Construction</option><option>Agriculture</option><option>Services</option><option>Other</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-semibold text-[#4e362a]">Business Type</label>
            <input
              type="text"
              value={storeData.businessType}
              onChange={(e) => handleFieldChange('businessType', e.target.value)}
              className="mt-2 w-full h-11 rounded-xl border border-[#e7ddd7] px-3 text-sm outline-none focus:border-[#6f3d27]"
              placeholder="e.g. Sole Proprietorship"
            />
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-5">
          <div>
            <label className="text-sm font-semibold text-[#4e362a]">Phone Number</label>
            <input
              type="tel"
              value={storeData.phone}
              onChange={(e) => handleFieldChange('phone', e.target.value)}
              className="mt-2 w-full h-11 rounded-xl border border-[#e7ddd7] px-3 text-sm outline-none focus:border-[#6f3d27]"
              placeholder="02XXXXXXXX"
            />
          </div>
          <div>
            <label className="text-sm font-semibold text-[#4e362a]">WhatsApp Number</label>
            <input
              type="tel"
              value={storeData.whatsappNumber}
              onChange={(e) => handleFieldChange('whatsappNumber', e.target.value)}
              className="mt-2 w-full h-11 rounded-xl border border-[#e7ddd7] px-3 text-sm outline-none focus:border-[#6f3d27]"
              placeholder="02XXXXXXXX"
            />
          </div>
          <div>
            <label className="text-sm font-semibold text-[#4e362a]">Region</label>
            <input
              type="text"
              value={storeData.region}
              onChange={(e) => handleFieldChange('region', e.target.value)}
              className="mt-2 w-full h-11 rounded-xl border border-[#e7ddd7] px-3 text-sm outline-none focus:border-[#6f3d27]"
              placeholder="e.g. Greater Accra"
            />
          </div>
          <div>
            <label className="text-sm font-semibold text-[#4e362a]">City</label>
            <input
              type="text"
              value={storeData.city}
              onChange={(e) => handleFieldChange('city', e.target.value)}
              className="mt-2 w-full h-11 rounded-xl border border-[#e7ddd7] px-3 text-sm outline-none focus:border-[#6f3d27]"
              placeholder="e.g. Accra"
            />
          </div>
          <div>
            <label className="text-sm font-semibold text-[#4e362a]">Address</label>
            <input
              type="text"
              value={storeData.address}
              onChange={(e) => handleFieldChange('address', e.target.value)}
              className="mt-2 w-full h-11 rounded-xl border border-[#e7ddd7] px-3 text-sm outline-none focus:border-[#6f3d27]"
              placeholder="Street address"
            />
          </div>
          <div>
            <label className="text-sm font-semibold text-[#4e362a]">Store Status</label>
            <select
              value={storeData.storeStatus}
              onChange={(e) => handleFieldChange('storeStatus', e.target.value)}
              className="mt-2 w-full h-11 rounded-xl border border-[#e7ddd7] px-3 text-sm bg-white outline-none focus:border-[#6f3d27]"
            >
              <option value="live">Live — Customers can order</option>
              <option value="paused">Paused — Temporarily unavailable</option>
            </select>
          </div>
        </div>

        <div>
          <label className="text-sm font-semibold text-[#4e362a]">Business Hours</label>
          <div className="mt-2 space-y-2">
            {DAYS.map((day) => {
              const hours = storeData.businessHours[day] || { open: '', close: '', closed: false };
              return (
                <div key={day} className="flex items-center gap-3">
                  <label className="w-24 text-sm text-[#4e362a] capitalize">{daysDisplay[day]}</label>
                  <input type="checkbox"
                    checked={hours.closed}
                    onChange={(e) => handleHoursChange(day, 'closed', e.target.checked)}
                    className="rounded border-[#e7ddd7] text-[#6f3d27] focus:ring-[#6f3d27]"
                  />
                  <span className="text-xs text-[#927f74]">Closed</span>
                  {!hours.closed && (
                    <>
                      <input
                        type="time"
                        value={hours.open}
                        onChange={(e) => handleHoursChange(day, 'open', e.target.value)}
                        className="w-32 h-9 rounded-xl border border-[#e7ddd7] px-2 text-sm outline-none focus:border-[#6f3d27]"
                      />
                      <span className="text-xs text-[#927f74]">to</span>
                      <input
                        type="time"
                        value={hours.close}
                        onChange={(e) => handleHoursChange(day, 'close', e.target.value)}
                        className="w-32 h-9 rounded-xl border border-[#e7ddd7] px-2 text-sm outline-none focus:border-[#6f3d27]"
                      />
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div>
          <label className="text-sm font-semibold text-[#4e362a]">Social Links</label>
          <div className="mt-2 space-y-2">
            {(['facebook', 'instagram', 'twitter', 'whatsapp', 'website'] as const).map((platform) => {
              const Icon = socialIcons[platform];
              return (
                <div key={platform} className="flex items-center gap-3">
                  <Icon className="w-4 h-4 text-[#8a553a]" />
                  <label className="w-24 text-sm text-[#4e362a] capitalize">{platform}</label>
                  <input
                    type="url"
                    value={storeData.socialLinks[platform] || ''}
                    onChange={(e) => handleSocialChange(platform, e.target.value)}
                    className="mt-1 w-full h-9 rounded-xl border border-[#e7ddd7] px-2 text-sm outline-none focus:border-[#6f3d27]"
                    placeholder={`https://${platform}.com/your-store`}
                  />
                </div>
              );
            })}
          </div>
        </div>

        <div>
          <label className="text-sm font-semibold text-[#4e362a]">Store Logo</label>
          <div className="mt-2 flex items-center gap-4">
            <div className="w-20 h-20 rounded-2xl bg-[#ead9ce] border-2 border-[#eee5df] text-[#70402b] flex items-center justify-center overflow-hidden">
              {logoPreview ? <img src={logoPreview} alt="logo" className="w-full h-full object-cover" /> : <Store className="w-9 h-9" />}
            </div>
            <label className="text-xs font-semibold text-[#6f3d27] cursor-pointer bg-[#f5ebe5] rounded-lg px-3 py-2">
              <Upload className="w-3 h-3 inline mr-1" />
              Change logo
              <input type="file" accept="image/*" className="hidden" onChange={(event) => handleImageSelect(event, 'logo')} />
            </label>
          </div>
        </div>

        <div>
          <label className="text-sm font-semibold text-[#4e362a]">Store Banner</label>
          <div className="mt-2">
            <div className="h-32 rounded-xl bg-[#f5ebe5] overflow-hidden border border-[#eee5df] flex items-center justify-center">
              {bannerPreview ? <img src={bannerPreview} alt="banner" className="w-full h-full object-cover" /> : <span className="text-xs text-[#927f74]">No banner selected</span>}
            </div>
            <label className="text-xs font-semibold text-[#6f3d27] cursor-pointer bg-[#f5ebe5] rounded-lg px-3 py-2 inline-block mt-2">
              <Upload className="w-3 h-3 inline mr-1" />
              Change banner
              <input type="file" accept="image/*" className="hidden" onChange={(event) => handleImageSelect(event, 'banner')} />
            </label>
          </div>
        </div>
      </div>
    );
  };

  return (
    <VendorLayout title="My Store">
      <PageHeading
        title="My Store"
        description="Keep your store information clear and up to date for customers."
        action={
          isEditing ? (
            <button
              onClick={handleCancelEdit}
              className="inline-flex items-center gap-2 bg-[#e7ddd7] text-[#4e362a] px-4 py-2.5 rounded-xl text-sm font-semibold"
            >
              <X className="w-4 h-4" />Cancel
            </button>
          ) : (
            <button
              onClick={handleEdit}
              className="inline-flex items-center gap-2 bg-[#6f3d27] text-white px-4 py-2.5 rounded-xl text-sm font-semibold"
            >
              <Pencil className="w-4 h-4" />Edit Store
            </button>
          )
        }
      />

      {!isEditing && error && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      {!isEditing && !loadAttempted && (
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-blue-700 text-sm">
          Loading store information...
        </div>
      )}

      {!isEditing && storeData && renderStoreView()}

      {isEditing && (
        <div className="fixed inset-0 bg-[#10251b]/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="sticky top-0 z-10 bg-white/95 backdrop-blur border-b border-[#edf1ee] p-5 flex items-center justify-between gap-4">
              <h3 className="text-xl font-bold">Edit Store Information</h3>
              <button
                aria-label="Close editor"
                onClick={handleCancelEdit}
                className="p-2 rounded-lg text-text-light hover:bg-[#eef5f0] hover:text-primary transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5">
              {loadingStore && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-blue-700 text-sm mb-4">
                  Loading store information...
                </div>
              )}
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm mb-4">
                  {error}
                </div>
              )}
              <div className="grid sm:grid-cols-2 gap-5">
                {renderEditForm()}
              </div>
            </div>
            <div className="flex gap-3 mt-8 pt-6 border-t border-[#f1ebe7]">
              <button
                onClick={handleSave}
                disabled={saving}
                className="inline-flex items-center justify-center gap-2 bg-[#6f3d27] text-white px-6 py-3 rounded-xl text-sm font-semibold hover:bg-[#54301f] transition disabled:opacity-60"
              >
                <Save className="w-4 h-4" />
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
              <button
                onClick={handleCancelEdit}
                className="border border-[#e7ddd7] text-[#6f3d27] px-6 py-3 rounded-xl text-sm font-semibold"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </VendorLayout>
  );
};
