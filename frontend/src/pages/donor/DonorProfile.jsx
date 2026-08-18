import { User } from 'lucide-react';

export default function DonorProfile() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-surface-900">My Profile</h1>
        <p className="text-surface-500 mt-1">Manage your donor profile</p>
      </div>
      <div className="bg-white rounded-xl border border-surface-200 p-8 text-center">
        <User className="w-12 h-12 text-surface-300 mx-auto mb-4" />
        <p className="text-surface-500">Profile management will be implemented in Phase 5.</p>
      </div>
    </div>
  );
}
