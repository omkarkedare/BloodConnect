import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  User, 
  Phone, 
  Mail, 
  ClipboardList, 
  Clock, 
  PlusCircle, 
  Calendar,
  MapPin,
  Activity,
  ArrowRight
} from 'lucide-react';
import authService from '../../services/authService';
import requestService from '../../services/requestService';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Spinner from '../../components/ui/Spinner';
import Alert from '../../components/ui/Alert';
import Badge from '../../components/ui/Badge';
import StatusBadge from '../../components/ui/StatusBadge';
import { validateName } from '../../utils/validators';

export default function RequesterSettings() {
  const [activeTab, setActiveTab] = useState('profile'); // 'profile' | 'requests'
  const [profile, setProfile] = useState({ full_name: '', phone: '', email: '', id: null, created_at: '' });
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch user profile and their requests in parallel
      const [userRes, reqRes] = await Promise.all([
        authService.getCurrentUser(),
        requestService.getRequests().catch(() => ({ data: [] }))
      ]);

      const userData = userRes.data || {};
      setProfile({
        id: userData.id,
        full_name: userData.full_name || '',
        phone: userData.phone || '',
        email: userData.email || '',
        created_at: userData.created_at || '',
      });

      // Filter only requests belonging to this requester
      const allRequests = reqRes.data || [];
      const myReqs = allRequests.filter(r => r.requester_id === userData.id);
      setRequests(myReqs);

    } catch {
      setError('Failed to load requester profile data.');
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
      setSuccess('Personal information updated successfully.');
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to update personal information.');
    } finally {
      setSaving(false);
    }
  };

  // Metrics calculations (separating fulfilled requests and verified donations)
  const totalRequestsCount = requests.length;
  const openRequestsCount = requests.filter(r => (r.status || '').toLowerCase() === 'open').length;
  const fulfilledRequestsCount = requests.filter(r => (r.status || '').toLowerCase() === 'fulfilled').length;
  const verifiedDonationsCount = requests.filter(r => (r.display_status || '').toUpperCase() === 'VERIFIED').length;
  const verifiedUnitsReceived = requests.reduce((sum, r) => sum + (r.verified_units || 0), 0);

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
          <h1 className="text-2xl font-bold text-surface-900">Requester Profile & Settings</h1>
          <p className="text-surface-500 mt-1">Manage contact info, view blood request history, and track verified donations</p>
        </div>
        <Link to="/requester/create-request">
          <Button variant="primary" size="sm" icon={PlusCircle}>
            Create Blood Request
          </Button>
        </Link>
      </div>

      {error && <Alert type="error" message={error} />}
      {success && <Alert type="success" message={success} />}

      {/* Identity & Metrics Overview Card */}
      <Card className="p-6 bg-gradient-to-br from-white via-surface-50/50 to-primary-50/20 border-surface-200">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          
          {/* User Details */}
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-2xl bg-primary-600 text-white flex items-center justify-center font-bold text-2xl shadow-sm shrink-0">
              {profile.full_name?.charAt(0)?.toUpperCase() || 'R'}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl font-bold text-surface-900">{profile.full_name || 'Requester'}</h2>
                <Badge color="secondary">Blood Requester</Badge>
                {openRequestsCount > 0 && (
                  <Badge color="warning">{openRequestsCount} Active Request{openRequestsCount > 1 ? 's' : ''}</Badge>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs text-surface-500 mt-2">
                <span className="flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-surface-400" />
                  {profile.email || 'N/A'}
                </span>
                {profile.phone && (
                  <span className="flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-surface-400" />
                    {profile.phone}
                  </span>
                )}
                {profile.created_at && (
                  <span className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-surface-400" />
                    Member since {new Date(profile.created_at).toLocaleDateString()}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Quick Stats Grid (Fulfilled Requests and Verified Donations cleanly separated) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 shrink-0 pt-4 lg:pt-0 border-t lg:border-t-0 border-surface-200">
            <div className="bg-white px-3.5 py-2.5 rounded-xl border border-surface-200 text-center shadow-xs">
              <span className="text-[11px] text-surface-500 font-medium block">Total Requests</span>
              <span className="text-lg font-bold text-surface-900">{totalRequestsCount}</span>
            </div>
            <div className="bg-white px-3.5 py-2.5 rounded-xl border border-surface-200 text-center shadow-xs">
              <span className="text-[11px] text-amber-700 font-medium block">Active Open</span>
              <span className="text-lg font-bold text-amber-600">{openRequestsCount}</span>
            </div>
            <div className="bg-white px-3.5 py-2.5 rounded-xl border border-surface-200 text-center shadow-xs">
              <span className="text-[11px] text-purple-700 font-medium block">Fulfilled</span>
              <span className="text-lg font-bold text-purple-700">{fulfilledRequestsCount}</span>
            </div>
            <div className="bg-white px-3.5 py-2.5 rounded-xl border border-surface-200 text-center shadow-xs">
              <span className="text-[11px] text-emerald-700 font-medium block">Verified ({verifiedUnitsReceived}u)</span>
              <span className="text-lg font-bold text-emerald-600">{verifiedDonationsCount}</span>
            </div>
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
            Personal Information & Settings
          </button>
          <button
            onClick={() => setActiveTab('requests')}
            className={`pb-3 text-sm font-semibold transition-colors cursor-pointer relative flex items-center gap-2 ${
              activeTab === 'requests'
                ? 'text-primary-600 border-b-2 border-primary-600'
                : 'text-surface-500 hover:text-surface-800'
            }`}
          >
            Request History & Fulfilled Donations
            {totalRequestsCount > 0 && (
              <span className="px-2 py-0.5 rounded-full text-xs bg-surface-100 text-surface-700 font-bold">
                {totalRequestsCount}
              </span>
            )}
          </button>
        </nav>
      </div>

      {/* TAB 1: Personal Details & Contact Form */}
      {activeTab === 'profile' && (
        <Card className="p-6 sm:p-8 max-w-3xl">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-surface-700 mb-1.5">
                Email Address <span className="text-xs text-surface-400 font-normal">(Login identifier / Read-only)</span>
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-surface-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  value={profile.email}
                  disabled
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-surface-200 bg-surface-50 text-surface-500 text-sm cursor-not-allowed"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-surface-700 mb-1.5">
                Full Name <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-surface-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  name="full_name"
                  value={profile.full_name}
                  onChange={handleChange}
                  required
                  placeholder="Enter full name"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-surface-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none text-sm text-surface-900 transition-colors"
                />
              </div>
              <p className="text-xs text-surface-400 mt-1">
                Supports English, Hindi, and Marathi names as registered with medical staff.
              </p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-surface-700 mb-1.5">
                Contact Phone Number
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-surface-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="tel"
                  name="phone"
                  value={profile.phone}
                  onChange={handleChange}
                  placeholder="e.g. +91 9876543210"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-surface-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none text-sm text-surface-900 transition-colors"
                />
              </div>
              <p className="text-xs text-surface-400 mt-1">
                Used to coordinate blood donation handoffs with matching donors and hospitals.
              </p>
            </div>

            <div className="flex justify-end pt-4 border-t border-surface-100">
              <Button type="submit" isLoading={saving} variant="primary">
                Save Changes
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* TAB 2: Request History & Fulfilled Status */}
      {activeTab === 'requests' && (
        <div className="space-y-6">
          {requests.length === 0 ? (
            <Card className="py-16 text-center">
              <ClipboardList className="w-12 h-12 text-surface-300 mx-auto mb-3" />
              <h3 className="text-base font-bold text-surface-800">No Blood Requests Created Yet</h3>
              <p className="text-xs text-surface-500 max-w-sm mx-auto mt-1 mb-5">
                Create a blood request to discover nearby eligible donors and manage donor responses.
              </p>
              <Link to="/requester/create-request">
                <Button variant="primary" size="sm" icon={PlusCircle}>
                  Create First Request
                </Button>
              </Link>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {requests.map(request => (
                <Card key={request.id} className="flex flex-col p-5">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="font-bold text-surface-900 text-sm">{request.patient_name}</h3>
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-red-100 text-red-800">
                          {request.blood_group}
                        </span>
                        <span className="text-xs text-surface-500">
                          {request.units_needed} Unit{request.units_needed > 1 ? 's' : ''} Needed
                        </span>
                      </div>
                    </div>
                    <StatusBadge status={(request.display_status || request.status).toLowerCase()} />
                  </div>

                  <div className="space-y-2 mb-4 text-xs text-surface-600 flex-1">
                    <div className="flex items-center gap-2">
                      <Activity className="w-3.5 h-3.5 text-surface-400" />
                      <span className="capitalize font-medium text-surface-700">Urgency: {request.urgency}</span>
                    </div>

                    <div className="flex items-start gap-2">
                      <MapPin className="w-3.5 h-3.5 text-surface-400 mt-0.5" />
                      <span className="font-medium text-surface-700 line-clamp-1">
                        {request.hospital_name}, {request.city}
                      </span>
                    </div>

                    {request.expires_at ? (
                      <div className="flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5 text-surface-400" />
                        <span>Needed by: {new Date(request.expires_at).toLocaleString()}</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Calendar className="w-3.5 h-3.5 text-surface-400" />
                        <span>Needed by: {new Date(request.required_date).toLocaleDateString()}</span>
                      </div>
                    )}
                  </div>

                  <div className="pt-3 border-t border-surface-100 mt-auto">
                    <Link
                      to={`/requester/requests/${request.id}`}
                      className="text-xs font-semibold text-primary-600 hover:text-primary-700 flex items-center justify-center gap-1 w-full"
                    >
                      View Details & Responses
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

    </div>
  );
}
