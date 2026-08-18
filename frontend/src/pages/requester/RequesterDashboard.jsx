import { FileText, Users, CheckCircle, Clock } from 'lucide-react';
import StatCard from '../../components/ui/StatCard';

export default function RequesterDashboard() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-surface-900">Requester Dashboard</h1>
        <p className="text-surface-500 mt-1">Overview of your blood requests</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard icon={FileText} label="Total Requests" value="0" color="primary" />
        <StatCard icon={Users} label="Responses Received" value="0" color="secondary" />
        <StatCard icon={CheckCircle} label="Fulfilled" value="0" color="success" />
        <StatCard icon={Clock} label="Pending" value="0" color="warning" />
      </div>
      <div className="mt-8 bg-white rounded-xl border border-surface-200 p-8 text-center">
        <p className="text-surface-500">Dashboard content will be implemented in upcoming phases.</p>
      </div>
    </div>
  );
}
