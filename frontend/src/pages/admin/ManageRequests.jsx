import { useState, useEffect } from 'react';
import { ClipboardList, Activity } from 'lucide-react';
import adminService from '../../services/adminService';
import Spinner from '../../components/ui/Spinner';
import Alert from '../../components/ui/Alert';
import EmptyState from '../../components/ui/EmptyState';
import Badge from '../../components/ui/Badge';
import StatusBadge from '../../components/ui/StatusBadge';

export default function ManageRequests() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await adminService.getRequests();
      setRequests(res.data);
    } catch (err) {
      setError('Failed to fetch blood requests. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const filteredRequests = filterStatus === 'all'
    ? requests
    : requests.filter(r => r.status === filterStatus);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-surface-900">Manage Requests</h1>
        <p className="text-surface-500 mt-1">Oversee all blood requests</p>
      </div>

      {/* Status Filter Tabs */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {['all', 'open', 'expired', 'fulfilled', 'cancelled'].map(status => (
          <button
            key={status}
            onClick={() => setFilterStatus(status)}
            className={`px-4 py-2 rounded-lg text-sm font-medium capitalize cursor-pointer transition-colors ${
              filterStatus === status
                ? 'bg-primary-600 text-white'
                : 'bg-surface-100 text-surface-600 hover:bg-surface-200'
            }`}
          >
            {status === 'all' ? `All (${requests.length})` : `${status} (${requests.filter(r => r.status === status).length})`}
          </button>
        ))}
      </div>

      {error && <Alert type="error" message={error} className="mb-6" />}

      {loading ? (
        <div className="flex justify-center py-12"><Spinner /></div>
      ) : filteredRequests.length === 0 ? (
        <EmptyState icon={ClipboardList} title="No requests found" description={filterStatus === 'all' ? 'There are no blood requests in the system.' : `No ${filterStatus} requests.`} />
      ) : (
        <div className="bg-white rounded-xl border border-surface-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-surface-600">
              <thead className="bg-surface-50 text-surface-500 text-xs uppercase font-semibold">
                <tr>
                  <th className="px-6 py-4">ID</th>
                  <th className="px-6 py-4">Patient</th>
                  <th className="px-6 py-4">Blood Group</th>
                  <th className="px-6 py-4">Location</th>
                  <th className="px-6 py-4">Expires</th>
                  <th className="px-6 py-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-200">
                {filteredRequests.map(request => (
                  <tr key={request.id} className="hover:bg-surface-50 transition-colors">
                    <td className="px-6 py-4 font-medium text-surface-900">#{request.id}</td>
                    <td className="px-6 py-4">{request.patient_name}</td>
                    <td className="px-6 py-4">
                      <Badge color="primary">{request.blood_group}</Badge>
                      <span className="ml-2 text-xs text-surface-500">{request.units_needed} Units</span>
                    </td>
                    <td className="px-6 py-4">{request.hospital_name}, {request.city}</td>
                    <td className="px-6 py-4 text-xs">
                      {request.expires_at
                        ? new Date(request.expires_at).toLocaleString()
                        : <span className="text-surface-400">—</span>
                      }
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={request.status} />
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
