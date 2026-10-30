import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { User, Phone, Mail, Shield, CheckCircle2 } from 'lucide-react';
import authService from '../../services/authService';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Spinner from '../../components/ui/Spinner';
import Alert from '../../components/ui/Alert';
import { validateName } from '../../utils/validators';

export default function DonorSettings() {
  const [profile, setProfile] = useState({ full_name: '', phone: '', email: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await authService.getCurrentUser();
      setProfile({
        full_name: res.data.full_name || '',
        phone: res.data.phone || '',
        email: res.data.email || '',
      });
    } catch {
      setError('Failed to load account settings.');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setProfile(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const nameError = validateName(profile.full_name, 'Full name');
    if (nameError) {
      setError(nameError);
      return;
    }

    try {
      setSaving(true);
      await authService.updateCurrentUser({
        full_name: profile.full_name.trim(),
        phone: profile.phone ? profile.phone.trim() : null,
      });
      setSuccess('Account settings updated successfully.');
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to update account settings.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="max-w-4xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-surface-900">Account Settings</h1>
        <p className="text-surface-500 mt-1">Manage your login information and personal contact details</p>
      </div>

      {error && <Alert type="error" message={error} className="mb-6" />}
      {success && <Alert type="success" message={success} className="mb-6" />}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Card */}
        <div className="lg:col-span-2">
          <Card className="p-6">
            <h2 className="text-base font-bold text-surface-900 mb-4 pb-2 border-b border-surface-100 flex items-center gap-2">
              <User className="w-5 h-5 text-primary-600" />
              Personal Information
            </h2>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-surface-700 mb-1">
                  Email Address <span className="text-xs text-surface-400 font-normal">(Account Login / Read-only)</span>
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-surface-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    value={profile.email}
                    disabled
                    className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-surface-200 bg-surface-50 text-surface-500 text-sm cursor-not-allowed"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-surface-700 mb-1">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-surface-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    name="full_name"
                    value={profile.full_name}
                    onChange={handleChange}
                    required
                    placeholder="Enter full name"
                    className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-surface-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none text-sm text-surface-900 transition-colors"
                  />
                </div>
                <p className="text-xs text-surface-400 mt-1">
                  Supports English, Hindi, and Marathi names as registered on certificates.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-surface-700 mb-1">
                  Contact Phone Number
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-surface-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="tel"
                    name="phone"
                    value={profile.phone}
                    onChange={handleChange}
                    placeholder="e.g. +91 9876543210"
                    className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-surface-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none text-sm text-surface-900 transition-colors"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-4 border-t border-surface-100">
                <Button type="submit" isLoading={saving} variant="primary">
                  Save Changes
                </Button>
              </div>
            </form>
          </Card>
        </div>

        {/* Quick Links & Info */}
        <div className="space-y-6">
          <Card className="p-5">
            <h3 className="text-sm font-bold text-surface-900 mb-2 flex items-center gap-1.5">
              <Shield className="w-4 h-4 text-emerald-600" />
              Donor Account Security
            </h3>
            <p className="text-xs text-surface-500 leading-relaxed mb-4">
              Your personal contact details are kept private and are only used for emergency blood donor notifications.
            </p>
            <div className="pt-3 border-t border-surface-100 flex flex-col gap-2">
              <Link
                to="/donor/profile"
                className="inline-flex items-center gap-2 text-xs font-semibold text-primary-600 hover:text-primary-700 transition-colors"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                Manage Medical & Location Profile
              </Link>
              <Link
                to="/donor/donations"
                className="inline-flex items-center gap-2 text-xs font-semibold text-surface-600 hover:text-surface-900 transition-colors"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                View Donation History & Certificates
              </Link>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
