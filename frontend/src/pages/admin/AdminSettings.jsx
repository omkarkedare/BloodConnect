import { Settings } from 'lucide-react';

export default function AdminSettings() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-surface-900">Admin Settings</h1>
        <p className="text-surface-500 mt-1">System configuration</p>
      </div>
      <div className="bg-white rounded-xl border border-surface-200 p-8 text-center">
        <Settings className="w-12 h-12 text-surface-300 mx-auto mb-4" />
        <p className="text-surface-500">Admin settings will be implemented in Phase 8.</p>
      </div>
    </div>
  );
}
