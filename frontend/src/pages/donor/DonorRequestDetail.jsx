import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FileText, MapPin, Calendar, Activity, CheckCircle } from 'lucide-react';
import requestService from '../../services/requestService';
import responseService from '../../services/responseService';
import donationService from '../../services/donationService';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import StatusBadge from '../../components/ui/StatusBadge';
import Spinner from '../../components/ui/Spinner';
import Alert from '../../components/ui/Alert';
import Button from '../../components/ui/Button';
import Textarea from '../../components/forms/Textarea';

export default function DonorRequestDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [request, setRequest] = useState(null);
  const [existingResponse, setExistingResponse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const reqRes = await requestService.getRequest(id);
      setRequest(reqRes.data);

      const respRes = await responseService.getMyResponses();
      const match = respRes.data.find(r => r.request_id === parseInt(id, 10));
      if (match) setExistingResponse(match);

    } catch (err) {
      setError('Failed to fetch request details.');
    } finally {
      setLoading(false);
    }
  };

  const handleRespond = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      setError(null);
      await responseService.respondToRequest(id, { message });
      setSuccess(true);
      fetchData(); // Refresh to show response
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to submit response.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleFinalizeDonation = async () => {
    try {
      setSubmitting(true);
      setError(null);
      await donationService.createDonation({
        donor_id: existingResponse.donor_id,
        request_id: request.id,
        blood_group: request.blood_group,
        units_donated: request.units_needed || 1,
        donation_date: new Date().toISOString().split('T')[0],
        hospital_name: request.hospital_name,
        notes: "Donation finalized via platform."
      });
      setSuccess(true);
      fetchData();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to finalize donation.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="flex justify-center py-12"><Spinner /></div>;
  if (error && !request) return <Alert type="error" message={error} className="m-6" />;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-2xl font-bold text-surface-900">Request Details</h1>
          <p className="text-surface-500 mt-1">Review request info and submit your response</p>
        </div>
        <StatusBadge status={request.status} />
      </div>

      {success && <Alert type="success" message="Your response has been sent to the requester!" className="mb-6" />}
      {error && request && <Alert type="error" message={error} className="mb-6" />}

      <Card className="p-6">
        <div className="flex items-start gap-4 mb-6 pb-6 border-b border-surface-200">
          <div className="w-12 h-12 rounded-full bg-primary-100 flex items-center justify-center">
            <FileText className="w-6 h-6 text-primary-600" />
          </div>
          <div className="flex-1">
            <div className="flex justify-between">
              <h2 className="text-xl font-bold text-surface-900">Patient: {request.patient_name}</h2>
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
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-sm mb-6 pb-6 border-b border-surface-200">
          <div>
            <h4 className="font-semibold text-surface-700 mb-2">Hospital & Location</h4>
            <div className="flex items-start gap-2 text-surface-600">
              <MapPin className="w-4 h-4 mt-0.5 text-surface-400" />
              <div>
                <p>{request.hospital_name}</p>
                <p>{request.hospital_address}</p>
                <p>{request.city}</p>
              </div>
            </div>
          </div>
          <div>
            <h4 className="font-semibold text-surface-700 mb-2">Timeline</h4>
            <div className="flex items-center gap-2 text-surface-600 mb-2">
              <Calendar className="w-4 h-4 text-surface-400" />
              <span>Needed by: {new Date(request.required_date).toLocaleDateString()}</span>
            </div>
          </div>
        </div>
        
        {request.description && (
          <div className="mb-6 text-sm">
            <h4 className="font-semibold text-surface-700 mb-2">Additional Information</h4>
            <p className="text-surface-600">{request.description}</p>
          </div>
        )}
      </Card>

      <Card className="p-6">
        <h3 className="text-lg font-bold text-surface-900 mb-4">Your Response</h3>
        
        {existingResponse ? (
          <div className="bg-surface-50 p-4 rounded-lg border border-surface-200">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm font-medium text-surface-700">Status:</span>
              <StatusBadge status={existingResponse.status === 'accepted' ? 'confirmed' : existingResponse.status} />
            </div>
            <p className="text-sm text-surface-600 mb-4">
              <span className="font-medium text-surface-700">Your Message: </span>
              {existingResponse.message || 'No message provided.'}
            </p>
            {existingResponse.status === 'accepted' && request.status !== 'fulfilled' && (
              <div className="mt-4 pt-4 border-t border-surface-200">
                <Alert type="success" message="The requester has confirmed you as the donor! Please proceed to the hospital to donate." className="mb-4" />
                <Button onClick={handleFinalizeDonation} isLoading={submitting} icon={CheckCircle}>
                  Finalize Donation (Mark Completed)
                </Button>
              </div>
            )}
            {request.status === 'fulfilled' && (
              <div className="mt-4 pt-4 border-t border-surface-200">
                <Alert type="success" message="This blood request is now completely fulfilled. Thank you for your life-saving donation!" />
              </div>
            )}
          </div>
        ) : request.status !== 'open' ? (
          <Alert type="info" message="This request is no longer accepting new responses." />
        ) : (
          <form onSubmit={handleRespond}>
            <Textarea 
              label="Message to Requester (Optional)" 
              placeholder="Let them know when you can reach the hospital, etc."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
              className="mb-4"
            />
            <Button type="submit" isLoading={submitting} className="w-full sm:w-auto" icon={CheckCircle}>
              Respond / Accept Request
            </Button>
          </form>
        )}
      </Card>
    </div>
  );
}
