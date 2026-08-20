import { useState, useEffect } from 'react';
import { Heart, FileText, Droplets, Clock, Activity } from 'lucide-react';
import StatCard from '../../components/ui/StatCard';
import Card from '../../components/ui/Card';
import Spinner from '../../components/ui/Spinner';
import Alert from '../../components/ui/Alert';

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
      const [profileRes, requestsRes, responsesRes, donationsRes] = await Promise.all([
        donorService.getProfile().catch(() => ({ data: {} })),
        requestService.getRequests({ status: 'open' }).catch(() => ({ data: [] })),
        responseService.getMyResponses().catch(() => ({ data: [] })),
        donationService.getMyDonations().catch(() => ({ data: [] }))
      ]);

      const profile = profileRes.data || {};
      const requests = requestsRes.data || [];
      const responses = responsesRes.data || [];
      const donations = donationsRes.data || [];

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

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-surface-900">Donor Dashboard</h1>
        <p className="text-surface-500 mt-1">Overview of your donor activity</p>
      </div>

      {error && <Alert type="error" message={error} className="mb-6" />}

      {loading ? (
        <div className="flex justify-center py-12">
          <Spinner />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <StatCard icon={Heart} label="Total Donations" value={stats.totalDonations.toString()} color="primary" />
            <StatCard icon={FileText} label="Pending Responses" value={stats.pendingResponses.toString()} color="warning" />
            <StatCard icon={Droplets} label="Active Requests" value={stats.activeRequests.toString()} color="secondary" />
            <StatCard icon={Clock} label="Last Donation" value={stats.lastDonation} color="success" />
          </div>

          <Card className="flex flex-col items-center justify-center py-12 text-center">
            <Activity className="w-12 h-12 text-surface-300 mb-4" />
            <h3 className="text-lg font-medium text-surface-900 mb-2">You're all caught up!</h3>
            <p className="text-surface-500">Check the Blood Requests page to find patients in need.</p>
          </Card>
        </>
      )}
    </div>
  );
}
