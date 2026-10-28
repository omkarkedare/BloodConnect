import { useState, useEffect } from 'react';
import { Heart, FileText, Droplets, Clock, Activity, CheckCircle2, AlertCircle, XCircle, ArrowRight, UserCheck, ShieldAlert } from 'lucide-react';
import { Link } from 'react-router-dom';
import StatCard from '../../components/ui/StatCard';
import Card from '../../components/ui/Card';
import Spinner from '../../components/ui/Spinner';
import Alert from '../../components/ui/Alert';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';

import donorService from '../../services/donorService';
import requestService from '../../services/requestService';
import responseService from '../../services/responseService';
import donationService from '../../services/donationService';

export default function DonorDashboard() {
  const [stats, setStats] = useState({
    totalDonations: 0,
    pendingResponses: 0,
    activeRequests: 0,
    lastDonation: 'N/A'
  });
  const [readiness, setReadiness] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch all data in parallel
      const [profileRes, readinessRes, requestsRes, responsesRes, donationsRes] = await Promise.all([
        donorService.getProfile().catch(() => ({ data: {} })),
        donorService.getReadiness().catch(() => ({ data: null })),
        requestService.getRequests({ status: 'open' }).catch(() => ({ data: [] })),
        responseService.getMyResponses().catch(() => ({ data: [] })),
        donationService.getMyDonations().catch(() => ({ data: [] }))
      ]);

      const profile = profileRes.data || {};
      const requests = requestsRes.data || [];
      const responses = responsesRes.data || [];
      const donations = donationsRes.data || [];

      setReadiness(readinessRes.data || null);

      const pending = responses.filter(r => r.status === 'pending').length;
      const lastDonationStr = profile.last_donation_date 
        ? new Date(profile.last_donation_date).toLocaleDateString()
        : 'N/A';

      setStats({
        totalDonations: donations.length,
        pendingResponses: pending,
        activeRequests: requests.length,
        lastDonation: lastDonationStr
      });

    } catch (err) {
      setError('Failed to load dashboard data. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  // Helper for checklist items
  const getFieldStatus = (fieldKey) => {
    if (!readiness) return false;
    if (!readiness.has_profile) return false;
    return !readiness.missing_fields?.includes(fieldKey);
  };

  const hasWeightError = readiness?.validation_errors?.some(e => e.toLowerCase().includes('weight'));
  const hasAgeError = readiness?.validation_errors?.some(e => e.toLowerCase().includes('18') || e.toLowerCase().includes('age'));

  const checklist = [
    {
      key: 'blood_group',
      label: 'Blood Group',
      desc: 'Medically identified blood type',
      valid: getFieldStatus('blood_group'),
      value: readiness?.blood_group
    },
    {
      key: 'date_of_birth',
      label: 'Age (18+ years)',
      desc: 'Must be at least 18 years old to donate',
      valid: getFieldStatus('date_of_birth') && !hasAgeError
    },
    {
      key: 'gender',
      label: 'Gender',
      desc: 'Specified gender identity',
      valid: getFieldStatus('gender')
    },
    {
      key: 'weight_kg',
      label: 'Weight (45+ kg)',
      desc: 'Safe minimum body weight for donation',
      valid: getFieldStatus('weight_kg') && !hasWeightError,
      value: readiness?.weight_kg ? `${readiness.weight_kg} kg` : null
    },
    {
      key: 'city',
      label: 'City / Location',
      desc: 'Required for emergency matching',
      valid: getFieldStatus('city'),
      value: readiness?.city
    }
  ];

  const completedCount = checklist.filter(i => i.valid).length;
  const isProfileComplete = readiness?.is_complete;
  const isAvailable = readiness?.is_available;
  const canRespond = readiness?.can_respond;

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-surface-900">Donor Dashboard</h1>
        <p className="text-surface-500 mt-1">Overview of your donor activity and response readiness</p>
      </div>

      {error && <Alert type="error" message={error} className="mb-6" />}

      {loading ? (
        <div className="flex justify-center py-12">
          <Spinner />
        </div>
      ) : (
        <>
          {/* Readiness & Profile Completion Gate Banner */}
          {!isProfileComplete ? (
            <Card className="mb-8 border-amber-300 bg-amber-50/60 p-6">
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center shrink-0 mt-0.5">
                    <AlertCircle className="w-6 h-6 text-amber-600" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-bold text-amber-900">Complete Your Donor Profile</h3>
                      <Badge color="warning">{completedCount} of 5 Completed</Badge>
                    </div>
                    <p className="text-sm text-amber-800 mt-1">
                      You must complete all required profile fields before you can respond to blood requests or be discovered for emergency matching.
                    </p>
                  </div>
                </div>
                <Link to="/donor/profile" className="shrink-0">
                  <Button variant="primary" size="md" icon={ArrowRight}>
                    Complete Your Profile
                  </Button>
                </Link>
              </div>

              {/* Required-fields Checklist */}
              <div className="mt-6 pt-6 border-t border-amber-200/80">
                <h4 className="text-xs font-semibold text-amber-900 uppercase tracking-wider mb-3">
                  Required Fields Checklist:
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {checklist.map(item => (
                    <div 
                      key={item.key} 
                      className={`flex items-start gap-2.5 p-3 rounded-lg border ${
                        item.valid 
                          ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900' 
                          : 'bg-white border-amber-200 text-surface-700'
                      }`}
                    >
                      {item.valid ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                      ) : (
                        <XCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                      )}
                      <div className="text-xs">
                        <div className="font-semibold flex items-center gap-1">
                          {item.label}
                          {item.value && <span className="font-normal text-surface-500">({item.value})</span>}
                        </div>
                        <div className="text-surface-500 mt-0.5">{item.desc}</div>
                      </div>
                    </div>
                  ))}
                </div>

                {readiness?.validation_errors?.length > 0 && (
                  <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-800">
                    <span className="font-semibold">Action Required: </span>
                    {readiness.validation_errors.join(' ')}
                  </div>
                )}
              </div>
            </Card>
          ) : !isAvailable ? (
            <Card className="mb-8 border-amber-200 bg-amber-50/40 p-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                    <ShieldAlert className="w-6 h-6 text-amber-600" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-bold text-surface-900">Marked as Unavailable</h3>
                      <Badge color="warning">Unavailable</Badge>
                      <Badge color="success">Profile Complete</Badge>
                    </div>
                    <p className="text-sm text-surface-600 mt-1">
                      Your profile is complete, but you are marked unavailable. Toggle your status to "Available" to respond to blood requests.
                    </p>
                  </div>
                </div>
                <Link to="/donor/profile" className="shrink-0">
                  <Button variant="outline" size="sm">
                    Enable Availability
                  </Button>
                </Link>
              </div>
            </Card>
          ) : (
            <Card className="mb-8 border-emerald-200 bg-emerald-50/40 p-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                    <UserCheck className="w-6 h-6 text-emerald-600" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-base font-bold text-surface-900">Ready to Respond</h3>
                      <Badge color="success">Profile Complete</Badge>
                      <Badge color="primary">Available</Badge>
                      {stats.totalDonations === 0 ? (
                        <Badge color="secondary">Eligible First-Time Donor</Badge>
                      ) : (
                        <Badge color="purple">Active Donor</Badge>
                      )}
                    </div>
                    <p className="text-sm text-surface-600 mt-1">
                      Your profile is complete and you are available to respond to matching emergency blood requests.
                    </p>
                  </div>
                </div>
                <Link to="/donor/requests" className="shrink-0">
                  <Button variant="primary" size="sm" icon={ArrowRight}>
                    Browse Blood Requests
                  </Button>
                </Link>
              </div>
            </Card>
          )}

          {/* Activity Statistics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <StatCard icon={Heart} label="Total Donations" value={stats.totalDonations.toString()} color="primary" />
            <StatCard icon={FileText} label="Pending Responses" value={stats.pendingResponses.toString()} color="warning" />
            <StatCard icon={Droplets} label="Active Requests" value={stats.activeRequests.toString()} color="secondary" />
            <StatCard icon={Clock} label="Last Donation" value={stats.lastDonation} color="success" />
          </div>

          <Card className="flex flex-col items-center justify-center py-12 text-center">
            <Activity className="w-12 h-12 text-surface-300 mb-4" />
            <h3 className="text-lg font-medium text-surface-900 mb-2">You're all caught up!</h3>
            <p className="text-surface-500 mb-4">Check the Blood Requests page to find patients in need of your blood type.</p>
            <Link to="/donor/requests">
              <Button variant="outline" size="sm" icon={ArrowRight}>
                View Active Blood Requests
              </Button>
            </Link>
          </Card>
        </>
      )}
    </div>
  );
}
