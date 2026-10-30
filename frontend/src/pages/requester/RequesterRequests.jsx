import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ClipboardList, Calendar, MapPin, Activity, Clock, PlusCircle } from 'lucide-react';
import requestService from '../../services/requestService';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import StatusBadge from '../../components/ui/StatusBadge';
import Button from '../../components/ui/Button';
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
        <div className="flex flex-col items-end gap-1">
          <StatusBadge status={(request.display_status || request.status).toLowerCase()} />
          {request.required_units > 1 && (request.display_status === 'PARTIALLY_VERIFIED' || request.display_status === 'VERIFIED') && (
            <span className="text-xs font-medium text-surface-500">
              {request.verified_units}/{request.required_units} Units Verified
            </span>
          )}
        </div>
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
        {request.expires_at ? (
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-surface-400" />
            <div className="flex flex-col">
              <span className="text-xs text-surface-400 font-semibold uppercase tracking-wider">Blood Needed By</span>
              <span className={`font-medium ${request.status === 'expired' ? 'text-red-600' : 'text-surface-700'}`}>
                {new Date(request.expires_at).toLocaleString()}
              </span>
            </div>
          </div>
        ) : (
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
  const [searchParams, setSearchParams] = useSearchParams();

  const currentFilter = searchParams.get('status') || 'all';

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await requestService.getRequests();
      setRequests(res.data);
    } catch {
      setError('Failed to fetch blood requests. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (status) => {
    if (status === 'all') {
      searchParams.delete('status');
      setSearchParams(searchParams);
    } else {
      setSearchParams({ status });
    }
  };

  // Filter requests based on selected tab
  const filteredRequests = requests.filter(r => {
    const rawStatus = (r.status || '').toLowerCase();
    const dispStatus = (r.display_status || '').toLowerCase();

    if (currentFilter === 'open') {
      return rawStatus === 'open';
    }
    if (currentFilter === 'fulfilled') {
      return rawStatus === 'fulfilled';
    }
    if (currentFilter === 'verified') {
      return dispStatus === 'verified' || dispStatus === 'partially_verified';
    }
    if (currentFilter === 'expired') {
      return rawStatus === 'expired';
    }
    return true; // 'all'
  });

  const countAll = requests.length;
  const countOpen = requests.filter(r => (r.status || '').toLowerCase() === 'open').length;
  const countFulfilled = requests.filter(r => (r.status || '').toLowerCase() === 'fulfilled').length;
  const countVerified = requests.filter(r => {
    const d = (r.display_status || '').toLowerCase();
    return d === 'verified' || d === 'partially_verified';
  }).length;
  const countExpired = requests.filter(r => (r.status || '').toLowerCase() === 'expired').length;

  return (
    <div>
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-surface-900">My Requests</h1>
          <p className="text-surface-500 mt-1">View, filter, and manage your emergency blood requests</p>
        </div>
        <Link to="/requester/create-request">
          <Button variant="primary" size="sm" icon={PlusCircle}>
            Create Blood Request
          </Button>
        </Link>
      </div>

      {error && <Alert type="error" message={error} className="mb-6" />}

      {/* Filter Tabs */}
      <div className="border-b border-surface-200 mb-6">
        <nav className="flex space-x-6 overflow-x-auto pb-px">
          {[
            { id: 'all', label: 'All Requests', count: countAll },
            { id: 'open', label: 'Open / Active', count: countOpen },
            { id: 'fulfilled', label: 'Fulfilled', count: countFulfilled },
            { id: 'verified', label: 'Verified Donations', count: countVerified },
            { id: 'expired', label: 'Expired', count: countExpired },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`pb-3 text-sm font-semibold transition-colors cursor-pointer whitespace-nowrap flex items-center gap-2 relative ${
                currentFilter === tab.id
                  ? 'text-primary-600 border-b-2 border-primary-600'
                  : 'text-surface-500 hover:text-surface-800'
              }`}
            >
              {tab.label}
              <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                currentFilter === tab.id
                  ? 'bg-primary-100 text-primary-700'
                  : 'bg-surface-100 text-surface-600'
              }`}>
                {tab.count}
              </span>
            </button>
          ))}
        </nav>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Spinner />
        </div>
      ) : filteredRequests.length === 0 ? (
        <EmptyState 
          icon={ClipboardList}
          title={`No ${currentFilter === 'all' ? '' : currentFilter + ' '}requests found`}
          description={
            currentFilter === 'all' 
              ? "You haven't created any blood requests yet."
              : `There are currently no blood requests in the "${currentFilter}" category.`
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredRequests.map((request) => (
            <RequestCard key={request.id} request={request} />
          ))}
        </div>
      )}
    </div>
  );
}
