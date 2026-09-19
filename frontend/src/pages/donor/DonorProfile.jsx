import { useState, useEffect } from 'react';
import { User } from 'lucide-react';
import donorService from '../../services/donorService';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Spinner from '../../components/ui/Spinner';
import Alert from '../../components/ui/Alert';
import { BLOOD_GROUPS } from '../../utils/constants';

export default function DonorProfile() {
  const [profile, setProfile] = useState({
    blood_group: '',
    date_of_birth: '',
    gender: 'other',
    weight_kg: '',
    address: '',
    city: '',
    state: '',
    is_available: true,
    medical_conditions: ''
  });
  const [isNew, setIsNew] = useState(false);
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
      const res = await donorService.getProfile();
      setProfile({
        blood_group: res.data.blood_group || '',
        date_of_birth: res.data.date_of_birth || '',
        gender: res.data.gender || 'other',
        weight_kg: res.data.weight_kg || '',
        address: res.data.address || '',
        city: res.data.city || '',
        state: res.data.state || '',
        is_available: res.data.is_available,
        medical_conditions: res.data.medical_conditions || ''
      });
      setIsNew(false);
    } catch (err) {
      if (err.response?.status === 404) {
        setIsNew(true);
      } else {
        setError('Failed to load profile.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setProfile(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      const payload = {
        ...profile,
        weight_kg: profile.weight_kg ? parseFloat(profile.weight_kg) : null
      };

      if (isNew) {
        await donorService.createProfile(payload);
        setIsNew(false);
      } else {
        await donorService.updateProfile(payload);
      }
      setSuccess('Profile saved successfully.');
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to save profile.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex justify-center py-12"><Spinner /></div>;

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-surface-900">My Donor Profile</h1>
        <p className="text-surface-500 mt-1">Manage your donor information and availability</p>
      </div>

      {error && <Alert type="error" message={error} className="mb-6" />}
      {success && <Alert type="success" message={success} className="mb-6" />}
      {isNew && <Alert type="info" message="Please complete your donor profile to start donating." className="mb-6" />}

      <Card className="p-6 max-w-3xl">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-surface-700 mb-1">Blood Group</label>
              <select
                name="blood_group"
                value={profile.blood_group}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 rounded-lg border border-surface-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
              >
                <option value="">Select Blood Group</option>
                {BLOOD_GROUPS.map(bg => (
                  <option key={bg} value={bg}>{bg}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-surface-700 mb-1">Date of Birth</label>
              <input
                type="date"
                name="date_of_birth"
                value={profile.date_of_birth}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 rounded-lg border border-surface-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-surface-700 mb-1">Gender</label>
              <select
                name="gender"
                value={profile.gender}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 rounded-lg border border-surface-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
              >
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-surface-700 mb-1">Weight (kg)</label>
              <input
                type="number"
                step="0.1"
                name="weight_kg"
                value={profile.weight_kg}
                onChange={handleChange}
                className="w-full px-4 py-2 rounded-lg border border-surface-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-surface-700 mb-1">City</label>
              <input
                type="text"
                name="city"
                value={profile.city}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 rounded-lg border border-surface-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-surface-700 mb-1">State</label>
              <input
                type="text"
                name="state"
                value={profile.state}
                onChange={handleChange}
                className="w-full px-4 py-2 rounded-lg border border-surface-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-surface-700 mb-1">Address</label>
            <input
              type="text"
              name="address"
              value={profile.address}
              onChange={handleChange}
              className="w-full px-4 py-2 rounded-lg border border-surface-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-surface-700 mb-1">Medical Conditions / Notes</label>
            <textarea
              name="medical_conditions"
              value={profile.medical_conditions}
              onChange={handleChange}
              rows={3}
              className="w-full px-4 py-2 rounded-lg border border-surface-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
            />
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="is_available"
              name="is_available"
              checked={profile.is_available}
              onChange={handleChange}
              className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-surface-300 rounded"
            />
            <label htmlFor="is_available" className="ml-2 block text-sm text-surface-900">
              I am currently available to donate blood
            </label>
          </div>

          <div className="flex justify-end pt-4 border-t border-surface-200">
            <Button type="submit" isLoading={saving}>
              {isNew ? 'Create Profile' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
