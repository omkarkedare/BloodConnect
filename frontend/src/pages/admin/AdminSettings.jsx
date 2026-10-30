import { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  User, 
  Mail, 
  Phone, 
  Lock, 
  Key, 
  Eye, 
  EyeOff, 
  Sliders, 
  LogOut, 
  CheckCircle2, 
  AlertTriangle, 
  Layers, 
  Building2,
  ShieldAlert,
  Server
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import authService from '../../services/authService';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Spinner from '../../components/ui/Spinner';
import Alert from '../../components/ui/Alert';
import Badge from '../../components/ui/Badge';
import { validateName, validatePhone } from '../../utils/validators';

const REFRESH_OPTIONS = [
  { value: '0', label: 'Manual Refresh Only' },
  { value: '30', label: 'Every 30 Seconds' },
  { value: '60', label: 'Every 60 Seconds (Recommended)' },
  { value: '120', label: 'Every 2 Minutes' },
  { value: '300', label: 'Every 5 Minutes' },
];

const TIMEFRAME_OPTIONS = [
  { value: 'all', label: 'All Time' },
  { value: '30d', label: 'Last 30 Days' },
  { value: '90d', label: 'Last 90 Days (Default)' },
  { value: 'year', label: 'Past 1 Year' },
];

const ALERT_STYLE_OPTIONS = [
  { value: 'prominent', label: 'Prominent Full-Width Banner (Default)' },
  { value: 'compact', label: 'Compact Clinical Warning Bar' },
];

const DENSITY_OPTIONS = [
  { value: 'comfortable', label: 'Comfortable Spacing' },
  { value: 'compact', label: 'Compact / High Density' },
];

export default function AdminSettings() {
  const { user: authUser, logout, loadUser } = useAuth();

  const [activeTab, setActiveTab] = useState('profile'); // 'profile' | 'security' | 'preferences' | 'governance'
  const [loading, setLoading] = useState(true);

  // Profile Form State
  const [profile, setProfile] = useState({
    id: null,
    full_name: '',
    phone: '',
    email: '',
    role: '',
    created_at: '',
  });
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState(null);
  const [profileError, setProfileError] = useState(null);

  // Password Form State
  const [passwords, setPasswords] = useState({
    current_password: '',
    new_password: '',
    confirm_password: '',
  });
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState(null);
  const [passwordError, setPasswordError] = useState(null);

  // Preferences State (Persisted in localStorage)
  const [preferences, setPreferences] = useState({
    refreshRate: localStorage.getItem('bloodconnect_admin_refresh_rate') || '60',
    alertBanner: localStorage.getItem('bloodconnect_admin_alert_banner') || 'prominent',
    defaultTimeframe: localStorage.getItem('bloodconnect_admin_default_timeframe') || '90d',
    tableDensity: localStorage.getItem('bloodconnect_admin_table_density') || 'comfortable',
  });
  const [preferencesSuccess, setPreferencesSuccess] = useState(null);

  useEffect(() => {
    fetchAdminProfile();
  }, []);

  const fetchAdminProfile = async () => {
    try {
      setLoading(true);
      const res = await authService.getCurrentUser();
      const userData = res.data || {};
      setProfile({
        id: userData.id,
        full_name: userData.full_name || '',
        phone: userData.phone || '',
        email: userData.email || '',
        role: userData.role || 'admin',
        created_at: userData.created_at || '',
      });
    } catch {
      setProfileError('Failed to load administrator account details.');
    } finally {
      setLoading(false);
    }
  };

  // Handle Profile Form Submission
  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setProfileError(null);
    setProfileSuccess(null);

    const nameError = validateName(profile.full_name, 'Full name');
    if (nameError) {
      setProfileError(nameError);
      return;
    }

    if (profile.phone) {
      const phoneError = validatePhone(profile.phone);
      if (phoneError) {
        setProfileError(phoneError);
        return;
      }
    }

    try {
      setSavingProfile(true);
      await authService.updateCurrentUser({
        full_name: profile.full_name.trim(),
        phone: profile.phone ? profile.phone.trim() : null,
      });

      setProfileSuccess('Administrator profile updated successfully.');
      if (loadUser) {
        await loadUser();
      }
    } catch (err) {
      setProfileError(err.response?.data?.detail || 'Failed to update administrator profile.');
    } finally {
      setSavingProfile(false);
    }
  };

  // Handle Password Change Form Submission
  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(null);

    if (!passwords.current_password) {
      setPasswordError('Please provide your current account password.');
      return;
    }

    if (!passwords.new_password || passwords.new_password.length < 8) {
      setPasswordError('New password must be at least 8 characters long.');
      return;
    }

    const newPasswordBytes = new TextEncoder().encode(passwords.new_password).length;
    if (newPasswordBytes > 72) {
      setPasswordError('New password cannot exceed 72 bytes due to bcrypt hashing limits.');
      return;
    }

    if (passwords.new_password === passwords.current_password) {
      setPasswordError('New password cannot be identical to your current password.');
      return;
    }

    if (passwords.new_password !== passwords.confirm_password) {
      setPasswordError('The new password and confirmation password do not match.');
      return;
    }

    try {
      setSavingPassword(true);
      await authService.changePassword({
        current_password: passwords.current_password,
        new_password: passwords.new_password,
      });

      setPasswordSuccess('Password updated successfully. For security, re-authentication is required. Redirecting to login...');
      setPasswords({
        current_password: '',
        new_password: '',
        confirm_password: '',
      });

      // Enforce safe re-authentication on password update
      setTimeout(() => {
        logout();
        window.location.href = '/login?message=password_changed';
      }, 1600);
    } catch (err) {
      setPasswordError(err.response?.data?.detail || 'Failed to change password. Please verify your current password.');
    } finally {
      setSavingPassword(false);
    }
  };

  // Handle Preferences Save
  const handlePreferencesSave = (e) => {
    e.preventDefault();
    localStorage.setItem('bloodconnect_admin_refresh_rate', preferences.refreshRate);
    localStorage.setItem('bloodconnect_admin_alert_banner', String(preferences.alertBanner));
    localStorage.setItem('bloodconnect_admin_default_timeframe', preferences.defaultTimeframe);
    localStorage.setItem('bloodconnect_admin_table_density', preferences.tableDensity);

    setPreferencesSuccess('Operational preferences saved successfully.');
    setTimeout(() => setPreferencesSuccess(null), 4000);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-3">
        <Spinner size="lg" />
        <p className="text-xs text-surface-500 font-medium">Loading administrative security settings...</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-surface-200">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-2xl font-bold text-surface-900 tracking-tight">Admin Settings & Security</h1>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-primary-100 text-primary-800 border border-primary-200">
              <ShieldCheck className="w-3.5 h-3.5 text-primary-600" />
              Central Platform Governance
            </span>
          </div>
          <p className="text-surface-500 text-xs sm:text-sm mt-1">
            Platform administrator profile, credential governance, session management, and dashboard operational preferences
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start md:self-auto">
          <Button
            variant="outline"
            size="sm"
            icon={LogOut}
            onClick={logout}
            className="text-xs text-rose-700 hover:bg-rose-50 border-rose-200"
          >
            Sign Out
          </Button>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-surface-200 pb-px overflow-x-auto">
        {[
          { id: 'profile', label: 'Administrator Profile', icon: User },
          { id: 'security', label: 'Credentials & Password', icon: Lock },
          { id: 'preferences', label: 'Operational Preferences', icon: Sliders },
          { id: 'governance', label: 'Role Architecture & Separation', icon: Layers },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 whitespace-nowrap transition-colors cursor-pointer ${
                isActive
                  ? 'border-primary-600 text-primary-700 bg-primary-50/40'
                  : 'border-transparent text-surface-600 hover:text-surface-900 hover:bg-surface-50'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* TAB 1: ADMINISTRATOR PROFILE */}
      {activeTab === 'profile' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Card className="p-6 bg-white border border-surface-200 shadow-2xs">
              <h2 className="text-base font-bold text-surface-900 mb-4 pb-2 border-b border-surface-100 flex items-center gap-2">
                <User className="w-5 h-5 text-primary-600" />
                Personal Profile Information
              </h2>

              {profileError && <Alert type="error" message={profileError} className="mb-4" />}
              {profileSuccess && <Alert type="success" message={profileSuccess} className="mb-4" />}

              <form onSubmit={handleProfileSubmit} className="space-y-5">
                <div>
                  <label className="block text-xs font-bold text-surface-700 mb-1 uppercase tracking-wider">
                    Login Email Address <span className="text-[11px] text-surface-400 font-normal lowercase">(read-only root identity)</span>
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-surface-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      value={profile.email}
                      disabled
                      className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-surface-200 bg-surface-50 text-surface-500 text-xs sm:text-sm font-medium cursor-not-allowed"
                    />
                  </div>
                  <p className="text-[11px] text-surface-400 mt-1">
                    Administrator email identities are immutable and tied to central authorization tokens.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-surface-700 mb-1 uppercase tracking-wider">
                    Administrator Full Name <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-surface-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={profile.full_name}
                      onChange={(e) => setProfile((p) => ({ ...p, full_name: e.target.value }))}
                      required
                      placeholder="e.g. Administrator"
                      className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-surface-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none text-xs sm:text-sm text-surface-900 transition-colors"
                    />
                  </div>
                  <p className="text-[11px] text-surface-400 mt-1">
                    Displays on system audit notices, reports, and administrative communications. Supports English, Hindi, and Marathi Unicode names.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-surface-700 mb-1 uppercase tracking-wider">
                    Contact Phone Number <span className="text-[11px] text-surface-400 font-normal lowercase">(optional emergency contact)</span>
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-surface-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="tel"
                      value={profile.phone}
                      onChange={(e) => setProfile((p) => ({ ...p, phone: e.target.value }))}
                      placeholder="e.g. +91 9876543210"
                      className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-surface-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none text-xs sm:text-sm text-surface-900 transition-colors"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-4 border-t border-surface-100">
                  <Button type="submit" isLoading={savingProfile} variant="primary" size="sm">
                    Save Profile Changes
                  </Button>
                </div>
              </form>
            </Card>
          </div>

          {/* Quick Account Security Info */}
          <div className="space-y-6">
            <Card className="p-5 bg-white border border-surface-200 shadow-2xs">
              <h3 className="text-sm font-bold text-surface-900 mb-2 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                Administrative Account Overview
              </h3>
              <p className="text-xs text-surface-500 leading-relaxed mb-4">
                This account holds platform-level governance authority over all blood requests, voluntary donations, and user accounts.
              </p>

              <div className="space-y-2.5 text-xs border-t border-surface-100 pt-3">
                <div className="flex items-center justify-between">
                  <span className="text-surface-500">System Role:</span>
                  <Badge variant="primary" className="text-[10px] font-bold uppercase">
                    Platform Admin
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-surface-500">Account ID:</span>
                  <span className="font-mono text-surface-800">#{profile.id || authUser?.id}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-surface-500">Account Created:</span>
                  <span className="text-surface-700 font-medium">
                    {profile.created_at ? new Date(profile.created_at).toLocaleDateString() : 'Active Node'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-surface-500">Authentication:</span>
                  <span className="text-emerald-700 font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    JWT Secure Bearer
                  </span>
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* TAB 2: CREDENTIALS & PASSWORD */}
      {activeTab === 'security' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Card className="p-6 bg-white border border-surface-200 shadow-2xs">
              <h2 className="text-base font-bold text-surface-900 mb-4 pb-2 border-b border-surface-100 flex items-center gap-2">
                <Lock className="w-5 h-5 text-primary-600" />
                Change Account Password
              </h2>

              {passwordError && <Alert type="error" message={passwordError} className="mb-4" />}
              {passwordSuccess && <Alert type="success" message={passwordSuccess} className="mb-4" />}

              <form onSubmit={handlePasswordSubmit} className="space-y-5">
                {/* Current Password */}
                <div>
                  <label className="block text-xs font-bold text-surface-700 mb-1 uppercase tracking-wider">
                    Current Password <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Key className="w-4 h-4 text-surface-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type={showCurrent ? 'text' : 'password'}
                      value={passwords.current_password}
                      onChange={(e) => setPasswords((p) => ({ ...p, current_password: e.target.value }))}
                      required
                      placeholder="Enter current password"
                      className="w-full pl-9 pr-10 py-2.5 rounded-lg border border-surface-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none text-xs sm:text-sm text-surface-900 transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrent(!showCurrent)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-400 hover:text-surface-600 cursor-pointer"
                    >
                      {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* New Password */}
                <div>
                  <label className="block text-xs font-bold text-surface-700 mb-1 uppercase tracking-wider">
                    New Password <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-surface-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type={showNew ? 'text' : 'password'}
                      value={passwords.new_password}
                      onChange={(e) => setPasswords((p) => ({ ...p, new_password: e.target.value }))}
                      required
                      placeholder="Enter new strong password"
                      className="w-full pl-9 pr-10 py-2.5 rounded-lg border border-surface-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none text-xs sm:text-sm text-surface-900 transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNew(!showNew)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-400 hover:text-surface-600 cursor-pointer"
                    >
                      {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <ul className="text-[11px] text-surface-500 mt-2 space-y-1">
                    <li className="flex items-center gap-1.5">
                      <span className={`w-1.5 h-1.5 rounded-full ${passwords.new_password.length >= 8 ? 'bg-emerald-500' : 'bg-surface-300'}`} />
                      Minimum 8 characters in length
                    </li>
                    <li className="flex items-center gap-1.5">
                      <span className={`w-1.5 h-1.5 rounded-full ${passwords.new_password && passwords.new_password !== passwords.current_password ? 'bg-emerald-500' : 'bg-surface-300'}`} />
                      Cannot be identical to current password
                    </li>
                  </ul>
                </div>

                {/* Confirm New Password */}
                <div>
                  <label className="block text-xs font-bold text-surface-700 mb-1 uppercase tracking-wider">
                    Confirm New Password <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-surface-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type={showConfirm ? 'text' : 'password'}
                      value={passwords.confirm_password}
                      onChange={(e) => setPasswords((p) => ({ ...p, confirm_password: e.target.value }))}
                      required
                      placeholder="Re-enter new password"
                      className="w-full pl-9 pr-10 py-2.5 rounded-lg border border-surface-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none text-xs sm:text-sm text-surface-900 transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm(!showConfirm)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-400 hover:text-surface-600 cursor-pointer"
                    >
                      {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="flex justify-end pt-4 border-t border-surface-100">
                  <Button type="submit" isLoading={savingPassword} variant="primary" size="sm">
                    Update Account Password
                  </Button>
                </div>
              </form>
            </Card>
          </div>

          {/* Password Security Rules */}
          <div className="space-y-6">
            <Card className="p-5 bg-white border border-surface-200 shadow-2xs">
              <h3 className="text-sm font-bold text-surface-900 mb-2 flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4 text-amber-600" />
                Credential Governance Policy
              </h3>
              <p className="text-xs text-surface-500 leading-relaxed mb-4">
                Administrative credentials protect sensitive clinical data and verified donation records.
              </p>

              <div className="space-y-3 text-xs text-surface-600 border-t border-surface-100 pt-3">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>Passwords are hashed with cryptographic salt via bcrypt before database storage.</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>Plaintext passwords are never logged, returned, or exposed in API payloads.</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>Changing your password immediately invalidates your active session and enforces safe re-authentication.</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>Bcrypt 72-byte limit is strictly enforced to prevent password truncation vulnerabilities.</span>
                </div>
              </div>

              {/* Stateless JWT Revocation Architecture Note (Task 3) */}
              <div className="mt-4 p-3 rounded-lg bg-surface-50 border border-surface-200 text-xs text-surface-600 space-y-1.5">
                <div className="font-bold text-surface-800 flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5 text-primary-600" />
                  Session Security & Revocation Note
                </div>
                <p className="leading-relaxed text-[11px]">
                  BloodConnect utilizes stateless HMAC-SHA256 JWT tokens with a 60-minute expiration window. Updating your password terminates your browser session immediately. Tokens issued to other devices expire automatically upon reaching their 60-minute expiration window unless a centralized Redis blocklist is integrated.
                </p>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* TAB 3: OPERATIONAL PREFERENCES */}
      {activeTab === 'preferences' && (
        <Card className="p-6 bg-white border border-surface-200 shadow-2xs">
          <h2 className="text-base font-bold text-surface-900 mb-4 pb-2 border-b border-surface-100 flex items-center gap-2">
            <Sliders className="w-5 h-5 text-primary-600" />
            Dashboard Operational Preferences
          </h2>
          <p className="text-xs text-surface-500 mb-6">
            Configure how operations data, real-time alert banners, and analytics are presented across your browser session.
          </p>

          {preferencesSuccess && <Alert type="success" message={preferencesSuccess} className="mb-6" />}

          <form onSubmit={handlePreferencesSave} className="space-y-6 max-w-2xl">
            {/* Auto-Refresh Rate */}
            <div>
              <label className="block text-xs font-bold text-surface-700 mb-1 uppercase tracking-wider">
                Operations Auto-Refresh Interval
              </label>
              <select
                value={preferences.refreshRate}
                onChange={(e) => setPreferences((p) => ({ ...p, refreshRate: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-surface-200 text-xs sm:text-sm bg-white text-surface-900 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
              >
                {REFRESH_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-surface-400 mt-1">
                Controls the background polling interval on the 24/7 Operations Dashboard. Automatically halts when logged out.
              </p>
            </div>

            {/* Emergency Alert Display Mode (Task 4: Essential warnings cannot be silenced) */}
            <div>
              <label className="block text-xs font-bold text-surface-700 mb-1 uppercase tracking-wider">
                Emergency Triage Alert Display Format
              </label>
              <select
                value={preferences.alertBanner}
                onChange={(e) => setPreferences((p) => ({ ...p, alertBanner: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-surface-200 text-xs sm:text-sm bg-white text-surface-900 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
              >
                {ALERT_STYLE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-amber-700 mt-1 font-medium flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                Clinical Safety Rule: Essential emergency warnings cannot be silenced while urgent blood requests are open.
              </p>
            </div>

            {/* Default Reports Timeframe */}
            <div>
              <label className="block text-xs font-bold text-surface-700 mb-1 uppercase tracking-wider">
                Default Reports Analytics Timeframe
              </label>
              <select
                value={preferences.defaultTimeframe}
                onChange={(e) => setPreferences((p) => ({ ...p, defaultTimeframe: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-surface-200 text-xs sm:text-sm bg-white text-surface-900 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
              >
                {TIMEFRAME_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-surface-400 mt-1">
                Default timeframe initially loaded when viewing System Reports & Analytics.
              </p>
            </div>

            {/* Table Row Density */}
            <div>
              <label className="block text-xs font-bold text-surface-700 mb-1 uppercase tracking-wider">
                Management Table Density
              </label>
              <select
                value={preferences.tableDensity}
                onChange={(e) => setPreferences((p) => ({ ...p, tableDensity: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-surface-200 text-xs sm:text-sm bg-white text-surface-900 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
              >
                {DENSITY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-surface-400 mt-1">
                Adjusts row padding on Manage Donations, Manage Requests, and Manage Donors tables.
              </p>
            </div>

            <div className="flex justify-end pt-4 border-t border-surface-100">
              <Button type="submit" variant="primary" size="sm">
                Save Operational Preferences
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* TAB 4: ROLE ARCHITECTURE & FUTURE SEPARATION (Task 8) */}
      {activeTab === 'governance' && (
        <div className="space-y-6">
          <Card className="p-6 bg-white border border-surface-200 shadow-2xs">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-primary-100 text-primary-700 flex items-center justify-center shrink-0">
                <Layers className="w-6 h-6" />
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-surface-900">
                    Platform Administrator vs. Blood Centre Operator Separation
                  </h2>
                  <Badge variant="primary" className="text-[10px] font-bold uppercase">
                    Phase-Ready Architecture
                  </Badge>
                </div>
                <p className="text-xs text-surface-600 leading-relaxed max-w-3xl">
                  BloodConnect maintains strict role separation to ensure security, compliance, and clinical integrity as the platform expands. The current system operates with centralized Platform Administration.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
              {/* Central Platform Admin Box */}
              <div className="p-4 rounded-xl border border-primary-200 bg-primary-50/40">
                <div className="flex items-center gap-2 mb-2">
                  <Server className="w-4 h-4 text-primary-600" />
                  <span className="text-xs font-bold uppercase tracking-wider text-primary-900">
                    Central Platform Administrator (Current)
                  </span>
                </div>
                <ul className="text-xs text-surface-600 space-y-1.5 list-disc pl-4">
                  <li>Global platform telemetry and analytics reporting</li>
                  <li>Voluntary blood donation audits and certificate verification</li>
                  <li>User account activation and security oversight</li>
                  <li>Cross-facility emergency request dispatch triage</li>
                  <li>Cryptographic certificate verification standards</li>
                </ul>
              </div>

              {/* Future Blood Centre Operator Box */}
              <div className="p-4 rounded-xl border border-surface-200 bg-surface-50/70">
                <div className="flex items-center gap-2 mb-2">
                  <Building2 className="w-4 h-4 text-surface-600" />
                  <span className="text-xs font-bold uppercase tracking-wider text-surface-700">
                    Blood Centre Operator (Upcoming Phase 9)
                  </span>
                </div>
                <ul className="text-xs text-surface-600 space-y-1.5 list-disc pl-4">
                  <li>Individual blood bank inventory units and cold-chain logging</li>
                  <li>Local walk-in donor intake and phlebotomy records</li>
                  <li>Hospital-specific blood product component allocation</li>
                  <li>Isolated facility-level operational dashboards</li>
                  <li>Zero access to platform-wide user authentication credentials</li>
                </ul>
              </div>
            </div>

            <div className="mt-6 p-3.5 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <span>
                <strong>Architectural Guarantee:</strong> Current administrative credentials and API tokens are restricted to Central Platform governance. Phase 9 Blood Centre roles will connect as segregated operator identities without modifying existing platform administrator security baselines.
              </span>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
