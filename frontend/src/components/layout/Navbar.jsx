import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Heart, Menu, X, LogIn, UserPlus } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import Button from '../ui/Button';

const publicLinks = [
  { to: '/', label: 'Home' },
  { to: '/about', label: 'About' },
  { to: '/how-it-works', label: 'How It Works' },
  { to: '/blood-groups', label: 'Blood Groups' },
  { to: '/contact', label: 'Contact' },
];

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { isAuthenticated, user, logout } = useAuth();
  const location = useLocation();

  const getDashboardPath = () => {
    if (!user) return '/';
    const roleRoutes = { donor: '/donor/dashboard', requester: '/requester/dashboard', admin: '/admin/dashboard' };
    return roleRoutes[user.role] || '/';
  };

  return (
    <nav className="sticky top-0 z-40 bg-surface-50/95 backdrop-blur-lg border-b border-surface-200 pt-4 pb-0 md:pb-4 transition-all w-full">
      <div className="global-container">
        
        {/* TOP ROW: Branding and Auth Actions */}
        <div className="flex items-center justify-between pb-4 md:pb-0">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-primary-600 flex items-center justify-center shadow-sm group-hover:bg-primary-700 transition-colors">
              <Heart className="w-6 h-6 text-white fill-white" />
            </div>
            <span className="text-xl font-extrabold text-surface-900 tracking-tight">BloodConnect</span>
          </Link>

          {/* Desktop Auth Buttons */}
          <div className="hidden md:flex items-center gap-3">
            {isAuthenticated ? (
              <>
                <Link to={getDashboardPath()}>
                  <Button variant="outline" size="md" className="bg-white">Dashboard</Button>
                </Link>
                <Button variant="ghost" size="md" onClick={logout}>
                  Logout
                </Button>
              </>
            ) : (
              <>
                <Link to="/login">
                  <Button variant="ghost" size="md" icon={LogIn}>Login</Button>
                </Link>
                <Link to="/register">
                  <Button variant="primary" size="md" icon={UserPlus}>Register</Button>
                </Link>
              </>
            )}
          </div>

          {/* Mobile menu button */}
          <button
            className="md:hidden p-2 rounded-xl text-surface-600 hover:bg-surface-200 hover:text-surface-900 cursor-pointer transition-colors"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* BOTTOM ROW: Separated Navigation Container (Desktop) */}
        <div className="hidden md:flex justify-center mt-5 mb-1">
          <div className="flex items-center gap-1.5 p-1.5 bg-white border border-surface-200 rounded-2xl shadow-sm">
            {publicLinks.map(({ to, label }) => {
              const isActive = location.pathname === to;
              return (
                <Link
                  key={to}
                  to={to}
                  className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
                    isActive
                      ? 'bg-primary-50 text-primary-700'
                      : 'text-surface-600 hover:text-surface-900 hover:bg-surface-50'
                  }`}
                >
                  {label}
                </Link>
              );
            })}
          </div>
        </div>

      </div>

      {/* Mobile Nav (Dropdown) */}
      {mobileOpen && (
        <div className="md:hidden absolute top-full left-0 right-0 border-b border-surface-200 bg-white px-4 py-4 space-y-1 shadow-lg animate-in slide-in-from-top-2">
          {publicLinks.map(({ to, label }) => {
            const isActive = location.pathname === to;
            return (
              <Link
                key={to}
                to={to}
                onClick={() => setMobileOpen(false)}
                className={`block px-4 py-3 rounded-xl text-base font-semibold transition-colors ${
                  isActive
                    ? 'text-primary-700 bg-primary-50'
                    : 'text-surface-600 hover:bg-surface-50 hover:text-surface-900'
                }`}
              >
                {label}
              </Link>
            );
          })}
          <div className="pt-4 mt-2 border-t border-surface-100 flex flex-col gap-3">
            {isAuthenticated ? (
              <>
                <Link to={getDashboardPath()} onClick={() => setMobileOpen(false)}>
                  <Button variant="outline" size="md" className="w-full justify-center">Dashboard</Button>
                </Link>
                <Button variant="ghost" size="md" className="w-full justify-center" onClick={() => { logout(); setMobileOpen(false); }}>Logout</Button>
              </>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <Link to="/login" onClick={() => setMobileOpen(false)}>
                  <Button variant="outline" size="md" className="w-full justify-center" icon={LogIn}>Login</Button>
                </Link>
                <Link to="/register" onClick={() => setMobileOpen(false)}>
                  <Button variant="primary" size="md" className="w-full justify-center" icon={UserPlus}>Register</Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
