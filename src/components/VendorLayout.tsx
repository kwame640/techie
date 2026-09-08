import { ReactNode, useState, useRef, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Bell, Image, LayoutDashboard, LogOut, Menu, Package, Settings, ShoppingBag, Store, Wallet, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import logoImage from '../images/nkay.png';

const navigation = [
  { label: 'Dashboard', path: '/business/dashboard', icon: LayoutDashboard },
  { label: 'Products', path: '/business/products', icon: Package },
  { label: 'Orders', path: '/business/orders', icon: ShoppingBag },
  { label: 'Earnings', path: '/business/earnings', icon: Wallet },
  { label: 'Store', path: '/business/store', icon: Store },
  { label: 'Media', path: '/business/media', icon: Image },
  { label: 'Settings', path: '/business/settings', icon: Settings },
  { label: 'Notifications', path: '/business/notifications', icon: Bell },
];

export const VendorLayout = ({ children, title }: { children: ReactNode; title?: string }) => {
  const { business, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const name = business?.name || 'Your Store';
  const initials = name.split(' ').map((part: string) => part[0]).join('').slice(0, 2).toUpperCase();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setNotifOpen(false);
      }
    };
    if (notifOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [notifOpen]);

  const signOut = async () => {
    await logout();
    navigate('/login');
  };

  const nav = (
    <nav className="space-y-1">
      {navigation.map(({ label, path, icon: Icon }) => {
        const active = location.pathname === path;
        return <Link key={path} to={path} onClick={() => setMobileOpen(false)} className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition ${active ? 'bg-[#3f2418] text-white shadow-sm' : 'text-[#735e53] hover:bg-[#f7f1ed] hover:text-[#3f2418]'}`}><Icon className="w-[18px] h-[18px]" />{label}</Link>;
      })}
    </nav>
  );

  return <div className="min-h-screen bg-[#faf8f6] text-[#2d211b]">
    <aside className="hidden lg:flex fixed inset-y-0 left-0 w-64 bg-white border-r border-[#eee5df] flex-col z-40">
      <div className="px-6 h-[76px] flex items-center border-b border-[#f1ebe7]"><img src={logoImage} alt="NKAY" className="h-9 w-auto" /><span className="ml-3 text-[10px] uppercase tracking-[0.18em] text-[#947d70]">Seller Center</span></div>
      <div className="p-5 flex-1">{nav}</div>
      <div className="p-5 border-t border-[#f1ebe7]"><div className="flex items-center gap-3 mb-4"><div className="w-10 h-10 rounded-full bg-[#ead9ce] text-[#6b3926] flex items-center justify-center text-sm font-bold">{initials}</div><div className="min-w-0"><p className="text-sm font-semibold truncate">{name}</p><p className="text-xs text-[#9a887d]">My Store</p></div></div><button onClick={signOut} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-[#806c61] hover:text-[#3f2418] hover:bg-[#f7f1ed] rounded-lg transition"><LogOut className="w-4 h-4" />Logout</button></div>
    </aside>
    <div className="lg:pl-64">
      <header className="h-[76px] bg-white/90 backdrop-blur border-b border-[#eee5df] sticky top-0 z-30">
        <div className="h-full px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button className="lg:hidden p-2 rounded-lg hover:bg-[#f7f1ed]" onClick={() => setMobileOpen(true)} aria-label="Open navigation">
              <Menu className="w-5 h-5" />
            </button>
            <div className="lg:hidden"><img src={logoImage} alt="NKAY" className="h-8 w-auto" /></div>
            {title && <div className="hidden sm:block border-l border-[#e9dfd8] pl-4 text-sm font-medium text-[#6e5a4e]">{title}</div>}
          </div>
          <div className="flex items-center gap-4">
            <div ref={notifRef} className="relative">
              <button
                onClick={() => setNotifOpen(!notifOpen)}
                className="relative p-2 text-[#806c61] hover:text-[#3f2418] rounded-lg hover:bg-[#f7f1ed] transition"
                aria-label="Notifications"
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 flex items-center justify-center w-5 h-5 text-[10px] font-bold text-white bg-[#b94c3d] rounded-full">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>
              {notifOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-white border border-[#eee5df] rounded-xl shadow-lg overflow-hidden z-50">
                  <div className="p-3 border-b border-[#f1ebe7] flex items-center justify-between">
                    <h4 className="font-semibold text-sm text-text">Notifications</h4>
                    {unreadCount > 0 && (
                      <button
                        onClick={() => { markAllAsRead(); setNotifOpen(false); }}
                        className="text-xs text-primary hover:underline"
                      >
                        Mark all read
                      </button>
                    )}
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="p-4 text-center text-sm text-text-light">No notifications</div>
                    ) : (
                      notifications.slice(0, 5).map(n => (
                        <div
                          key={n.id}
                          className={`p-3 border-b border-[#f1ebe7] last:border-0 cursor-pointer hover:bg-[#faf8f6] transition ${!n.read ? 'bg-primary/5' : ''}`}
                          onClick={() => { markAsRead(n.id); setNotifOpen(false); navigate('/business/notifications'); }}
                        >
                          <div className="flex items-start gap-2">
                            <span className="text-sm mt-0.5">{n.type === 'order' ? '🛒' : n.type === 'approval' ? '✅' : n.type === 'warning' ? '⚠️' : '🔔'}</span>
                            <div className="flex-1 min-w-0">
                              <p className={`text-sm font-medium ${!n.read ? 'text-primary' : 'text-text'}`}>{n.title}</p>
                              <p className="text-xs text-text-light mt-0.5 line-clamp-1">{n.message}</p>
                              <p className="text-[10px] text-text-light mt-1">{new Date(n.createdAt).toLocaleTimeString('en-GH', { hour: '2-digit', minute: '2-digit' })}</p>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                  <div className="p-2 border-t border-[#f1ebe7]">
                    <button
                      onClick={() => { setNotifOpen(false); navigate('/business/notifications'); }}
                      className="w-full text-center text-sm text-primary font-medium py-1.5 hover:bg-[#f6f8f6] rounded-lg transition"
                    >
                      View all
                    </button>
                  </div>
                </div>
              )}
            </div>
            <div className="hidden sm:flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-[#ead9ce] text-[#6b3926] flex items-center justify-center text-xs font-bold">{initials}</div>
              <span className="text-sm font-medium max-w-32 truncate">{name}</span>
            </div>
          </div>
        </div>
      </header>
      <main className="p-4 sm:p-6 lg:p-8 max-w-[1440px]">{children}</main>
    </div>
    {mobileOpen && <div className="fixed inset-0 z-50 bg-[#2d211b]/40 lg:hidden" onClick={() => setMobileOpen(false)}><div className="w-72 h-full bg-white p-5 shadow-xl" onClick={(event) => event.stopPropagation()}><div className="flex items-center justify-between mb-7"><img src={logoImage} alt="NKAY" className="h-9 w-auto" /><button onClick={() => setMobileOpen(false)} aria-label="Close navigation"><X className="w-5 h-5" /></button></div>{nav}<div className="mt-8 pt-5 border-t border-[#f1ebe7]"><button onClick={signOut} className="flex items-center gap-2 px-3 py-2 text-sm text-[#806c61]"><LogOut className="w-4 h-4" />Logout</button></div></div></div>}
  </div>;
};

export const PageHeading = ({ eyebrow, title, description, action }: { eyebrow?: string; title: string; description?: string; action?: ReactNode }) => <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-7"><div><p className="text-xs uppercase tracking-[0.18em] text-[#9a7968] font-semibold mb-2">{eyebrow || 'NKAY Marketplace'}</p><h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#2d211b]">{title}</h1>{description && <p className="text-sm text-[#8b776b] mt-2">{description}</p>}</div>{action}</div>;

export const Currency = ({ value }: { value: number }) => <>GH₵ {value.toLocaleString('en-GH', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}</>;

export const StatusBadge = ({ status }: { status: string }) => { const normalized = status.toLowerCase().replace(/_/g, ' '); const tone = normalized === 'delivered' || normalized === 'active' ? 'bg-[#e6f4ea] text-[#23723a]' : normalized === 'cancelled' || normalized === 'out of stock' ? 'bg-[#fbe8e6] text-[#a23d35]' : normalized === 'processing' || normalized === 'confirmed' || normalized === 'shipped' ? 'bg-[#e9eff9] text-[#37669e]' : 'bg-[#fff1d9] text-[#996315]'; return <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${tone}`}>{normalized}</span>; };
