import { Search } from 'lucide-react';

export default function SearchDonors() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-surface-900">Search Donors</h1>
        <p className="text-surface-500 mt-1">Find blood donors near you</p>
      </div>
      <div className="bg-white rounded-xl border border-surface-200 p-8 text-center">
        <Search className="w-12 h-12 text-surface-300 mx-auto mb-4" />
        <p className="text-surface-500">Donor search will be implemented in Phase 5.</p>
      </div>
    </div>
  );
}
