import { useState, useEffect } from 'react';
import { Activity, Calendar, MapPin, User } from 'lucide-react';
import adminService from '../../services/adminService';
import Spinner from '../../components/ui/Spinner';
import Alert from '../../components/ui/Alert';
import EmptyState from '../../components/ui/EmptyState';
import Badge from '../../components/ui/Badge';
import StatusBadge from '../../components/ui/StatusBadge';

export default function ManageDonations() {
  const [donations, setDonations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchDonations();
  }, []);

  const fetchDonations = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await adminService.getDonations();
      setDonations(res.data);
    } catch (err) {
      setError('Failed to fetch donations. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-surface-900">Manage Donations</h1>
        <p className="text-surface-500 mt-1">View and verify donation records</p>
      </div>

      {error && <Alert type="error" message={error} className="mb-6" />}

      {loading ? (
        <div className="flex justify-center py-12"><Spinner /></div>
      ) : donations.length === 0 ? (
        <EmptyState icon={Activity} title="No donations found" description="There are no completed or pending donations in the system." />
      ) : (
        <div className="bg-white rounded-xl border border-surface-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-surface-600">
              <thead className="bg-surface-50 text-surface-500 text-xs uppercase font-semibold">
                <tr>
                  <th className="px-6 py-4">ID</th>
                  <th className="px-6 py-4">Donor / Request</th>
                  <th className="px-6 py-4">Blood Group</th>
                  <th className="px-6 py-4">Hospital / Date</th>
                  <th className="px-6 py-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-200">
                {donations.map(donation => (
                  <tr key={donation.id} className="hover:bg-surface-50 transition-colors">
                    <td className="px-6 py-4 font-medium text-surface-900">#{donation.id}</td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-medium text-surface-900 flex items-center gap-1">
                          <User className="w-3 h-3 text-surface-400" /> Donor #{donation.donor_id}
                        </span>
                        <span className="text-xs text-surface-500">Req #{donation.request_id}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <Badge color="primary">{donation.blood_group}</Badge>
                      <span className="ml-2 text-xs text-surface-500">{donation.units_donated} Units</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {donation.hospital_name}</span>
                        <span className="text-xs text-surface-500 flex items-center gap-1 mt-1"><Calendar className="w-3 h-3" /> {new Date(donation.donation_date).toLocaleDateString()}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={donation.status} />
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
