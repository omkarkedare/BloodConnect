import { useState, useEffect } from 'react';
import { Users, Droplets, FileText, Activity } from 'lucide-react';
import StatCard from '../../components/ui/StatCard';
import Card from '../../components/ui/Card';
import Spinner from '../../components/ui/Spinner';
import Alert from '../../components/ui/Alert';

import adminService from '../../services/adminService';

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    total_users: 0,
    total_donors: 0,
    active_blood_requests: 0,
    completed_donations: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await adminService.getDashboard();
      if (res.data) {
        setStats(res.data);
      }
    } catch (err) {
      setError('Failed to fetch admin statistics. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-surface-900">Admin Dashboard</h1>
        <p className="text-surface-500 mt-1">System overview and management</p>
      </div>

      {error && <Alert type="error" message={error} className="mb-6" />}

      {loading ? (
        <div className="flex justify-center py-12">
          <Spinner />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <StatCard icon={Users} label="Total Users" value={stats.total_users.toString()} color="primary" />
            <StatCard icon={Droplets} label="Registered Donors" value={stats.total_donors.toString()} color="secondary" />
            <StatCard icon={FileText} label="Active Requests" value={stats.active_blood_requests.toString()} color="warning" />
            <StatCard icon={Activity} label="Completed Donations" value={stats.completed_donations.toString()} color="success" />
          </div>

          <Card className="flex flex-col items-center justify-center py-12 text-center">
            <Activity className="w-12 h-12 text-surface-300 mb-4" />
            <h3 className="text-lg font-medium text-surface-900 mb-2">System is operating normally</h3>
            <p className="text-surface-500">Use the sidebar to manage users, requests, and monitor system activity.</p>
          </Card>
        </>
      )}
    </div>
  );
}
