import { useState, useEffect } from 'react';
import { ClipboardList, Calendar, MapPin, Activity } from 'lucide-react';
import requestService from '../../services/requestService';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import StatusBadge from '../../components/ui/StatusBadge';
import Spinner from '../../components/ui/Spinner';
import EmptyState from '../../components/ui/EmptyState';
import Alert from '../../components/ui/Alert';

export default function RequesterRequests() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await requestService.getRequests();
      setRequests(res.data);
    } catch (err) {
      setError('Failed to fetch blood requests. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-surface-900">My Requests</h1>
        <p className="text-surface-500 mt-1">View and manage your blood requests</p>
      </div>

      {error && <Alert type="error" message={error} className="mb-6" />}

      {loading ? (
        <div className="flex justify-center py-12">
          <Spinner />
        </div>
      ) : requests.length === 0 ? (
        <EmptyState 
          icon={ClipboardList}
          title="No requests found"
          description="You haven't created any blood requests yet."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {requests.map((request) => (
            <Card key={request.id} className="flex flex-col">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-surface-900">{request.patient_name}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge color="primary">{request.blood_group}</Badge>
                    <span className="text-sm font-medium text-surface-600">{request.units_needed} Units</span>
                  </div>
                </div>
                <StatusBadge status={request.status} />
              </div>
              <div className="space-y-3 mb-6 flex-1 text-sm text-surface-600">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-surface-400" />
                  <span className="capitalize text-surface-700 font-medium">Urgency: {request.urgency}</span>
                </div>
                <div className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-surface-400 mt-0.5" />
                  <span>
                    {request.hospital_name}
                    <br />
                    {request.city}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-surface-400" />
                  <span>Needed by: {new Date(request.required_date).toLocaleDateString()}</span>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
