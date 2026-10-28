import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Users, Droplets, FileText, Activity, Clock, ArrowRight, User, CheckCircle2, AlertCircle } from 'lucide-react';
import StatCard from '../../components/ui/StatCard';
import Card from '../../components/ui/Card';
import Spinner from '../../components/ui/Spinner';
import Alert from '../../components/ui/Alert';
import Badge from '../../components/ui/Badge';

import adminService from '../../services/adminService';

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    total_users: 0,
    total_donors: 0,
    active_blood_requests: 0,
    completed_donations: 0
  });
  const [recentDonors, setRecentDonors] = useState([]);
  const [pendingDonations, setPendingDonations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [statsRes, donorsRes, donationsRes] = await Promise.all([
        adminService.getDashboard(),
        adminService.getDonors({ limit: 5 }).catch(() => ({ data: [] })),
        adminService.getDonations({ status: 'pending' }).catch(() => ({ data: [] })),
      ]);

      if (statsRes.data) {
        setStats(statsRes.data);
      }
      if (donorsRes.data) {
        setRecentDonors(donorsRes.data);
      }
      if (donationsRes.data) {
        setPendingDonations(donationsRes.data);
      }
    } catch (err) {
      setError('Failed to fetch admin dashboard data. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-surface-900">Admin Dashboard</h1>
        <p className="text-surface-500 mt-1">System overview and real-time management</p>
      </div>

      {error && <Alert type="error" message={error} className="mb-6" />}

      {loading ? (
        <div className="flex justify-center py-12">
          <Spinner />
        </div>
      ) : (
        <>
          {/* Key Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <StatCard icon={Users} label="Total Users" value={stats.total_users.toString()} color="primary" />
            <StatCard icon={Droplets} label="Registered Donors" value={stats.total_donors.toString()} color="secondary" />
            <StatCard icon={FileText} label="Active Requests" value={stats.active_blood_requests.toString()} color="warning" />
            <StatCard icon={Activity} label="Completed Donations" value={stats.completed_donations.toString()} color="success" />
          </div>

          {/* Pending Verifications Alert Banner */}
          {pendingDonations.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center text-amber-700 shrink-0">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-amber-900">
                    {pendingDonations.length} Donation{pendingDonations.length > 1 ? 's' : ''} Awaiting Admin Verification
                  </h3>
                  <p className="text-sm text-amber-700">
                    Review and verify hospital donation records to confirm donations and update donor records.
                  </p>
                </div>
              </div>
              <Link
                to="/admin/donations"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-sm font-medium transition-colors shrink-0 self-start sm:self-auto"
              >
                Review Donations <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          )}

          {/* Recent Registered Donors Section */}
          <div className="bg-white rounded-xl border border-surface-200 overflow-hidden mb-8">
            <div className="px-6 py-5 border-b border-surface-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h2 className="text-lg font-bold text-surface-900">Recent Registered Donors</h2>
                <p className="text-xs text-surface-500 mt-0.5">
                  Latest users registered with the donor role
                </p>
              </div>
              <Link
                to="/admin/donors"
                className="text-sm font-semibold text-primary-600 hover:text-primary-700 flex items-center gap-1"
              >
                View all donors ({stats.total_donors}) <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            {recentDonors.length === 0 ? (
              <div className="py-12 text-center text-surface-500">
                No registered donors found in the system.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-surface-600">
                  <thead className="bg-surface-50 text-surface-500 text-xs uppercase font-semibold">
                    <tr>
                      <th className="px-6 py-3.5">Donor</th>
                      <th className="px-6 py-3.5">Blood Group</th>
                      <th className="px-6 py-3.5">Location</th>
                      <th className="px-6 py-3.5">Profile Status</th>
                      <th className="px-6 py-3.5">Availability</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-200">
                    {recentDonors.map((donor) => (
                      <tr key={donor.id} className="hover:bg-surface-50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-primary-50 text-primary-700 flex items-center justify-center font-semibold text-xs">
                              {donor.full_name ? donor.full_name.charAt(0).toUpperCase() : 'D'}
                            </div>
                            <div>
                              <div className="font-medium text-surface-900">{donor.full_name}</div>
                              <div className="text-xs text-surface-500">{donor.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          {donor.blood_group ? (
                            <Badge color="primary">{donor.blood_group}</Badge>
                          ) : (
                            <span className="text-xs text-surface-400 italic">Not specified</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          {donor.city ? (
                            <span>{donor.city}{donor.state ? `, ${donor.state}` : ''}</span>
                          ) : (
                            <span className="text-xs text-surface-400 italic">Not specified</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          {donor.has_completed_profile ? (
                            <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3" /> Complete
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">
                              <AlertCircle className="w-3 h-3" /> Incomplete
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <Badge color={donor.is_available ? 'success' : 'surface'}>
                            {donor.is_available ? 'Available' : 'Unavailable'}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
