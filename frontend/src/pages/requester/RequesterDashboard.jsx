import { useState, useEffect } from 'react';
import { FileText, Users, CheckCircle, Clock, Activity, PlusCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import StatCard from '../../components/ui/StatCard';
import Card from '../../components/ui/Card';
import Spinner from '../../components/ui/Spinner';
import Alert from '../../components/ui/Alert';

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
      const myRequests = reqRes.data.filter(r => r.requester_id === user.id);
      
      const fulfilled = myRequests.filter(r => r.status === 'fulfilled').length;
      const pendingReqs = myRequests.filter(r => r.status === 'open').length;

      // Fetch responses for each of my requests
      const responsePromises = myRequests.map(req => 
        responseService.getResponses(req.id).catch(() => ({ data: [] }))
      );
      const responsesArrays = await Promise.all(responsePromises);
      const totalResponses = responsesArrays.reduce((sum, res) => sum + (res.data?.length || 0), 0);

      setStats({
        totalRequests: myRequests.length,
        responsesReceived: totalResponses,
        fulfilled,
        pending: pendingReqs
      });
    } catch (err) {
      setError('Failed to load dashboard data. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-surface-900">Requester Dashboard</h1>
          <p className="text-surface-500 mt-1">Overview of your blood requests</p>
        </div>
        <Link 
          to="/requester/create-request" 
          className="inline-flex items-center justify-center rounded-lg font-medium transition-colors px-4 py-2 text-sm bg-primary-600 text-white hover:bg-primary-700"
        >
          <PlusCircle className="w-4 h-4 mr-2" />
          Create Request
        </Link>
      </div>

      {error && <Alert type="error" message={error} className="mb-6" />}

      {loading ? (
        <div className="flex justify-center py-12">
          <Spinner />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <StatCard icon={FileText} label="Total Requests" value={stats.totalRequests.toString()} color="primary" />
            <StatCard icon={Users} label="Responses Received" value={stats.responsesReceived.toString()} color="secondary" />
            <StatCard icon={CheckCircle} label="Fulfilled" value={stats.fulfilled.toString()} color="success" />
            <StatCard icon={Clock} label="Pending" value={stats.pending.toString()} color="warning" />
          </div>

          <Card className="flex flex-col items-center justify-center py-12 text-center">
            <Activity className="w-12 h-12 text-surface-300 mb-4" />
            <h3 className="text-lg font-medium text-surface-900 mb-2">Manage Your Requests</h3>
            <p className="text-surface-500">Check the My Requests page to review donor responses and arrange donations.</p>
          </Card>
        </>
      )}
    </div>
  );
}
