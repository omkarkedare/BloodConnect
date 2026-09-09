import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { FileText, MapPin, Calendar, Activity, Check, X, Users, AlertCircle, Clock } from 'lucide-react';
import requestService from '../../services/requestService';
import responseService from '../../services/responseService';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import StatusBadge from '../../components/ui/StatusBadge';
import Spinner from '../../components/ui/Spinner';
import Alert from '../../components/ui/Alert';
import EmptyState from '../../components/ui/EmptyState';
import Button from '../../components/ui/Button';

export default function RequesterRequestDetail() {
  const { id } = useParams();
  const [request, setRequest] = useState(null);
  const [matches, setMatches] = useState([]);
  const [responses, setResponses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const reqRes = await requestService.getRequest(id);
      setRequest(reqRes.data);

      const [matchRes, respRes] = await Promise.all([
        requestService.getMatches(id).catch(() => ({ data: [] })),
        requestService.getResponses(id).catch(() => ({ data: [] }))
      ]);

      setMatches(matchRes.data);
      setResponses(respRes.data);
    } catch (err) {
      setError('Failed to fetch request details.');
    } finally {
      setLoading(false);
    }
  };

  const handleResponseAction = async (responseId, status) => {
    try {
      await responseService.updateResponse(responseId, { status });
      fetchData(); // Refresh data
    } catch (err) {
      alert('Failed to update response.');
    }
  };

  if (loading) return <div className="flex justify-center py-12"><Spinner /></div>;
  if (error || !request) return <Alert type="error" message={error || 'Request not found'} />;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-2xl font-bold text-surface-900">Request Details</h1>
          <p className="text-surface-500 mt-1">Review request info, matches, and responses</p>
        </div>
        <StatusBadge status={request.status} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card className="p-6">
            <div className="flex items-start gap-4 mb-6 pb-6 border-b border-surface-200">
              <div className="w-12 h-12 rounded-full bg-primary-100 flex items-center justify-center">
                <FileText className="w-6 h-6 text-primary-600" />
              </div>
              <div className="flex-1">
                <div className="flex justify-between">
                  <h2 className="text-xl font-bold text-surface-900">{request.patient_name}</h2>
                  <Badge color="primary">{request.blood_group}</Badge>
                </div>
                <div className="flex items-center gap-2 mt-2 text-surface-600 text-sm">
                  <Activity className="w-4 h-4" />
                  <span className="capitalize">Urgency: {request.urgency}</span>
                  <span className="mx-2">•</span>
                  <span>{request.units_needed} Units Needed</span>
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-sm">
              <div>
                <h4 className="font-semibold text-surface-400 text-xs uppercase tracking-wider mb-2">Blood Needed At</h4>
                <div className="flex items-start gap-2 text-surface-700 font-medium">
                  <MapPin className="w-4 h-4 mt-0.5 text-surface-400" />
                  <div>
                    <p>{request.hospital_name}</p>
                    {request.hospital_address && <p className="text-surface-600 font-normal">{request.hospital_address}</p>}
                    <p>{request.city}</p>
                  </div>
                </div>
              </div>
              <div>
                <h4 className="font-semibold text-surface-700 mb-2">Timeline & Contact</h4>
                {request.expires_at && (
                  <div className="flex items-center gap-2 text-surface-600 mb-2">
                    <Clock className="w-4 h-4 text-surface-400" />
                    <div>
                      <span className="text-xs text-surface-400 font-semibold uppercase tracking-wider block">Blood Needed By</span>
                      <span className={`font-medium ${request.status === 'expired' ? 'text-red-600' : 'text-surface-700'}`}>
                        {new Date(request.expires_at).toLocaleString()}
                      </span>
                    </div>
                  </div>
                )}
                <div className="flex items-center gap-2 text-surface-600 mb-2">
                  <Calendar className="w-4 h-4 text-surface-400" />
                  <span>Required date: {new Date(request.required_date).toLocaleDateString()}</span>
                </div>
                <div className="text-surface-600">
                  <span className="font-medium">Phone:</span> {request.contact_phone}
                </div>
              </div>
            </div>
            {request.description && (
              <div className="mt-6 pt-6 border-t border-surface-200 text-sm">
                <h4 className="font-semibold text-surface-700 mb-2">Additional Information</h4>
                <p className="text-surface-600">{request.description}</p>
              </div>
            )}
          </Card>

          <Card className="p-6">
            <h3 className="text-lg font-bold text-surface-900 mb-4 flex items-center gap-2">
              <Users className="w-5 h-5 text-primary-500" /> Donor Responses
            </h3>
            {responses.length === 0 ? (
              <EmptyState icon={AlertCircle} title="No responses yet" description="Waiting for donors to respond to this request." />
            ) : (
              <div className="space-y-4">
                {responses.map(resp => (
                  <div key={resp.id} className="p-4 rounded-lg border border-surface-200 bg-surface-50 flex flex-col gap-4">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold text-surface-900">{resp.donor?.full_name || `Donor #${resp.donor_id}`}</h4>
                          {resp.donor?.donor_profile && <Badge color="primary">{resp.donor.donor_profile.blood_group}</Badge>}
                          <Link to={`/requester/donors/${resp.donor_id}`} className="text-xs text-primary-600 hover:underline ml-2">
                            View Details
                          </Link>
                        </div>
                        <div className="text-sm text-surface-600 mt-1 flex flex-wrap gap-x-4 items-center">
                          {resp.donor?.donor_profile && <span><MapPin className="w-3 h-3 inline mr-1"/>{resp.donor.donor_profile.city}</span>}
                          {resp.donor?.donor_profile && (
                            <span className={resp.donor.donor_profile.is_available ? 'text-success-600' : 'text-surface-500'}>
                              {resp.donor.donor_profile.is_available ? 'Available' : 'Unavailable'}
                            </span>
                          )}
                          <span>Responded: {new Date(resp.responded_at).toLocaleDateString()}</span>
                        </div>
                        {resp.message && <p className="text-sm text-surface-700 mt-2 italic">"{resp.message}"</p>}
                        <div className="mt-3">
                          <StatusBadge status={resp.status === 'accepted' ? 'confirmed' : resp.status} />
                        </div>
                      </div>
                      
                      {resp.status === 'pending' && request.status === 'open' && (
                        <div className="flex gap-2 w-full sm:w-auto">
                          <Button variant="outline" size="sm" onClick={() => handleResponseAction(resp.id, 'rejected')} className="flex-1">Reject</Button>
                          <Button size="sm" onClick={() => handleResponseAction(resp.id, 'accepted')} className="flex-1">Accept Donor</Button>
                        </div>
                      )}
                      {resp.status === 'accepted' && (
                        <div className="flex gap-2 w-full sm:w-auto">
                           <span className="text-sm font-semibold text-success-600 flex items-center"><Check className="w-4 h-4 mr-1"/> Donor Confirmed</span>
                        </div>
                      )}
                    </div>
                    
                    {resp.status === 'accepted' && resp.donor && (
                      <div className="mt-2 pt-4 border-t border-surface-200">
                        <h5 className="text-sm font-semibold text-surface-900 mb-2">Contact Details</h5>
                        <div className="flex flex-wrap gap-4">
                          <a href={`tel:${resp.donor.phone}`} className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium rounded-lg bg-primary-50 text-primary-700 hover:bg-primary-100 transition-colors">
                            Call Donor: {resp.donor.phone || 'N/A'}
                          </a>
                          <a href={`mailto:${resp.donor.email}`} className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium rounded-lg bg-surface-100 text-surface-700 hover:bg-surface-200 transition-colors">
                            Email Donor
                          </a>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        <div>
          <Card className="p-6">
            <h3 className="text-lg font-bold text-surface-900 mb-4 flex items-center gap-2">
              <Activity className="w-5 h-5 text-success-500" /> Eligible Matches
            </h3>
            {matches.length === 0 ? (
              <p className="text-sm text-surface-500 text-center py-4">No currently available matching donors found.</p>
            ) : (
              <div className="space-y-3">
                {matches.map(match => (
                  <div key={match.id} className="p-3 rounded-lg border border-surface-200 flex justify-between items-center">
                    <div>
                      <span className="font-medium text-surface-900 block">Donor #{match.user_id}</span>
                      <span className="text-xs text-surface-500">{match.city}</span>
                    </div>
                    <Badge color="primary">{match.blood_group}</Badge>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
