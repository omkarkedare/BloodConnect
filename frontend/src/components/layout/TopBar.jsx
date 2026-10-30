import { Link } from 'react-router-dom';
import { Menu, LogOut } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import NotificationsDropdown from './NotificationsDropdown';

export default function TopBar({ onMenuToggle }) {
  const { user, logout } = useAuth();

  const profileLink = user?.role === 'donor' 
    ? '/donor/profile' 
    : user?.role === 'requester' 
      ? '/requester/profile' 
      : '/admin/settings';

  return (
    <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-lg border-b border-surface-200">
      <div className="flex items-center justify-between h-16 px-4 sm:px-6">
        <div className="flex items-center gap-3">
          <button
            onClick={onMenuToggle}
            className="lg:hidden p-2 rounded-lg text-surface-600 hover:bg-surface-100 cursor-pointer"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-lg font-semibold text-surface-800">Welcome back, {user?.full_name?.split(' ')[0] || 'User'}!</h1>
            <p className="text-xs text-surface-500 capitalize">{user?.role || 'User'} Account</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <NotificationsDropdown />
          <Link 
            to={profileLink}
            title="View Profile & Settings"
            className="hidden sm:flex items-center gap-2 pl-3 border-l border-surface-200 hover:opacity-85 transition-opacity"
          >
            <div className="w-8 h-8 rounded-full bg-primary-50 text-primary-700 border border-primary-200 flex items-center justify-center font-bold text-xs shadow-xs">
              {user?.full_name?.charAt(0)?.toUpperCase() || 'U'}
            </div>
            <div className="hidden md:block text-left">
              <p className="text-sm font-medium text-surface-800 leading-tight">{user?.full_name || 'User'}</p>
              <p className="text-xs text-surface-400">{user?.email || ''}</p>
            </div>
          </Link>
          <button
            onClick={logout}
            className="p-2 rounded-lg text-surface-500 hover:bg-red-50 hover:text-red-600 transition-colors cursor-pointer"
            title="Logout"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>
    </header>
  );
}
