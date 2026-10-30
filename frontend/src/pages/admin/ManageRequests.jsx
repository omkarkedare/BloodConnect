import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ClipboardList, AlertTriangle } from 'lucide-react';
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
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await adminService.getRequests();
      setRequests(res.data || []);
    } catch (err) {
      setError('Failed to fetch blood requests. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  // Determine active tab from URL search parameters
  const currentTab = useMemo(() => {
    const urgency = searchParams.get('urgency');
    const status = searchParams.get('status');

    if (urgency === 'emergency' || urgency === 'urgent' || urgency === 'critical') {
      return 'emergency';
    }
    if (['open', 'fulfilled', 'expired', 'cancelled'].includes(status)) {
      return status;
    }
    return 'all';
  }, [searchParams]);

  const handleTabChange = (tabId) => {
    if (tabId === 'emergency') {
      setSearchParams({ urgency: 'emergency' });
    } else if (tabId === 'all') {
      setSearchParams({});
    } else {
      setSearchParams({ status: tabId });
    }
  };

  // Metrics for tabs matching backend counters exactly
  const emergencyCount = useMemo(() => {
    return requests.filter(
      r => ['urgent', 'critical'].includes((r.urgency || '').toLowerCase()) &&
           ['open', 'in_progress'].includes((r.status || '').toLowerCase())
    ).length;
  }, [requests]);

  const openCount = useMemo(() => {
    return requests.filter(
      r => ['open', 'in_progress'].includes((r.status || '').toLowerCase())
    ).length;
  }, [requests]);

  const fulfilledCount = useMemo(() => {
    return requests.filter(r => (r.status || '').toLowerCase() === 'fulfilled').length;
  }, [requests]);

  const expiredCount = useMemo(() => {
    return requests.filter(r => (r.status || '').toLowerCase() === 'expired').length;
  }, [requests]);

  const cancelledCount = useMemo(() => {
    return requests.filter(r => (r.status || '').toLowerCase() === 'cancelled').length;
  }, [requests]);

  const filteredRequests = useMemo(() => {
    switch (currentTab) {
      case 'emergency':
        return requests.filter(
          r => ['urgent', 'critical'].includes((r.urgency || '').toLowerCase()) &&
               ['open', 'in_progress'].includes((r.status || '').toLowerCase())
        );
      case 'open':
        return requests.filter(r => ['open', 'in_progress'].includes((r.status || '').toLowerCase()));
      case 'fulfilled':
        return requests.filter(r => (r.status || '').toLowerCase() === 'fulfilled');
      case 'expired':
        return requests.filter(r => (r.status || '').toLowerCase() === 'expired');
      case 'cancelled':
        return requests.filter(r => (r.status || '').toLowerCase() === 'cancelled');
      case 'all':
      default:
        return requests;
    }
  }, [requests, currentTab]);

  const renderUrgencyBadge = (urgency) => {
    const norm = (urgency || 'normal').toLowerCase();
    if (norm === 'critical') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-600 animate-pulse" />
          Critical
        </span>
      );
    }
    if (norm === 'urgent') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-600" />
          Urgent
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-surface-100 text-surface-600">
        Normal
      </span>
    );
  };

  const tabs = [
    { 
      id: 'all', 
      label: `All (${requests.length})`, 
      isEmergency: false 
    },
    { 
      id: 'emergency', 
      label: `🚨 Critical & Urgent (${emergencyCount})`, 
      isEmergency: true 
    },
    { 
      id: 'open', 
      label: `Active / Open (${openCount})`, 
      isEmergency: false 
    },
    { 
      id: 'fulfilled', 
      label: `Fulfilled (${fulfilledCount})`, 
      isEmergency: false 
    },
    { 
      id: 'expired', 
      label: `Expired (${expiredCount})`, 
      isEmergency: false 
    },
    { 
      id: 'cancelled', 
      label: `Cancelled (${cancelledCount})`, 
      isEmergency: false 
    },
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-surface-900 tracking-tight">Manage Requests</h1>
        <p className="text-surface-500 text-sm mt-1">Oversee blood requests, emergency triage, and regional requirements</p>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {tabs.map((tab) => {
          const isActive = currentTab === tab.id;
          let btnClasses = 'px-4 py-2 rounded-lg text-sm font-semibold transition-colors cursor-pointer ';
          
          if (tab.isEmergency) {
            btnClasses += isActive 
              ? 'bg-rose-600 text-white shadow-xs' 
              : 'bg-rose-50 text-rose-800 border border-rose-200 hover:bg-rose-100';
          } else {
            btnClasses += isActive 
              ? 'bg-primary-600 text-white shadow-xs' 
              : 'bg-surface-100 text-surface-600 hover:bg-surface-200';
          }

          return (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={btnClasses}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Emergency Active Notification Banner */}
      {currentTab === 'emergency' && (
        <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-rose-900 shadow-2xs">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
            <div>
              <span className="font-bold">Emergency Triage Filter Active:</span> Displaying {emergencyCount} active blood requests flagged with Urgent or Critical triage priority.
            </div>
          </div>
          <button
            onClick={() => handleTabChange('all')}
            className="text-xs font-bold text-rose-700 hover:text-rose-900 underline self-start sm:self-auto cursor-pointer"
          >
            Clear Triage Filter
          </button>
        </div>
      )}

      {error && <Alert type="error" message={error} className="mb-6" />}

      {loading ? (
        <div className="flex justify-center py-12"><Spinner /></div>
      ) : filteredRequests.length === 0 ? (
        <EmptyState 
          icon={ClipboardList} 
          title={currentTab === 'emergency' ? "No Emergency Requests Active" : "No requests found"} 
          description={
            currentTab === 'emergency' 
              ? 'There are currently no active critical or urgent blood requests in the emergency network.' 
              : currentTab === 'all' 
              ? 'There are no blood requests in the system.' 
              : `No ${currentTab} requests found.`
          } 
        />
      ) : (
        <div className="bg-white rounded-xl border border-surface-200 overflow-hidden shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-surface-600">
              <thead className="bg-surface-50 text-surface-500 text-xs uppercase font-semibold">
                <tr>
                  <th className="px-6 py-4">ID</th>
                  <th className="px-6 py-4">Patient</th>
                  <th className="px-6 py-4">Blood Group</th>
                  <th className="px-6 py-4">Urgency</th>
                  <th className="px-6 py-4">Location</th>
                  <th className="px-6 py-4">Expires</th>
                  <th className="px-6 py-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-200">
                {filteredRequests.map(request => (
                  <tr key={request.id} className="hover:bg-surface-50 transition-colors">
                    <td className="px-6 py-4 font-bold text-surface-900">#{request.id}</td>
                    <td className="px-6 py-4 font-medium text-surface-900">{request.patient_name}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Badge color="primary">{request.blood_group}</Badge>
                        <span className="text-xs text-surface-500 font-medium">{request.units_needed} Units</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {renderUrgencyBadge(request.urgency)}
                    </td>
                    <td className="px-6 py-4 text-surface-600">
                      <div className="font-medium text-surface-800">{request.hospital_name}</div>
                      <div className="text-xs text-surface-400">{request.city}</div>
                    </td>
                    <td className="px-6 py-4 text-xs text-surface-500">
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
