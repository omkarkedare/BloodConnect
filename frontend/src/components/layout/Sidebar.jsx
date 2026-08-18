import { Link, useLocation } from 'react-router-dom';
import { Heart, X } from 'lucide-react';
import {
  LayoutDashboard, User, FileText, Droplets, Settings,
  Users, ClipboardList, Activity, BarChart3, Search, PlusCircle,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

const menuConfig = {
  donor: [
    { to: '/donor/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/donor/profile', label: 'My Profile', icon: User },
    { to: '/donor/requests', label: 'Blood Requests', icon: FileText },
    { to: '/donor/donations', label: 'My Donations', icon: Droplets },
    { to: '/donor/settings', label: 'Settings', icon: Settings },
  ],
  requester: [
    { to: '/requester/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/requester/create-request', label: 'Create Request', icon: PlusCircle },
    { to: '/requester/donors', label: 'Search Donors', icon: Search },
    { to: '/requester/requests', label: 'My Requests', icon: ClipboardList },
    { to: '/requester/settings', label: 'Settings', icon: Settings },
  ],
  admin: [
    { to: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/admin/users', label: 'Users', icon: Users },
    { to: '/admin/donors', label: 'Donors', icon: Droplets },
    { to: '/admin/requests', label: 'Requests', icon: ClipboardList },
    { to: '/admin/donations', label: 'Donations', icon: Activity },
    { to: '/admin/reports', label: 'Reports', icon: BarChart3 },
    { to: '/admin/settings', label: 'Settings', icon: Settings },
  ],
};

export default function Sidebar({ isOpen, onClose }) {
  const { user } = useAuth();
  const location = useLocation();
  const links = menuConfig[user?.role] || [];

  return (
    <>
      {/* Overlay for mobile */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={onClose} />
      )}

      <aside
        className={`fixed top-0 left-0 h-full w-64 bg-white border-r border-surface-200 z-50 transform transition-transform duration-200 lg:translate-x-0 lg:static lg:z-auto ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Logo */}
        <div className="flex items-center justify-between h-16 px-5 border-b border-surface-100">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center">
              <Heart className="w-4 h-4 text-white fill-white" />
            </div>
            <span className="font-bold text-surface-900">BloodConnect</span>
          </Link>
          <button onClick={onClose} className="lg:hidden p-1 rounded-lg text-surface-400 hover:bg-surface-100 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Role label */}
        <div className="px-5 py-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-surface-400">
            {user?.role} Panel
          </span>
        </div>

        {/* Nav Links */}
        <nav className="px-3 space-y-1">
          {links.map(({ to, label, icon: Icon }) => {
            const active = location.pathname === to;
            return (
              <Link
                key={to}
                to={to}
                onClick={onClose}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  active
                    ? 'bg-primary-50 text-primary-700'
                    : 'text-surface-600 hover:bg-surface-50 hover:text-surface-900'
                }`}
              >
                <Icon className={`w-5 h-5 ${active ? 'text-primary-600' : 'text-surface-400'}`} />
                {label}
              </Link>
            );
          })}
        </nav>
      </aside>
    </>
  );
}
