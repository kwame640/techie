import { useEffect, useMemo, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Building2,
  CheckCircle2,
  ChevronRight,
  Grid2X2,
  Image as ImageIcon,
  LayoutList,
  MapPin,
  RefreshCw,
  Search,
  Sparkles,
  User,
  Settings,
  LogOut,
  ChevronDown,
  X,
} from 'lucide-react';
import logoImage from '../../images/nkay.png';

interface BusinessImage {
  id: string;
  imageUrl: string;
  originalName: string;
}

interface Registration {
  id: string;
  businessName: string;
  businessType: string;
  businessCategory: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  region: string;
  description: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  registrationDate: string;
  imageCount?: number;
  images?: BusinessImage[];
}

type ViewMode = 'grid' | 'list';

const avatarPalette = [
  'bg-[#e9f5ef] text-[#16734b]',
  'bg-[#fff1d7] text-[#a05a00]',
  'bg-[#e9efff] text-[#3557a5]',
  'bg-[#f5eafa] text-[#7d3e9d]',
];

const initialsFor = (name: string) => name
  .split(' ')
  .filter(Boolean)
  .slice(0, 2)
  .map((word) => word[0])
  .join('')
  .toUpperCase();

export const VendorDashboard = () => {
  const [vendors, setVendors] = useState<Registration[]>([]);
  const [selectedVendor, setSelectedVendor] = useState<Registration | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All categories');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const token = localStorage.getItem('adminToken');

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };
    if (dropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [dropdownOpen]);

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    navigate('/admin/login');
  };

  const handleMenuClick = (action: string) => {
    setDropdownOpen(false);
    if (action === 'logout') handleLogout();
    else if (action === 'profile') navigate('/admin/profile');
    else if (action === 'settings') navigate('/admin/settings');
  };

  const fetchApprovedVendors = async (showRefreshState = false) => {
    if (showRefreshState) setIsRefreshing(true);
    setLoadError('');

    try {
      const response = await fetch('/api/registrations', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || 'Unable to load vendors');
      setVendors((data.registrations || []).filter((vendor: Registration) => vendor.status === 'Approved'));
    } catch (error) {
      console.error('Failed to fetch approved vendors:', error);
      setLoadError('Vendor data could not be loaded. Try refreshing the dashboard.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    if (!token) {
      navigate('/admin/login');
      return;
    }
    fetchApprovedVendors();
  }, [navigate, token]);

  const categories = useMemo(() => [
    'All categories',
    ...Array.from(new Set(vendors.map((vendor) => vendor.businessCategory).filter(Boolean))).sort(),
  ], [vendors]);

  const filteredVendors = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    return vendors.filter((vendor) => {
      const searchableValues = [vendor.businessName, vendor.businessCategory, vendor.businessType, vendor.city, vendor.region, vendor.email];
      const matchesSearch = !query || searchableValues.some((value) => value?.toLowerCase().includes(query));
      const matchesCategory = categoryFilter === 'All categories' || vendor.businessCategory === categoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [categoryFilter, searchTerm, vendors]);

  const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString('en-GH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  const fetchVendorDetails = async (id: string) => {
    try {
      const response = await fetch(`/api/registrations/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (data.success) setSelectedVendor(data.registration);
    } catch (error) {
      console.error('Failed to fetch vendor details:', error);
    }
  };

  const totalImages = vendors.reduce((sum, vendor) => sum + (vendor.imageCount || 0), 0);
  const cities = new Set(vendors.map((vendor) => vendor.city).filter(Boolean)).size;
  const newestVendor = [...vendors].sort((a, b) => (
    new Date(b.registrationDate).getTime() - new Date(a.registrationDate).getTime()
  ))[0];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#f6f8f6] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[#d8e8df] border-t-primary rounded-full animate-spin mx-auto" />
          <p className="mt-4 text-sm text-text-light">Preparing your vendor workspace...</p>
        </div>
      </div>
    );
  }

  const metrics = [
    { label: 'Approved vendors', value: vendors.length, detail: 'Active in your network', icon: CheckCircle2, tone: 'green' },
    { label: 'Locations covered', value: cities, detail: 'Unique cities represented', icon: MapPin, tone: 'blue' },
    { label: 'Gallery assets', value: totalImages, detail: 'Uploaded business photos', icon: ImageIcon, tone: 'amber' },
    { label: 'Newest approval', value: newestVendor ? formatDate(newestVendor.registrationDate) : '—', detail: newestVendor?.businessName || 'No approvals yet', icon: Sparkles, tone: 'violet' },
  ];

  return (
    <div className="min-h-screen bg-[#f6f8f6] text-text">
      <header className="sticky top-0 z-30 border-b border-[#e5ebe6] bg-white/90 backdrop-blur-xl">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 h-[76px] flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <img src={logoImage} alt="NKAY" className="h-9 w-auto" />
            <div className="h-8 w-px bg-[#dde5df] hidden sm:block" />
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-[0.22em] text-text-light">Operations</p>
              <h1 className="text-base sm:text-lg font-bold truncate">Vendor workspace</h1>
            </div>
          </div>
          <div ref={dropdownRef} className="relative">
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-text-light hover:text-primary hover:bg-[#eef5f0] transition"
            >
              <User className="w-5 h-5" />
              <ChevronDown className="w-4 h-4" />
            </button>
            {dropdownOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white border border-[#e5ebe6] rounded-xl shadow-lg py-1 z-50">
                <button
                  onClick={() => handleMenuClick('profile')}
                  className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-text hover:bg-[#f6f8f6] hover:text-primary transition text-left"
                >
                  <User className="w-4 h-4" />
                  Edit Profile
                </button>
                <button
                  onClick={() => handleMenuClick('settings')}
                  className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-text hover:bg-[#f6f8f6] hover:text-primary transition text-left"
                >
                  <Settings className="w-4 h-4" />
                  Settings
                </button>
                <hr className="my-1 border-[#e5ebe6]" />
                <button
                  onClick={() => handleMenuClick('logout')}
                  className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition text-left"
                >
                  <LogOut className="w-4 h-4" />
                  Logout
                </button>
              </div>
            )}
          </div>
          <button onClick={() => navigate('/admin')} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-text-light hover:text-primary hover:bg-[#eef5f0] transition">
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Admin dashboard</span>
          </button>
        </div>
      </header>

      <main className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-10">
        <section className="relative overflow-hidden rounded-[24px] bg-[#153c2b] text-white p-6 sm:p-8 lg:p-10 mb-7">
          <div className="absolute -right-16 -top-24 w-72 h-72 rounded-full border-[34px] border-white/5" />
          <div className="absolute right-20 -bottom-36 w-80 h-80 rounded-full border-[30px] border-[#b6d940]/10" />
          <div className="relative max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium text-[#d8edb2] mb-5">
              <Sparkles className="w-3.5 h-3.5" />
              Approved network
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-[46px] leading-[1.05] font-bold tracking-tight">
              Your vendor network,<br className="hidden sm:block" /> in one clear view.
            </h2>
            <p className="mt-4 text-sm sm:text-base leading-7 text-[#c4d8cc] max-w-xl">
              Keep an eye on every approved business, understand your network at a glance, and open the full profile when a closer look is needed.
            </p>
          </div>
        </section>

        <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
          {metrics.map(({ label, value, detail, icon: Icon, tone }) => (
            <div key={label} className="bg-white border border-[#e5ebe6] rounded-2xl p-5 shadow-[0_8px_24px_rgba(21,60,43,0.04)]">
              <div className="flex items-start justify-between gap-3">
                <div><p className="text-xs font-medium text-text-light">{label}</p><p className="text-2xl font-bold mt-2 tracking-tight">{value}</p></div>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${tone === 'green' ? 'bg-[#e6f5ed] text-[#16734b]' : tone === 'blue' ? 'bg-[#eaf0ff] text-[#3557a5]' : tone === 'amber' ? 'bg-[#fff1d7] text-[#a05a00]' : 'bg-[#f5eafa] text-[#7d3e9d]'}`}><Icon className="w-5 h-5" /></div>
              </div>
              <p className="text-xs text-text-light mt-3 truncate">{detail}</p>
            </div>
          ))}
        </section>

        <section className="bg-white border border-[#e5ebe6] rounded-2xl shadow-[0_8px_24px_rgba(21,60,43,0.04)] overflow-hidden">
          <div className="p-5 sm:p-6 border-b border-[#edf1ee]">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-3"><h3 className="text-xl font-bold tracking-tight">Approved vendors</h3><span className="rounded-full bg-[#e6f5ed] px-2.5 py-1 text-xs font-semibold text-[#16734b]">{vendors.length} total</span></div>
                <p className="text-sm text-text-light mt-1">Search, filter, and review the businesses ready to go live.</p>
              </div>
              <button onClick={() => fetchApprovedVendors(true)} disabled={isRefreshing} className="inline-flex items-center justify-center gap-2 self-start lg:self-auto px-3 py-2 text-sm font-medium border border-[#dfe8e1] rounded-lg text-text-light hover:text-primary hover:border-primary transition disabled:opacity-60"><RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />Refresh</button>
            </div>
            <div className="flex flex-col md:flex-row gap-3 mt-6">
              <label className="relative flex-1"><Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-light" /><input value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="Search vendors, categories, cities..." className="w-full h-11 rounded-lg border border-[#dfe8e1] bg-[#fbfcfb] pl-10 pr-4 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/10" /></label>
              <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)} className="h-11 rounded-lg border border-[#dfe8e1] bg-[#fbfcfb] px-3 text-sm text-text outline-none focus:border-primary focus:ring-2 focus:ring-primary/10">{categories.map((category) => <option key={category}>{category}</option>)}</select>
              <div className="flex items-center border border-[#dfe8e1] rounded-lg p-1 bg-[#fbfcfb] self-start"><button aria-label="Grid view" onClick={() => setViewMode('grid')} className={`p-2 rounded-md transition ${viewMode === 'grid' ? 'bg-white shadow-sm text-primary' : 'text-text-light hover:text-primary'}`}><Grid2X2 className="w-4 h-4" /></button><button aria-label="List view" onClick={() => setViewMode('list')} className={`p-2 rounded-md transition ${viewMode === 'list' ? 'bg-white shadow-sm text-primary' : 'text-text-light hover:text-primary'}`}><LayoutList className="w-4 h-4" /></button></div>
            </div>
          </div>

          {loadError && <div className="mx-5 mt-5 rounded-lg bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-700">{loadError}</div>}
          {filteredVendors.length === 0 ? (
            <div className="p-14 text-center"><div className="w-14 h-14 rounded-2xl bg-[#eef5f0] text-primary flex items-center justify-center mx-auto mb-4"><Building2 className="w-7 h-7" /></div><h4 className="font-semibold">{vendors.length === 0 ? 'No approved vendors yet' : 'No vendors match your search'}</h4><p className="text-sm text-text-light mt-1">{vendors.length === 0 ? 'Approved businesses will appear here automatically.' : 'Try a different name, city, or category.'}</p></div>
          ) : (
            <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 p-5 sm:p-6' : 'divide-y divide-[#edf1ee]'}>
              {filteredVendors.map((vendor, index) => (
                <article key={vendor.id} className={viewMode === 'grid' ? 'group border border-[#e5ebe6] rounded-2xl p-5 hover:border-[#b9d3c2] hover:shadow-[0_12px_28px_rgba(21,60,43,0.08)] transition-all' : 'p-5 sm:px-6 flex flex-col sm:flex-row sm:items-center gap-4 hover:bg-[#fbfcfb] transition'}>
                  <div className="flex items-start gap-3 min-w-0 flex-1"><div className={`shrink-0 w-11 h-11 rounded-xl flex items-center justify-center font-bold ${avatarPalette[index % avatarPalette.length]}`}>{initialsFor(vendor.businessName)}</div><div className="min-w-0"><div className="flex items-center gap-2 flex-wrap"><h4 className="font-bold truncate">{vendor.businessName}</h4><span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#16734b] bg-[#e6f5ed] rounded-full px-2 py-0.5"><CheckCircle2 className="w-3 h-3" />Approved</span></div><p className="text-xs text-primary font-medium mt-1">{vendor.businessCategory || vendor.businessType}</p></div></div>
                  <div className={viewMode === 'grid' ? 'space-y-2.5 text-sm text-text-light mt-5' : 'hidden md:flex items-center gap-6 text-sm text-text-light'}><span className="inline-flex items-center gap-2"><MapPin className="w-4 h-4" />{vendor.city || vendor.region || 'Location not set'}</span><span className="inline-flex items-center gap-2"><ImageIcon className="w-4 h-4" />{vendor.imageCount || 0} photos</span></div>
                  <div className={viewMode === 'grid' ? 'flex items-center justify-between border-t border-[#edf1ee] pt-4 mt-5' : 'flex items-center justify-between sm:justify-end gap-5'}><span className="text-xs text-text-light">Approved {formatDate(vendor.registrationDate)}</span><button onClick={() => fetchVendorDetails(vendor.id)} className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:text-[#0f4f32] transition">View profile <ChevronRight className="w-4 h-4" /></button></div>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>

      {selectedVendor && (
        <div className="fixed inset-0 bg-[#10251b]/60 backdrop-blur-sm flex items-center justify-center p-4 z-50" onClick={() => setSelectedVendor(null)}>
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="sticky top-0 z-10 bg-white/95 backdrop-blur border-b border-[#edf1ee] p-5 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-12 h-12 rounded-xl bg-[#e6f5ed] text-[#16734b] flex items-center justify-center font-bold">{initialsFor(selectedVendor.businessName)}</div>
                <div className="min-w-0"><p className="text-xs font-medium text-primary">Vendor profile</p><h3 className="text-xl font-bold truncate">{selectedVendor.businessName}</h3></div>
              </div>
              <button aria-label="Close vendor profile" onClick={() => setSelectedVendor(null)} className="p-2 rounded-lg text-text-light hover:bg-[#eef5f0] hover:text-primary transition"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5 space-y-6">
              <div className="rounded-xl bg-[#f6f8f6] border border-[#e8eee9] p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div><p className="text-xs text-text-light">Business type</p><p className="text-sm font-semibold mt-1">{selectedVendor.businessType}</p></div>
                <div><p className="text-xs text-text-light">Category</p><p className="text-sm font-semibold mt-1">{selectedVendor.businessCategory}</p></div>
                <div><p className="text-xs text-text-light">Email</p><p className="text-sm font-semibold mt-1 break-words">{selectedVendor.email}</p></div>
                <div><p className="text-xs text-text-light">Phone</p><p className="text-sm font-semibold mt-1">{selectedVendor.phone || 'Not provided'}</p></div>
                <div><p className="text-xs text-text-light">Region</p><p className="text-sm font-semibold mt-1">{selectedVendor.region || 'Not provided'}</p></div>
                <div><p className="text-xs text-text-light">City</p><p className="text-sm font-semibold mt-1">{selectedVendor.city || 'Not provided'}</p></div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5"><div><p className="text-xs text-text-light mb-1">Address</p><p className="text-sm leading-6">{selectedVendor.address || 'Not provided'}</p></div><div><p className="text-xs text-text-light mb-1">Description</p><p className="text-sm leading-6">{selectedVendor.description || 'No description provided'}</p></div></div>
              {selectedVendor.images && selectedVendor.images.length > 0 && <div><div className="flex items-center justify-between mb-3"><p className="text-sm font-semibold">Business gallery</p><span className="text-xs text-text-light">{selectedVendor.images.length} photos</span></div><div className="grid grid-cols-2 md:grid-cols-3 gap-3">{selectedVendor.images.map((image) => <img key={image.id} src={image.imageUrl} alt={image.originalName} className="h-32 w-full object-cover rounded-xl border border-[#e5ebe6]" />)}</div></div>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
