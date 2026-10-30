import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Droplets, 
  Award, 
  Calendar, 
  MapPin, 
  CheckCircle2, 
  XCircle, 
  ShieldCheck, 
  Phone, 
  Mail, 
  Settings, 
  Heart,
  Info
} from 'lucide-react';
import donorService from '../../services/donorService';
import authService from '../../services/authService';
import donationService from '../../services/donationService';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Spinner from '../../components/ui/Spinner';
import Alert from '../../components/ui/Alert';
import Badge from '../../components/ui/Badge';
import StatusBadge from '../../components/ui/StatusBadge';
import DonationCertificateModal from '../../components/donor/DonationCertificateModal';
import DonorAchievementsCard from '../../components/donor/DonorAchievementsCard';
import { BLOOD_GROUPS } from '../../utils/constants';

export default function DonorProfile() {
  const [activeTab, setActiveTab] = useState('profile'); // 'profile' | 'donations'
  const [userAccount, setUserAccount] = useState(null);
  const [profile, setProfile] = useState({
    blood_group: '',
    date_of_birth: '',
    gender: 'other',
    weight_kg: '',
    address: '',
    city: '',
    state: '',
    is_available: true,
    medical_conditions: '',
  });
  const [readiness, setReadiness] = useState(null);
  const [donations, setDonations] = useState([]);
  const [achievements, setAchievements] = useState(null);
  const [selectedDonationId, setSelectedDonationId] = useState(null);

  const [isNew, setIsNew] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch user account, donor profile, readiness, donation history, and achievements in parallel
      const [userRes, profileRes, readinessRes, donationsRes, achievementsRes] = await Promise.all([
        authService.getCurrentUser().catch(() => ({ data: null })),
        donorService.getProfile().catch(err => {
          if (err.response?.status === 404) return { data: null, is404: true };
          return { data: null };
        }),
        donorService.getReadiness().catch(() => ({ data: null })),
        donationService.getMyDonations().catch(() => ({ data: [] })),
        donorService.getAchievements().catch(() => ({ data: null })),
      ]);

      if (userRes.data) setUserAccount(userRes.data);
      if (readinessRes.data) setReadiness(readinessRes.data);
      if (donationsRes.data) setDonations(donationsRes.data);
      if (achievementsRes.data) setAchievements(achievementsRes.data);

      if (profileRes.is404 || !profileRes.data) {
        setIsNew(true);
      } else {
        const d = profileRes.data;
        setProfile({
          blood_group: d.blood_group || '',
          date_of_birth: d.date_of_birth || '',
          gender: d.gender || 'other',
          weight_kg: d.weight_kg != null ? String(d.weight_kg) : '',
          address: d.address || '',
          city: d.city || '',
          state: d.state || '',
          is_available: d.is_available ?? true,
          medical_conditions: d.medical_conditions || '',
        });
        setIsNew(false);
      }
    } catch {
      setError('Failed to load donor profile data.');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setProfile(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
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
        weight_kg: profile.weight_kg ? parseFloat(profile.weight_kg) : null,
      };

      if (isNew) {
        await donorService.createProfile(payload);
        setIsNew(false);
      } else {
        await donorService.updateProfile(payload);
      }

      // Refresh readiness stats
      const rRes = await donorService.getReadiness().catch(() => ({ data: null }));
      if (rRes.data) setReadiness(rRes.data);

      setSuccess('Donor medical and location profile saved successfully.');
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to save profile.');
    } finally {
      setSaving(false);
    }
  };

  const verifiedDonations = donations.filter(
    d => (d.status?.value || d.status || '').toLowerCase() === 'verified'
  );

  // Helper for checklist items
  const getFieldStatus = (fieldKey) => {
    if (!readiness) return false;
    if (!readiness.has_profile) return false;
    return !readiness.missing_fields?.includes(fieldKey);
  };

  const hasWeightError = readiness?.validation_errors?.some(e => e.toLowerCase().includes('weight'));
  const hasAgeError = readiness?.validation_errors?.some(e => e.toLowerCase().includes('18') || e.toLowerCase().includes('age'));

  const checklist = [
    { key: 'blood_group', label: 'Blood Group', valid: getFieldStatus('blood_group') },
    { key: 'date_of_birth', label: 'Age (18+)', valid: getFieldStatus('date_of_birth') && !hasAgeError },
    { key: 'gender', label: 'Gender', valid: getFieldStatus('gender') },
    { key: 'weight_kg', label: 'Weight (45+ kg)', valid: getFieldStatus('weight_kg') && !hasWeightError },
    { key: 'city', label: 'City Location', valid: getFieldStatus('city') },
  ];
  const completedFieldCount = checklist.filter(i => i.valid).length;
  const isProfileComplete = readiness?.is_complete;

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-surface-900">My Donor Profile</h1>
          <p className="text-surface-500 mt-1">Manage personal details, donation history, and official certificates</p>
        </div>
        <Link to="/donor/settings">
          <Button variant="outline" size="sm" icon={Settings}>
            Account Settings
          </Button>
        </Link>
      </div>

      {error && <Alert type="error" message={error} />}
      {success && <Alert type="success" message={success} />}
      {isNew && (
        <Alert
          type="info"
          message="Welcome to BloodConnect! Please complete your medical and location profile below so you can participate in blood donations."
        />
      )}

      {/* Identity & Completeness Overview Card */}
      <Card className="p-6 bg-gradient-to-br from-white via-surface-50/50 to-primary-50/20 border-surface-200">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          
          {/* User Details */}
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-2xl bg-primary-600 text-white flex items-center justify-center font-bold text-2xl shadow-sm shrink-0">
              {userAccount?.full_name?.charAt(0)?.toUpperCase() || 'D'}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl font-bold text-surface-900">{userAccount?.full_name || 'Valued Donor'}</h2>
                <Badge color="primary">Registered Donor</Badge>
                {profile.blood_group && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-800 border border-red-200">
                    <Droplets className="w-3 h-3 mr-1 text-red-600" />
                    {profile.blood_group}
                  </span>
                )}
                {profile.is_available ? (
                  <Badge color="success">Available</Badge>
                ) : (
                  <Badge color="warning">Unavailable</Badge>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs text-surface-500 mt-2">
                <span className="flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-surface-400" />
                  {userAccount?.email || 'N/A'}
                </span>
                {userAccount?.phone && (
                  <span className="flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-surface-400" />
                    {userAccount.phone}
                  </span>
                )}
                {profile.city && (
                  <span className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-surface-400" />
                    {profile.city}{profile.state ? `, ${profile.state}` : ''}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Quick Metrics Badges */}
          <div className="flex items-center gap-3 shrink-0 self-stretch sm:self-auto justify-between sm:justify-start pt-4 lg:pt-0 border-t lg:border-t-0 border-surface-200">
            <div className="bg-white px-4 py-3 rounded-xl border border-surface-200 text-center min-w-[100px] shadow-xs">
              <span className="text-xs text-surface-500 font-medium block">Total Donations</span>
              <span className="text-xl font-extrabold text-surface-900">{donations.length}</span>
            </div>
            <div className="bg-white px-4 py-3 rounded-xl border border-surface-200 text-center min-w-[100px] shadow-xs">
              <span className="text-xs text-emerald-700 font-medium block">Verified</span>
              <span className="text-xl font-extrabold text-emerald-600">{verifiedDonations.length}</span>
            </div>
            <div className="bg-white px-4 py-3 rounded-xl border border-surface-200 text-center min-w-[100px] shadow-xs">
              <span className="text-xs text-amber-700 font-medium block">Certificates</span>
              <span className="text-xl font-extrabold text-amber-600">{verifiedDonations.length}</span>
            </div>
            <div className="bg-white px-4 py-3 rounded-xl border border-surface-200 text-center min-w-[110px] shadow-xs">
              <span className="text-xs text-purple-700 font-medium block">Recognition</span>
              <span className="text-sm font-extrabold text-purple-900 block mt-0.5 truncate max-w-[110px]" title={achievements.highest_badge?.name || 'New Donor'}>
                {achievements.highest_badge ? achievements.highest_badge.name : 'New Donor'}
              </span>
            </div>
          </div>
        </div>

        {/* Profile Completeness Progress Bar */}
        <div className="mt-6 pt-5 border-t border-surface-200/80">
          <div className="flex items-center justify-between text-xs mb-2">
            <span className="font-semibold text-surface-700 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-primary-600" />
              Profile Information Completeness
            </span>
            <span className={`font-bold ${isProfileComplete ? 'text-emerald-600' : 'text-amber-600'}`}>
              {completedFieldCount} of {checklist.length} Fields Completed ({Math.round((completedFieldCount / checklist.length) * 100)}%)
            </span>
          </div>
          <div className="w-full h-2 rounded-full bg-surface-200 overflow-hidden">
            <div 
              className={`h-full transition-all duration-300 ${isProfileComplete ? 'bg-emerald-500' : 'bg-amber-500'}`}
              style={{ width: `${(completedFieldCount / checklist.length) * 100}%` }}
            />
          </div>

          <div className="flex flex-wrap gap-2 mt-3">
            {checklist.map(item => (
              <span
                key={item.key}
                className={`inline-flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-md font-medium border ${
                  item.valid 
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
                    : 'bg-surface-50 border-surface-200 text-surface-500'
                }`}
              >
                {item.valid ? (
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                ) : (
                  <XCircle className="w-3 h-3 text-surface-400" />
                )}
                {item.label}
              </span>
            ))}
          </div>

          <div className="mt-3.5 p-2.5 rounded-lg bg-surface-100/80 border border-surface-200 text-[11px] text-surface-600 flex items-center gap-2">
            <Info className="w-4 h-4 text-surface-400 shrink-0" />
            <span>
              <strong>Medical Disclaimer:</strong> Profile completeness indicates required registration fields are provided. Official medical eligibility and health suitability are verified by medical staff at the time of donation.
            </span>
          </div>
        </div>
      </Card>

      {/* Tabs Navigation */}
      <div className="border-b border-surface-200">
        <nav className="flex space-x-6">
          <button
            onClick={() => setActiveTab('profile')}
            className={`pb-3 text-sm font-semibold transition-colors cursor-pointer relative ${
              activeTab === 'profile'
                ? 'text-primary-600 border-b-2 border-primary-600'
                : 'text-surface-500 hover:text-surface-800'
            }`}
          >
            Medical & Location Profile
          </button>
          <button
            onClick={() => setActiveTab('donations')}
            className={`pb-3 text-sm font-semibold transition-colors cursor-pointer relative flex items-center gap-2 ${
              activeTab === 'donations'
                ? 'text-primary-600 border-b-2 border-primary-600'
                : 'text-surface-500 hover:text-surface-800'
            }`}
          >
            Donation History & Certificates
            {verifiedDonations.length > 0 && (
              <span className="px-2 py-0.5 rounded-full text-xs bg-emerald-100 text-emerald-700 font-bold">
                {verifiedDonations.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('achievements')}
            className={`pb-3 text-sm font-semibold transition-colors cursor-pointer relative flex items-center gap-2 ${
              activeTab === 'achievements'
                ? 'text-primary-600 border-b-2 border-primary-600'
                : 'text-surface-500 hover:text-surface-800'
            }`}
          >
            Badges & Achievements
            {achievements.earned_badges.length > 0 && (
              <span className="px-2 py-0.5 rounded-full text-xs bg-purple-100 text-purple-700 font-bold">
                {achievements.earned_badges.length}
              </span>
            )}
          </button>
        </nav>
      </div>

      {/* TAB 1: Medical & Location Profile Form */}
      {activeTab === 'profile' && (
        <Card className="p-6 sm:p-8 max-w-4xl">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              <div>
                <label className="block text-sm font-semibold text-surface-700 mb-1.5">
                  Blood Group <span className="text-red-500">*</span>
                </label>
                <select
                  name="blood_group"
                  value={profile.blood_group}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2.5 rounded-xl border border-surface-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none text-sm text-surface-900 bg-white"
                >
                  <option value="">Select Blood Group</option>
                  {BLOOD_GROUPS.map(bg => (
                    <option key={bg} value={bg}>{bg}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-surface-700 mb-1.5">
                  Date of Birth <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  name="date_of_birth"
                  value={profile.date_of_birth}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2.5 rounded-xl border border-surface-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none text-sm text-surface-900"
                />
                <span className="text-xs text-surface-400 mt-1 block">Must be at least 18 years old to donate</span>
              </div>

              <div>
                <label className="block text-sm font-semibold text-surface-700 mb-1.5">
                  Gender <span className="text-red-500">*</span>
                </label>
                <select
                  name="gender"
                  value={profile.gender}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2.5 rounded-xl border border-surface-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none text-sm text-surface-900 bg-white"
                >
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-surface-700 mb-1.5">
                  Weight (kg) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.1"
                  name="weight_kg"
                  value={profile.weight_kg}
                  onChange={handleChange}
                  placeholder="e.g. 65"
                  className="w-full px-4 py-2.5 rounded-xl border border-surface-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none text-sm text-surface-900"
                />
                <span className="text-xs text-surface-400 mt-1 block">Safe minimum weight is 45 kg</span>
              </div>

              <div>
                <label className="block text-sm font-semibold text-surface-700 mb-1.5">
                  City Location <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="city"
                  value={profile.city}
                  onChange={handleChange}
                  required
                  placeholder="e.g. Mumbai, Pune, Delhi"
                  className="w-full px-4 py-2.5 rounded-xl border border-surface-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none text-sm text-surface-900"
                />
                <span className="text-xs text-surface-400 mt-1 block">Used for nearby emergency donor discovery</span>
              </div>

              <div>
                <label className="block text-sm font-semibold text-surface-700 mb-1.5">
                  State / Region
                </label>
                <input
                  type="text"
                  name="state"
                  value={profile.state}
                  onChange={handleChange}
                  placeholder="e.g. Maharashtra"
                  className="w-full px-4 py-2.5 rounded-xl border border-surface-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none text-sm text-surface-900"
                />
              </div>

            </div>

            <div>
              <label className="block text-sm font-semibold text-surface-700 mb-1.5">
                Residential Address
              </label>
              <input
                type="text"
                name="address"
                value={profile.address}
                onChange={handleChange}
                placeholder="Street address or area details"
                className="w-full px-4 py-2.5 rounded-xl border border-surface-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none text-sm text-surface-900"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-surface-700 mb-1.5">
                Medical Conditions / Allergies / Notes
              </label>
              <textarea
                name="medical_conditions"
                value={profile.medical_conditions}
                onChange={handleChange}
                rows={3}
                placeholder="Mention any medications, chronic conditions, or allergies (optional)"
                className="w-full px-4 py-2.5 rounded-xl border border-surface-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none text-sm text-surface-900"
              />
            </div>

            <div className="p-4 bg-surface-50 rounded-xl border border-surface-200 flex items-center justify-between">
              <div>
                <span className="font-semibold text-surface-900 text-sm block">Active Availability</span>
                <span className="text-xs text-surface-500 block">
                  Allow your profile to appear in smart emergency finder searches
                </span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  name="is_available"
                  checked={profile.is_available}
                  onChange={handleChange}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-surface-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-surface-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
              </label>
            </div>

            <div className="flex justify-end pt-4 border-t border-surface-100">
              <Button type="submit" isLoading={saving} variant="primary">
                {isNew ? 'Create Donor Profile' : 'Save Profile Changes'}
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* TAB 2: Donation History & Certificates */}
      {activeTab === 'donations' && (
        <div className="space-y-6">
          {donations.length === 0 ? (
            <Card className="py-16 text-center">
              <Heart className="w-12 h-12 text-surface-300 mx-auto mb-3" />
              <h3 className="text-base font-bold text-surface-800">No Donations Recorded Yet</h3>
              <p className="text-xs text-surface-500 max-w-sm mx-auto mt-1 mb-5">
                Once you donate blood and the hospital verifies your contribution, your verified history and appreciation certificates will appear here.
              </p>
              <Link to="/donor/requests">
                <Button variant="primary" size="sm">
                  Browse Emergency Requests
                </Button>
              </Link>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {donations.map(donation => {
                const statusStr = (donation.status?.value || donation.status || '').toLowerCase();
                const isVerified = statusStr === 'verified';

                return (
                  <Card key={donation.id} className="flex flex-col p-5">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <Droplets className="w-4 h-4 text-red-600" />
                          <span className="font-bold text-surface-900 text-sm">
                            {donation.blood_group} Donation
                          </span>
                        </div>
                        <span className="text-xs text-surface-500">
                          {donation.units_donated || 1} Unit{(donation.units_donated || 1) > 1 ? 's' : ''}
                        </span>
                      </div>
                      <StatusBadge status={statusStr} />
                    </div>

                    <div className="space-y-2 mb-4 text-xs text-surface-600 flex-1">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-3.5 h-3.5 text-surface-400" />
                        <span>Date: {new Date(donation.donation_date).toLocaleDateString()}</span>
                      </div>
                      {donation.hospital_name && (
                        <div className="flex items-start gap-2">
                          <MapPin className="w-3.5 h-3.5 text-surface-400 mt-0.5" />
                          <span className="font-medium text-surface-700">{donation.hospital_name}</span>
                        </div>
                      )}
                    </div>

                    <div className="pt-3 border-t border-surface-100 flex items-center justify-between">
                      {isVerified ? (
                        <Button
                          variant="outline"
                          size="sm"
                          icon={Award}
                          onClick={() => setSelectedDonationId(donation.id)}
                          className="w-full text-red-700 border-red-200 hover:bg-red-50 text-xs"
                        >
                          View Certificate
                        </Button>
                      ) : (
                        <span className="text-[11px] text-surface-400 italic">
                          Certificate available upon verification
                        </span>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: Badges & Achievements */}
      {activeTab === 'achievements' && (
        <DonorAchievementsCard achievements={achievements} />
      )}

      {/* Certificate Modal */}
      <DonationCertificateModal
        donationId={selectedDonationId}
        isOpen={!!selectedDonationId}
        onClose={() => setSelectedDonationId(null)}
      />

    </div>
  );
}
