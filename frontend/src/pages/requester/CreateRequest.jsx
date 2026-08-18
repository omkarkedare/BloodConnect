import { PlusCircle } from 'lucide-react';

export default function CreateRequest() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-surface-900">Create Blood Request</h1>
        <p className="text-surface-500 mt-1">Submit a new blood request</p>
      </div>
      <div className="bg-white rounded-xl border border-surface-200 p-8 text-center">
        <PlusCircle className="w-12 h-12 text-surface-300 mx-auto mb-4" />
        <p className="text-surface-500">Request creation form will be implemented in Phase 6.</p>
      </div>
    </div>
  );
}
