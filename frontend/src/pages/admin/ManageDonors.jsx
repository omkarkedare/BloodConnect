import { useState, useEffect, useMemo } from 'react';
import { Droplets, User, Search, CheckCircle2, AlertCircle, Phone, Mail, Filter } from 'lucide-react';
import adminService from '../../services/adminService';
import Spinner from '../../components/ui/Spinner';
import Alert from '../../components/ui/Alert';
import EmptyState from '../../components/ui/EmptyState';
import Badge from '../../components/ui/Badge';

export default function ManageDonors() {
  const [donors, setDonors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [profileFilter, setProfileFilter] = useState('all'); // 'all', 'complete', 'incomplete'
  const [bloodGroupFilter, setBloodGroupFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  useEffect(() => {
    fetchDonors();
  }, []);

  const fetchDonors = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await adminService.getDonors();
      setDonors(res.data);
    } catch (err) {
      setError('Failed to fetch donors. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const filteredDonors = useMemo(() => {
    return donors.filter((donor) => {
      // Profile status filter
      if (profileFilter === 'complete' && !donor.has_completed_profile) return false;
      if (profileFilter === 'incomplete' && donor.has_completed_profile) return false;

      // Blood group filter
      if (bloodGroupFilter !== 'all' && donor.blood_group !== bloodGroupFilter) return false;

      // Search query filter (name, email, city, phone)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const nameMatch = donor.full_name?.toLowerCase().includes(q);
        const emailMatch = donor.email?.toLowerCase().includes(q);
        const cityMatch = donor.city?.toLowerCase().includes(q);
        const phoneMatch = donor.phone?.toLowerCase().includes(q);
        if (!nameMatch && !emailMatch && !cityMatch && !phoneMatch) return false;
      }

      return true;
    });
  }, [donors, profileFilter, bloodGroupFilter, searchQuery]);

  // Pagination calculation
  const totalPages = Math.ceil(filteredDonors.length / pageSize) || 1;
  const paginatedDonors = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredDonors.slice(start, start + pageSize);
  }, [filteredDonors, currentPage, pageSize]);

  // Summary counts
  const completeCount = donors.filter((d) => d.has_completed_profile).length;
  const incompleteCount = donors.length - completeCount;

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-surface-900">Manage Donors</h1>
        <p className="text-surface-500 mt-1">View, search, and manage registered donors and profile completion</p>
      </div>

      {error && <Alert type="error" message={error} className="mb-6" />}

      {/* Summary KPI Badges */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-white p-4 rounded-xl border border-surface-200 flex items-center justify-between">
          <span className="text-sm font-medium text-surface-600">Total Registered Donors</span>
          <span className="text-xl font-bold text-surface-900">{donors.length}</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-surface-200 flex items-center justify-between">
          <span className="text-sm font-medium text-emerald-700">Complete Profiles</span>
          <span className="text-xl font-bold text-emerald-700">{completeCount}</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-surface-200 flex items-center justify-between">
          <span className="text-sm font-medium text-amber-700">Incomplete Profiles</span>
          <span className="text-xl font-bold text-amber-700">{incompleteCount}</span>
        </div>
      </div>

      {/* Controls: Search and Filters */}
      <div className="bg-white rounded-xl border border-surface-200 p-4 mb-6 flex flex-col md:flex-row gap-4 justify-between items-center">
        {/* Search Input */}
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-surface-400" />
          <input
            type="text"
            placeholder="Search by name, email, phone, or city..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pl-9 pr-4 py-2 border border-surface-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2 w-full md:w-auto items-center">
          {/* Profile Filter Tabs */}
          <div className="flex bg-surface-100 p-1 rounded-lg">
            <button
              onClick={() => { setProfileFilter('all'); setCurrentPage(1); }}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                profileFilter === 'all' ? 'bg-white text-surface-900 shadow-sm' : 'text-surface-600 hover:text-surface-900'
              }`}
            >
              All ({donors.length})
            </button>
            <button
              onClick={() => { setProfileFilter('complete'); setCurrentPage(1); }}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                profileFilter === 'complete' ? 'bg-white text-emerald-700 shadow-sm' : 'text-surface-600 hover:text-surface-900'
              }`}
            >
              Complete ({completeCount})
            </button>
            <button
              onClick={() => { setProfileFilter('incomplete'); setCurrentPage(1); }}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                profileFilter === 'incomplete' ? 'bg-white text-amber-700 shadow-sm' : 'text-surface-600 hover:text-surface-900'
              }`}
            >
              Incomplete ({incompleteCount})
            </button>
          </div>

          {/* Blood Group Select */}
          <select
            value={bloodGroupFilter}
            onChange={(e) => { setBloodGroupFilter(e.target.value); setCurrentPage(1); }}
            className="border border-surface-300 rounded-lg px-3 py-1.5 text-xs text-surface-700 bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="all">All Blood Groups</option>
            {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((bg) => (
              <option key={bg} value={bg}>{bg}</option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Spinner /></div>
      ) : filteredDonors.length === 0 ? (
        <EmptyState
          icon={Droplets}
          title="No donors match filters"
          description="Try adjusting your search criteria or filter options."
        />
      ) : (
        <div className="bg-white rounded-xl border border-surface-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-surface-600">
              <thead className="bg-surface-50 text-surface-500 text-xs uppercase font-semibold">
                <tr>
                  <th className="px-6 py-4">Donor Contact</th>
                  <th className="px-6 py-4">Blood Group</th>
                  <th className="px-6 py-4">Location</th>
                  <th className="px-6 py-4">Profile Status</th>
                  <th className="px-6 py-4">Availability</th>
                  <th className="px-6 py-4">Account</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-200">
                {paginatedDonors.map((donor) => (
                  <tr key={donor.id} className="hover:bg-surface-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center font-bold text-xs shrink-0">
                          {donor.full_name ? donor.full_name.charAt(0).toUpperCase() : 'D'}
                        </div>
                        <div>
                          <div className="font-medium text-surface-900">{donor.full_name}</div>
                          <div className="text-xs text-surface-500 flex items-center gap-1">
                            <Mail className="w-3 h-3 text-surface-400" /> {donor.email}
                          </div>
                          {donor.phone && (
                            <div className="text-xs text-surface-500 flex items-center gap-1 mt-0.5">
                              <Phone className="w-3 h-3 text-surface-400" /> {donor.phone}
                            </div>
                          )}
                          <div className="text-[10px] text-surface-400 mt-0.5">User ID #{donor.user_id}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {donor.blood_group ? (
                        <Badge color="primary">{donor.blood_group}</Badge>
                      ) : (
                        <span className="text-xs text-surface-400 italic">Not set</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {donor.city ? (
                        <div>
                          <span className="font-medium text-surface-800">{donor.city}</span>
                          {donor.state && <span className="text-xs text-surface-400">, {donor.state}</span>}
                        </div>
                      ) : (
                        <span className="text-xs text-surface-400 italic">Not specified</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {donor.has_completed_profile ? (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Complete
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">
                          <AlertCircle className="w-3.5 h-3.5" /> Incomplete
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <Badge color={donor.is_available ? 'success' : 'surface'}>
                        {donor.is_available ? 'Available' : 'Unavailable'}
                      </Badge>
                    </td>
                    <td className="px-6 py-4">
                      <Badge color={donor.is_active ? 'success' : 'error'}>
                        {donor.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          {totalPages > 1 && (
            <div className="px-6 py-4 bg-surface-50 border-t border-surface-200 flex items-center justify-between">
              <span className="text-xs text-surface-500">
                Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, filteredDonors.length)} of {filteredDonors.length} donors
              </span>
              <div className="flex gap-1">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1 text-xs font-medium rounded border border-surface-300 bg-white text-surface-700 disabled:opacity-50 hover:bg-surface-50"
                >
                  Previous
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`px-3 py-1 text-xs font-medium rounded border ${
                      currentPage === page
                        ? 'border-primary-600 bg-primary-600 text-white'
                        : 'border-surface-300 bg-white text-surface-700 hover:bg-surface-50'
                    }`}
                  >
                    {page}
                  </button>
                ))}
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 text-xs font-medium rounded border border-surface-300 bg-white text-surface-700 disabled:opacity-50 hover:bg-surface-50"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
