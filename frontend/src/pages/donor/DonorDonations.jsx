import { Droplets } from 'lucide-react';

export default function DonorDonations() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-surface-900">My Donations</h1>
        <p className="text-surface-500 mt-1">View your donation history</p>
      </div>
      <div className="bg-white rounded-xl border border-surface-200 p-8 text-center">
        <Droplets className="w-12 h-12 text-surface-300 mx-auto mb-4" />
        <p className="text-surface-500">Donation history will be implemented in a later phase.</p>
      </div>
    </div>
  );
}
