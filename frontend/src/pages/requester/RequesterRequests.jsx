import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ClipboardList, Calendar, MapPin, Activity, Clock, ChevronDown, ChevronUp } from 'lucide-react';
import requestService from '../../services/requestService';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import StatusBadge from '../../components/ui/StatusBadge';
import Spinner from '../../components/ui/Spinner';
import EmptyState from '../../components/ui/EmptyState';
import Alert from '../../components/ui/Alert';

function RequestCard({ request }) {
  return (
    <Card className="flex flex-col">
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
          <div className="flex flex-col">
            <span className="text-xs text-surface-400 font-semibold uppercase tracking-wider">Blood Needed At</span>
            <span className="text-surface-700 font-medium">
              {request.hospital_name}, {request.city}
            </span>
          </div>
        </div>
        {request.expires_at && (
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-surface-400" />
            <div className="flex flex-col">
              <span className="text-xs text-surface-400 font-semibold uppercase tracking-wider">Blood Needed By</span>
              <span className={`font-medium ${request.status === 'expired' ? 'text-red-600' : 'text-surface-700'}`}>
                {new Date(request.expires_at).toLocaleString()}
              </span>
            </div>
          </div>
        )}
        {!request.expires_at && (
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-surface-400" />
            <span>Needed by: {new Date(request.required_date).toLocaleDateString()}</span>
          </div>
        )}
      </div>
      <div className="mt-auto pt-4 border-t border-surface-200">
        <Link to={`/requester/requests/${request.id}`} className="text-primary-600 hover:text-primary-700 text-sm font-medium flex items-center justify-center w-full">
          View Details & Responses
        </Link>
      </div>
    </Card>
  );
}

export default function RequesterRequests() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showExpired, setShowExpired] = useState(false);

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

  const activeRequests = requests.filter(r => r.status !== 'expired');
  const expiredRequests = requests.filter(r => r.status === 'expired');

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
        <div className="space-y-8">
          {/* Active Requests */}
          <div>
            <h2 className="text-lg font-semibold text-surface-800 mb-4">
              Active Requests ({activeRequests.length})
            </h2>
            {activeRequests.length === 0 ? (
              <p className="text-surface-500 text-sm">No active requests.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {activeRequests.map((request) => (
                  <RequestCard key={request.id} request={request} />
                ))}
              </div>
            )}
          </div>

          {/* Expired Requests — Collapsible */}
          {expiredRequests.length > 0 && (
            <div>
              <button
                onClick={() => setShowExpired(!showExpired)}
                className="flex items-center gap-2 text-lg font-semibold text-surface-600 hover:text-surface-800 transition-colors cursor-pointer"
              >
                Expired Requests ({expiredRequests.length})
                {showExpired ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
              </button>
              {showExpired && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-4">
                  {expiredRequests.map((request) => (
                    <RequestCard key={request.id} request={request} />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
