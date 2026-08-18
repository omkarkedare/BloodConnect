import { Users, Droplets, FileText, Activity } from 'lucide-react';
import StatCard from '../../components/ui/StatCard';

export default function AdminDashboard() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-surface-900">Admin Dashboard</h1>
        <p className="text-surface-500 mt-1">System overview and management</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard icon={Users} label="Total Users" value="0" color="primary" />
        <StatCard icon={Droplets} label="Registered Donors" value="0" color="secondary" />
        <StatCard icon={FileText} label="Blood Requests" value="0" color="warning" />
        <StatCard icon={Activity} label="Donations" value="0" color="success" />
      </div>
      <div className="mt-8 bg-white rounded-xl border border-surface-200 p-8 text-center">
        <p className="text-surface-500">Admin features will be implemented in Phase 8.</p>
      </div>
    </div>
  );
}
