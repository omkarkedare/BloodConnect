import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Users, 
  Droplets, 
  FileText, 
  Activity, 
  Clock, 
  ArrowRight, 
  CheckCircle2, 
  AlertCircle,
  AlertTriangle,
  RotateCw,
  ShieldCheck,
  Calendar,
  MapPin
} from 'lucide-react';
import StatCard from '../../components/ui/StatCard';
import Spinner from '../../components/ui/Spinner';
import Alert from '../../components/ui/Alert';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';

import adminService from '../../services/adminService';
import AdminAnalyticsCharts from '../../components/admin/AdminAnalyticsCharts';
import AdminOpsArchitectureNotice from '../../components/admin/AdminOpsArchitectureNotice';

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    total_users: 0,
    total_donors: 0,
    active_blood_requests: 0,
    completed_donations: 0,
    pending_verifications: 0,
    rejected_donations: 0,
    urgent_requests: 0,
    fulfilled_requests: 0,
    total_requests: 0,
    total_donations: 0,
  });

  const [allDonors, setAllDonors] = useState([]);
  const [allRequests, setAllRequests] = useState([]);
  const [allDonations, setAllDonations] = useState([]);
  const [pendingDonations, setPendingDonations] = useState([]);

  const [lastRefreshed, setLastRefreshed] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchDashboardData();

    const rateSec = parseInt(localStorage.getItem('bloodconnect_admin_refresh_rate') || '60', 10);
    if (rateSec > 0) {
      const intervalId = setInterval(() => {
        // Guard against repeated API calls after logout
        if (!localStorage.getItem('access_token')) {
          clearInterval(intervalId);
          return;
        }
        fetchDashboardData(true);
      }, rateSec * 1000);
      return () => clearInterval(intervalId);
    }
  }, []);

  const fetchDashboardData = async (isManualRefresh = false) => {
    // Abort if session token was cleared (e.g. during logout)
    if (!localStorage.getItem('access_token')) {
      return;
    }

    try {
      if (isManualRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      // Fetch dashboard metrics, donors, requests, and donations in parallel
      const [statsRes, donorsRes, requestsRes, donationsRes] = await Promise.all([
        adminService.getDashboard(),
        adminService.getDonors().catch(() => ({ data: [] })),
        adminService.getRequests().catch(() => ({ data: [] })),
        adminService.getDonations().catch(() => ({ data: [] })),
      ]);

      if (statsRes.data) {
        setStats(statsRes.data);
      }

      const donorsData = donorsRes.data || [];
      const requestsData = requestsRes.data || [];
      const donationsData = donationsRes.data || [];

      setAllDonors(donorsData);
      setAllRequests(requestsData);
      setAllDonations(donationsData);

      // Filter pending donations specifically for verification queue
      const pendingList = donationsData.filter(
        d => (d.status?.value || d.status || '').toLowerCase() === 'pending'
      );
      setPendingDonations(pendingList);

      setLastRefreshed(new Date().toLocaleTimeString());
    } catch (err) {
      setError('Failed to fetch admin operations data. Please ensure the backend server is running and try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const recentDonors = allDonors.slice(0, 5);
  const pendingQueuePreview = pendingDonations.slice(0, 5);

  const urgentRequestsCount = stats.urgent_requests || allRequests.filter(
    r => ['urgent', 'critical'].includes((r.urgency || '').toLowerCase()) && ['open', 'in_progress'].includes((r.status || '').toLowerCase())
  ).length;

  const pendingVerificationsCount = stats.pending_verifications || pendingDonations.length;

  return (
    <div className="space-y-8">
      {/* Operations Header & Governance Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-surface-200">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-2xl font-bold text-surface-900 tracking-tight">Platform Operations Dashboard</h1>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-primary-100 text-primary-800 border border-primary-200">
              <ShieldCheck className="w-3.5 h-3.5 text-primary-600" />
              Platform Administration Node
            </span>
          </div>
          <p className="text-surface-500 text-xs sm:text-sm mt-1">
            Central governance, emergency donation triage, and verification overview
          </p>
        </div>

        {/* Action Controls & Refresh */}
        <div className="flex items-center gap-3 self-start md:self-auto flex-wrap">
          {lastRefreshed && (
            <span className="text-xs text-surface-400 font-medium">
              Updated {lastRefreshed}
            </span>
          )}
          <Button
            variant="outline"
            size="sm"
            icon={RotateCw}
            onClick={() => fetchDashboardData(true)}
            isLoading={refreshing}
            className="text-xs font-semibold"
            title="Refresh dashboard metrics"
          >
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </Button>
          <Link to="/admin/donations?status=pending">
            <Button variant="primary" size="sm" className="text-xs font-semibold">
              Verify Donations {pendingVerificationsCount > 0 && `(${pendingVerificationsCount})`}
            </Button>
          </Link>
        </div>
      </div>

      {/* Connection / Fetch Error Alert */}
      {error && (
        <Alert 
          type="error" 
          message={error}
          className="mb-4"
          action={
            <Button variant="outline" size="xs" onClick={() => fetchDashboardData()}>
              Retry Connection
            </Button>
          }
        />
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 space-y-3">
          <Spinner size="lg" />
          <p className="text-xs text-surface-500 font-medium">Loading platform operations telemetry...</p>
        </div>
      ) : (
        <>
          {/* Priority Operational Alerts (Triage Banners) */}
          <div className="space-y-4">
            {pendingVerificationsCount > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-2xs">
                <div className="flex items-center gap-3.5">
                  <div className="w-11 h-11 rounded-xl bg-amber-100 flex items-center justify-center text-amber-700 shrink-0 shadow-xs">
                    <Clock className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-amber-800">Priority Verification Required</span>
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-extrabold bg-amber-200 text-amber-900">
                        {pendingVerificationsCount} Record{pendingVerificationsCount > 1 ? 's' : ''}
                      </span>
                    </div>
                    <h3 className="font-bold text-surface-900 text-sm mt-0.5">
                      Donation Records Awaiting Hospital Verification Audit
                    </h3>
                    <p className="text-xs text-amber-800 mt-0.5">
                      Confirming hospital attendance issues official appreciation certificates, awards donor recognition badges, and updates emergency request records.
                    </p>
                  </div>
                </div>
                <Link
                  to="/admin/donations?status=pending"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition-colors shrink-0 self-start sm:self-auto shadow-xs"
                >
                  Review Verification Queue <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            )}

            {urgentRequestsCount > 0 && (
              localStorage.getItem('bloodconnect_admin_alert_banner') === 'compact' ? (
                /* Compact Clinical Warning Bar (Emergency warnings cannot be silenced) */
                <div className="bg-rose-50 border border-rose-300 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-2xs">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-rose-100 flex items-center justify-center text-rose-700 shrink-0">
                      <AlertTriangle className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="font-bold text-rose-900 uppercase text-[10px] tracking-wider">Critical Emergency Demand • </span>
                      <span className="font-semibold text-rose-800">
                        {urgentRequestsCount} urgent or critical request{urgentRequestsCount > 1 ? 's' : ''} active in regional network
                      </span>
                    </div>
                  </div>
                  <Link
                    to="/admin/requests?urgency=emergency"
                    className="inline-flex items-center gap-1 font-bold text-rose-700 hover:text-rose-900 shrink-0 text-xs self-start sm:self-auto underline"
                  >
                    Triage Requests <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              ) : (
                /* Prominent Expanded Banner (Default) */
                <div className="bg-rose-50 border border-rose-200 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-2xs">
                  <div className="flex items-center gap-3.5">
                    <div className="w-11 h-11 rounded-xl bg-rose-100 flex items-center justify-center text-rose-700 shrink-0 shadow-xs">
                      <AlertTriangle className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-rose-800">Critical Emergency Triage</span>
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-extrabold bg-rose-200 text-rose-900">
                          {urgentRequestsCount} Active
                        </span>
                      </div>
                      <h3 className="font-bold text-surface-900 text-sm mt-0.5">
                        Urgent & Critical Blood Demands Active in Emergency Network
                      </h3>
                      <p className="text-xs text-rose-800 mt-0.5">
                        High-urgency blood requests require active donor response coordination and regional donor matching.
                      </p>
                    </div>
                  </div>
                  <Link
                    to="/admin/requests?urgency=emergency"
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-colors shrink-0 self-start sm:self-auto shadow-xs"
                  >
                    View Emergency Requests <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              )
            )}

            {pendingVerificationsCount === 0 && urgentRequestsCount === 0 && (
              <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-4 flex items-center gap-3 text-xs text-emerald-800">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <span>
                  <strong>Operations Stable:</strong> All hospital donation records are verified, and no critical request backlogs are active.
                </span>
              </div>
            )}
          </div>

          {/* Clickable KPI Metric Cards (Responsive 3 Desktop / 2 Tablet / 1 Mobile) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            <StatCard 
              icon={Users} 
              label="Total Registered Users" 
              value={stats.total_users.toString()} 
              color="primary" 
              to="/admin/users" 
            />
            <StatCard 
              icon={Droplets} 
              label="Registered Donors" 
              value={stats.total_donors.toString()} 
              color="secondary" 
              to="/admin/donors" 
            />
            <StatCard 
              icon={FileText} 
              label="Active Blood Requests" 
              value={stats.active_blood_requests.toString()} 
              color="warning" 
              to="/admin/requests?status=open" 
            />
            <StatCard 
              icon={Activity} 
              label="Verified Donations" 
              value={stats.completed_donations.toString()} 
              color="success" 
              to="/admin/donations?status=verified" 
            />
            <StatCard 
              icon={Clock} 
              label="Pending Verification Audit" 
              value={pendingVerificationsCount.toString()} 
              color="amber" 
              to="/admin/donations?status=pending" 
            />
            <StatCard 
              icon={AlertTriangle} 
              label="Urgent Blood Demands" 
              value={urgentRequestsCount.toString()} 
              color="rose" 
              to="/admin/requests?urgency=emergency" 
            />
          </div>

          {/* Analytics Visualizations: Blood Group Supply vs Demand & Pipeline Health */}
          <AdminAnalyticsCharts 
            donors={allDonors}
            requests={allRequests}
            donations={allDonations}
            stats={stats}
          />

          {/* Platform vs Facility Governance Extensibility Architecture Notice */}
          <AdminOpsArchitectureNotice />

          {/* Pending Verifications Triage Queue (Top 5) */}
          {pendingQueuePreview.length > 0 && (
            <div className="bg-white rounded-xl border border-surface-200 overflow-hidden shadow-2xs">
              <div className="px-6 py-4.5 border-b border-surface-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h2 className="text-base font-bold text-surface-900 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-amber-600" />
                    Pending Hospital Donation Verifications
                  </h2>
                  <p className="text-xs text-surface-500 mt-0.5">
                    Highest priority donation records requiring admin verification reference
                  </p>
                </div>
                <Link
                  to="/admin/donations?status=pending"
                  className="text-xs font-semibold text-primary-600 hover:text-primary-700 flex items-center gap-1"
                >
                  Manage all {pendingDonations.length} pending donations <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-surface-600">
                  <thead className="bg-surface-50 text-surface-500 text-xs uppercase font-semibold">
                    <tr>
                      <th className="px-6 py-3.5">Donor</th>
                      <th className="px-6 py-3.5">Blood Group & Units</th>
                      <th className="px-6 py-3.5">Hospital / Facility</th>
                      <th className="px-6 py-3.5">Donation Date</th>
                      <th className="px-6 py-3.5 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-100">
                    {pendingQueuePreview.map((d) => (
                      <tr key={d.id} className="hover:bg-surface-50 transition-colors text-xs">
                        <td className="px-6 py-3.5">
                          <div className="font-semibold text-surface-900">{d.donor_name || `Donor #${d.donor_id}`}</div>
                          <div className="text-[11px] text-surface-400">{d.donor_email || ''}</div>
                        </td>
                        <td className="px-6 py-3.5">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-red-100 text-red-800">
                            {d.blood_group}
                          </span>
                          <span className="text-surface-500 ml-1.5 font-medium">
                            {d.units_donated || 1} Unit
                          </span>
                        </td>
                        <td className="px-6 py-3.5">
                          <span className="flex items-center gap-1 text-surface-700">
                            <MapPin className="w-3.5 h-3.5 text-surface-400" />
                            {d.hospital_name || 'Hospital / Medical Centre'}
                          </span>
                        </td>
                        <td className="px-6 py-3.5">
                          <span className="flex items-center gap-1 text-surface-600">
                            <Calendar className="w-3.5 h-3.5 text-surface-400" />
                            {new Date(d.donation_date).toLocaleDateString()}
                          </span>
                        </td>
                        <td className="px-6 py-3.5 text-right">
                          <Link to="/admin/donations">
                            <Button variant="outline" size="xs" className="text-amber-700 border-amber-300 hover:bg-amber-50">
                              Audit & Verify
                            </Button>
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Recent Registered Donors Section */}
          <div className="bg-white rounded-xl border border-surface-200 overflow-hidden shadow-2xs">
            <div className="px-6 py-4.5 border-b border-surface-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h2 className="text-base font-bold text-surface-900 flex items-center gap-2">
                  <Droplets className="w-4 h-4 text-red-600" />
                  Recent Registered Donors
                </h2>
                <p className="text-xs text-surface-500 mt-0.5">
                  Latest members registered in the regional donor directory
                </p>
              </div>
              <Link
                to="/admin/donors"
                className="text-xs font-semibold text-primary-600 hover:text-primary-700 flex items-center gap-1"
              >
                View all donors ({stats.total_donors}) <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {recentDonors.length === 0 ? (
              <div className="py-12 text-center text-xs text-surface-500">
                No registered donors found in the regional registry.
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
                  <tbody className="divide-y divide-surface-100">
                    {recentDonors.map((donor) => (
                      <tr key={donor.id} className="hover:bg-surface-50 transition-colors text-xs">
                        <td className="px-6 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-primary-50 text-primary-700 flex items-center justify-center font-bold text-xs shadow-2xs">
                              {donor.full_name ? donor.full_name.charAt(0).toUpperCase() : 'D'}
                            </div>
                            <div>
                              <div className="font-semibold text-surface-900">{donor.full_name}</div>
                              <div className="text-[11px] text-surface-400">{donor.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-3.5">
                          {donor.blood_group ? (
                            <Badge color="primary">{donor.blood_group}</Badge>
                          ) : (
                            <span className="text-surface-400 italic">Not specified</span>
                          )}
                        </td>
                        <td className="px-6 py-3.5">
                          {donor.city ? (
                            <span>{donor.city}{donor.state ? `, ${donor.state}` : ''}</span>
                          ) : (
                            <span className="text-surface-400 italic">Not specified</span>
                          )}
                        </td>
                        <td className="px-6 py-3.5">
                          {donor.has_completed_profile ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3" /> Complete
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
                              <AlertCircle className="w-3 h-3" /> Incomplete
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-3.5">
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
