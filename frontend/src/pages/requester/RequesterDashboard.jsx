import { useState, useEffect } from 'react';
import { 
  FileText, 
  CheckCircle, 
  Clock, 
  PlusCircle, 
  Search, 
  ArrowRight,
  MapPin,
  Calendar,
  Activity,
  Award
} from 'lucide-react';
import { Link } from 'react-router-dom';
import StatCard from '../../components/ui/StatCard';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Spinner from '../../components/ui/Spinner';
import Alert from '../../components/ui/Alert';
import StatusBadge from '../../components/ui/StatusBadge';

import { useAuth } from '../../hooks/useAuth';
import requestService from '../../services/requestService';
import responseService from '../../services/responseService';

export default function RequesterDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalRequests: 0,
    responsesReceived: 0,
    fulfilled: 0,
    pending: 0
  });
  const [recentRequests, setRecentRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (user?.id) {
      fetchDashboardData();
    }
  }, [user]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch all requests
      const reqRes = await requestService.getRequests();
      // Filter my requests
      const myRequests = (reqRes.data || []).filter(r => r.requester_id === user.id);
      
      const openCount = myRequests.filter(r => (r.status || '').toLowerCase() === 'open').length;
      const fulfilledCount = myRequests.filter(r => (r.status || '').toLowerCase() === 'fulfilled').length;
      const verifiedDonationsCount = myRequests.filter(r => (r.display_status || '').toUpperCase() === 'VERIFIED').length;
      const totalVerifiedUnits = myRequests.reduce((sum, r) => sum + (r.verified_units || 0), 0);

      // Fetch responses for each of my requests
      const responsePromises = myRequests.map(req => 
        responseService.getResponses(req.id).catch(() => ({ data: [] }))
      );
      const responsesArrays = await Promise.all(responsePromises);
      const totalResponses = responsesArrays.reduce((sum, res) => sum + (res.data?.length || 0), 0);

      setRecentRequests(myRequests.slice(0, 4));

      setStats({
        totalRequests: myRequests.length,
        openRequests: openCount,
        fulfilledRequests: fulfilledCount,
        verifiedDonations: verifiedDonationsCount,
        verifiedUnits: totalVerifiedUnits,
        responsesReceived: totalResponses,
      });
    } catch {
      setError('Failed to load dashboard data. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-surface-900">Requester Dashboard</h1>
          <p className="text-surface-500 mt-1">Manage blood requests, review donor responses, and monitor fulfillment</p>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/requester/donors">
            <Button variant="outline" size="sm" icon={Search}>
              Search Donors
            </Button>
          </Link>
          <Link to="/requester/create-request">
            <Button variant="primary" size="sm" icon={PlusCircle}>
              Create Request
            </Button>
          </Link>
        </div>
      </div>

      {error && <Alert type="error" message={error} />}

      {loading ? (
        <div className="flex justify-center py-16">
          <Spinner size="lg" />
        </div>
      ) : (
        <>
          {/* Clickable StatCards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard 
              icon={FileText} 
              label="Total Requests" 
              value={(stats.totalRequests || 0).toString()} 
              color="primary" 
              to="/requester/requests" 
            />
            <StatCard 
              icon={Clock} 
              label="Open Requests" 
              value={(stats.openRequests || 0).toString()} 
              color="warning" 
              to="/requester/requests?status=open" 
            />
            <StatCard 
              icon={CheckCircle} 
              label="Fulfilled Requests" 
              value={(stats.fulfilledRequests || 0).toString()} 
              color="secondary" 
              to="/requester/requests?status=fulfilled" 
            />
            <StatCard 
              icon={Award} 
              label="Verified Donations" 
              value={(stats.verifiedDonations || 0).toString()} 
              trend={stats.verifiedUnits > 0 ? `${stats.verifiedUnits} unit(s) verified` : undefined}
              color="success" 
              to="/requester/requests?status=verified" 
            />
          </div>

          {/* Quick Action Navigation Strip */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="p-5 flex items-center justify-between bg-primary-50/40 border-primary-200 hover:border-primary-300 transition-colors">
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-xl bg-primary-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                  <PlusCircle className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-surface-900">Need Blood Urgently?</h3>
                  <p className="text-xs text-surface-500 mt-0.5">Post an emergency blood request to reach eligible donors immediately.</p>
                </div>
              </div>
              <Link to="/requester/create-request" className="shrink-0 ml-3">
                <Button variant="primary" size="sm" icon={ArrowRight}>
                  Create
                </Button>
              </Link>
            </Card>

            <Card className="p-5 flex items-center justify-between bg-surface-50 border-surface-200 hover:border-surface-300 transition-colors">
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-xl bg-surface-200 text-surface-700 flex items-center justify-center shrink-0">
                  <Search className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-surface-900">Search Voluntary Donors</h3>
                  <p className="text-xs text-surface-500 mt-0.5">Find available donors by blood group, city location, and readiness.</p>
                </div>
              </div>
              <Link to="/requester/donors" className="shrink-0 ml-3">
                <Button variant="outline" size="sm" icon={ArrowRight}>
                  Browse
                </Button>
              </Link>
            </Card>
          </div>

          {/* Recent Blood Requests Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-surface-900">Recent Blood Requests</h2>
                <p className="text-xs text-surface-500">Monitor response progress and hospital delivery status</p>
              </div>
              {stats.totalRequests > 0 && (
                <Link 
                  to="/requester/requests" 
                  className="text-xs font-semibold text-primary-600 hover:text-primary-700 flex items-center gap-1"
                >
                  View All ({stats.totalRequests})
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              )}
            </div>

            {recentRequests.length === 0 ? (
              <Card className="flex flex-col items-center justify-center py-14 text-center">
                <div className="w-12 h-12 rounded-full bg-primary-50 text-primary-600 flex items-center justify-center mb-3">
                  <FileText className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-surface-900 mb-1">No Active Requests</h3>
                <p className="text-xs text-surface-500 max-w-sm mb-4">
                  You have not submitted any blood requests yet. Submit a request to receive responses from matching donors.
                </p>
                <Link to="/requester/create-request">
                  <Button variant="primary" size="sm" icon={PlusCircle}>
                    Create Your First Request
                  </Button>
                </Link>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {recentRequests.map(req => (
                  <Card key={req.id} className="p-5 flex flex-col justify-between hover:border-surface-300 transition-colors">
                    <div>
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div>
                          <h3 className="font-bold text-surface-900 text-sm">{req.patient_name}</h3>
                          <div className="flex items-center gap-1.5 mt-1">
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-red-100 text-red-800">
                              {req.blood_group}
                            </span>
                            <span className="text-xs text-surface-600 font-medium">
                              {req.units_needed} Unit{req.units_needed > 1 ? 's' : ''} Needed
                            </span>
                          </div>
                        </div>
                        <StatusBadge status={(req.display_status || req.status).toLowerCase()} />
                      </div>

                      <div className="space-y-1.5 text-xs text-surface-600 my-3">
                        <div className="flex items-center gap-2">
                          <Activity className="w-3.5 h-3.5 text-surface-400" />
                          <span className="capitalize font-medium text-surface-700">Urgency: {req.urgency}</span>
                        </div>
                        <div className="flex items-start gap-2">
                          <MapPin className="w-3.5 h-3.5 text-surface-400 mt-0.5" />
                          <span className="text-surface-700 line-clamp-1">{req.hospital_name}, {req.city}</span>
                        </div>
                        {req.expires_at ? (
                          <div className="flex items-center gap-2">
                            <Clock className="w-3.5 h-3.5 text-surface-400" />
                            <span>Needed by: {new Date(req.expires_at).toLocaleString()}</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <Calendar className="w-3.5 h-3.5 text-surface-400" />
                            <span>Needed by: {new Date(req.required_date).toLocaleDateString()}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="pt-3 border-t border-surface-100 mt-auto">
                      <Link 
                        to={`/requester/requests/${req.id}`}
                        className="text-xs font-semibold text-primary-600 hover:text-primary-700 flex items-center justify-between w-full"
                      >
                        <span>View Details & Responses</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
