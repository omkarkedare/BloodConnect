import { BarChart3 } from 'lucide-react';

export default function Reports() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-surface-900">Reports</h1>
        <p className="text-surface-500 mt-1">System analytics and reports</p>
      </div>
      <div className="bg-white rounded-xl border border-surface-200 p-8 text-center">
        <BarChart3 className="w-12 h-12 text-surface-300 mx-auto mb-4" />
        <p className="text-surface-500">Reports will be implemented in Phase 8.</p>
      </div>
    </div>
  );
}
