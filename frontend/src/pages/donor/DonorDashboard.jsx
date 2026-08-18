import { Heart, FileText, Droplets, Clock } from 'lucide-react';
import StatCard from '../../components/ui/StatCard';

export default function DonorDashboard() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-surface-900">Donor Dashboard</h1>
        <p className="text-surface-500 mt-1">Overview of your donor activity</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard icon={Heart} label="Total Donations" value="0" color="primary" />
        <StatCard icon={FileText} label="Pending Responses" value="0" color="warning" />
        <StatCard icon={Droplets} label="Active Requests" value="0" color="secondary" />
        <StatCard icon={Clock} label="Last Donation" value="N/A" color="success" />
      </div>
      <div className="mt-8 bg-white rounded-xl border border-surface-200 p-8 text-center">
        <p className="text-surface-500">Dashboard content will be implemented in upcoming phases.</p>
      </div>
    </div>
  );
}
