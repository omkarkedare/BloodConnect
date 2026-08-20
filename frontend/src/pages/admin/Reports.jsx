import { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, Users, Activity } from 'lucide-react';
import adminService from '../../services/adminService';
import Spinner from '../../components/ui/Spinner';
import Alert from '../../components/ui/Alert';
import Card from '../../components/ui/Card';

export default function Reports() {
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchReportData();
  }, []);

  const fetchReportData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const statsRes = await adminService.getDashboard();
      
      setReportData({
        stats: statsRes.data
      });
    } catch (err) {
      setError('Failed to generate report data. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-surface-900">System Reports</h1>
        <p className="text-surface-500 mt-1">Analytics and overall platform metrics</p>
      </div>

      {error && <Alert type="error" message={error} className="mb-6" />}

      {loading ? (
        <div className="flex justify-center py-12"><Spinner /></div>
      ) : !reportData ? (
        <div className="text-center py-12 text-surface-500">No report data available.</div>
      ) : (
        <div className="space-y-6">
          <Card className="p-8">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 rounded-full bg-primary-100 flex items-center justify-center">
                <BarChart3 className="w-6 h-6 text-primary-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-surface-900">Platform Health Summary</h2>
                <p className="text-surface-500">Current status of BloodConnect operations</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="border border-surface-200 rounded-lg p-6">
                <h3 className="text-sm font-semibold text-surface-500 uppercase mb-4 flex items-center gap-2">
                  <Users className="w-4 h-4" /> User Base
                </h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-surface-700">Total Registered Users</span>
                    <span className="text-xl font-bold text-surface-900">{reportData.stats.total_users}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-surface-700">Active Donor Profiles</span>
                    <span className="text-xl font-bold text-surface-900">{reportData.stats.total_donors}</span>
                  </div>
                  <div className="w-full bg-surface-100 rounded-full h-2 mt-2">
                    <div className="bg-primary-500 h-2 rounded-full" style={{ width: `${Math.min((reportData.stats.total_donors / (reportData.stats.total_users || 1)) * 100, 100)}%` }}></div>
                  </div>
                  <p className="text-xs text-surface-500 text-right">
                    {Math.round((reportData.stats.total_donors / (reportData.stats.total_users || 1)) * 100)}% Conversion Rate
                  </p>
                </div>
              </div>

              <div className="border border-surface-200 rounded-lg p-6">
                <h3 className="text-sm font-semibold text-surface-500 uppercase mb-4 flex items-center gap-2">
                  <Activity className="w-4 h-4" /> Operational Metrics
                </h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-surface-700">Active Blood Requests</span>
                    <span className="text-xl font-bold text-surface-900">{reportData.stats.active_blood_requests}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-surface-700">Completed Donations</span>
                    <span className="text-xl font-bold text-surface-900">{reportData.stats.completed_donations}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-4 text-success-600 bg-success-50 p-2 rounded-lg text-sm font-medium">
                    <TrendingUp className="w-4 h-4" />
                    System is actively processing requests
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
