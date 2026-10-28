import { useState, useEffect } from 'react';
import { User } from 'lucide-react';
import authService from '../../services/authService';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Spinner from '../../components/ui/Spinner';
import Alert from '../../components/ui/Alert';
import { validateName } from '../../utils/validators';

export default function RequesterSettings() {
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
      const res = await authService.getCurrentUser();
      setProfile({
        full_name: res.data.full_name || '',
        phone: res.data.phone || '',
        email: res.data.email || ''
      });
    } catch (err) {
      setError('Failed to load profile.');
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
        phone: profile.phone
      });
      setSuccess('Profile updated successfully.');
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex justify-center py-12"><Spinner /></div>;

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-surface-900">My Profile</h1>
        <p className="text-surface-500 mt-1">Manage your account settings</p>
      </div>

      {error && <Alert type="error" message={error} className="mb-6" />}
      {success && <Alert type="success" message={success} className="mb-6" />}

      <Card className="p-6 max-w-2xl">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-surface-700 mb-1">Email Address (Read-only)</label>
            <input
              type="email"
              value={profile.email}
              disabled
              className="w-full px-4 py-2 rounded-lg border border-surface-200 bg-surface-50 text-surface-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-surface-700 mb-1">Full Name</label>
            <input
              type="text"
              name="full_name"
              value={profile.full_name}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 rounded-lg border border-surface-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition-colors"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-surface-700 mb-1">Phone Number</label>
            <input
              type="tel"
              name="phone"
              value={profile.phone}
              onChange={handleChange}
              className="w-full px-4 py-2 rounded-lg border border-surface-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition-colors"
            />
          </div>

          <div className="flex justify-end pt-4 border-t border-surface-200">
            <Button type="submit" isLoading={saving}>
              Save Changes
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
