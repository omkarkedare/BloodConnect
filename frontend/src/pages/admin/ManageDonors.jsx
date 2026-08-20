import { useState, useEffect } from 'react';
import { Droplets, User } from 'lucide-react';
import adminService from '../../services/adminService';
import Spinner from '../../components/ui/Spinner';
import Alert from '../../components/ui/Alert';
import EmptyState from '../../components/ui/EmptyState';
import Badge from '../../components/ui/Badge';

export default function ManageDonors() {
  const [donors, setDonors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-surface-900">Manage Donors</h1>
        <p className="text-surface-500 mt-1">View and verify donor profiles</p>
      </div>

      {error && <Alert type="error" message={error} className="mb-6" />}

      {loading ? (
        <div className="flex justify-center py-12"><Spinner /></div>
      ) : donors.length === 0 ? (
        <EmptyState icon={Droplets} title="No donors found" description="There are no donor profiles registered in the system." />
      ) : (
        <div className="bg-white rounded-xl border border-surface-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-surface-600">
              <thead className="bg-surface-50 text-surface-500 text-xs uppercase font-semibold">
                <tr>
                  <th className="px-6 py-4">User ID</th>
                  <th className="px-6 py-4">Blood Group</th>
                  <th className="px-6 py-4">Location</th>
                  <th className="px-6 py-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-200">
                {donors.map(donor => (
                  <tr key={donor.id} className="hover:bg-surface-50 transition-colors">
                    <td className="px-6 py-4 font-medium text-surface-900 flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-surface-100 flex items-center justify-center">
                        <User className="w-4 h-4 text-surface-400" />
                      </div>
                      #{donor.user_id}
                    </td>
                    <td className="px-6 py-4">
                      <Badge color="primary">{donor.blood_group}</Badge>
                    </td>
                    <td className="px-6 py-4">{donor.city || 'N/A'}</td>
                    <td className="px-6 py-4">
                      <Badge color={donor.is_available ? 'success' : 'surface'}>
                        {donor.is_available ? 'Available' : 'Unavailable'}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
