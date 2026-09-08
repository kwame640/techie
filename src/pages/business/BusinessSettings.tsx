import { Bell, CreditCard, LockKeyhole, Settings2, Store, UserRound } from 'lucide-react';
import { Link } from 'react-router-dom';
import { PageHeading, VendorLayout } from '../../components/VendorLayout';

const sections = [
  { label: 'Account', description: 'Name, email, and phone number', icon: UserRound, path: '/business/settings#account' },
  { label: 'Store Settings', description: 'Store name, category, and opening hours', icon: Store, path: '/business/settings#store' },
  { label: 'Notifications', description: 'Choose which updates you receive', icon: Bell, path: '/business/notifications' },
  { label: 'Payment Settings', description: 'Mobile Money and bank details', icon: CreditCard, path: '/business/settings#payments' },
  { label: 'Security', description: 'Password and account protection', icon: LockKeyhole, path: '/business/settings#security' },
];

export const BusinessSettings = () => (
  <VendorLayout title="Settings">
    <PageHeading title="Settings" description="Manage your account and store preferences." />
    <div className="max-w-3xl bg-white border border-[#eee5df] rounded-2xl overflow-hidden shadow-[0_4px_18px_rgba(74,43,28,0.04)]">
      {sections.map(({ label, description, icon: Icon }, index) => (
        <Link
          key={label}
          to={sections.find(s => s.label === label)!.path}
          className={`w-full flex items-center gap-4 p-5 text-left hover:bg-[#fcfaf9] transition ${index > 0 ? 'border-t border-[#f1ebe7]' : ''}`}
        >
          <div className="w-10 h-10 rounded-xl bg-[#f5ebe5] text-[#70402b] flex items-center justify-center">
            <Icon className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold">{label}</p>
            <p className="text-xs text-[#927f74] mt-1">{description}</p>
          </div>
          <Settings2 className="w-4 h-4 text-[#ad9b91]" />
        </Link>
      ))}
    </div>
  </VendorLayout>
);
