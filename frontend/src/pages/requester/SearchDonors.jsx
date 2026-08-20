import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Droplets, User, Search, Activity } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import requestService from '../../services/requestService';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Spinner from '../../components/ui/Spinner';
import EmptyState from '../../components/ui/EmptyState';
import Alert from '../../components/ui/Alert';
import Select from '../../components/forms/Select';
import Button from '../../components/ui/Button';

export default function SearchDonors() {
  const { user } = useAuth();
  const [requests, setRequests] = useState([]);
  const [selectedRequest, setSelectedRequest] = useState('');
  const [donors, setDonors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchLoading, setSearchLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (user?.id) fetchRequests();
  }, [user]);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const res = await requestService.getRequests();
      const myActiveReqs = res.data.filter(r => r.requester_id === user.id && r.status === 'open');
      setRequests(myActiveReqs);
    } catch (err) {
      setError('Failed to fetch your requests.');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!selectedRequest) return;
    try {
      setSearchLoading(true);
      setError(null);
      const res = await requestService.getMatches(selectedRequest);
      setDonors(res.data);
    } catch (err) {
      setError('Failed to fetch matching donors.');
    } finally {
      setSearchLoading(false);
    }
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-surface-900">Find Matching Donors</h1>
        <p className="text-surface-500 mt-1">Select an active request to find eligible donors</p>
      </div>

      {error && <Alert type="error" message={error} className="mb-6" />}

      {loading ? (
        <div className="flex justify-center py-12"><Spinner /></div>
      ) : requests.length === 0 ? (
        <EmptyState icon={Activity} title="No active requests" description="You need an active blood request to find matching donors." />
      ) : (
        <>
          <Card className="p-6 mb-8 flex flex-col sm:flex-row gap-4 items-end">
            <div className="flex-1 w-full">
              <Select 
                label="Select Blood Request" 
                value={selectedRequest} 
                onChange={(e) => setSelectedRequest(e.target.value)}
                options={requests.map(r => ({ value: r.id, label: `${r.patient_name} (${r.blood_group}) - ${r.hospital_name}` }))}
              />
            </div>
            <Button onClick={handleSearch} isLoading={searchLoading} icon={Search} disabled={!selectedRequest}>
              Find Matches
            </Button>
          </Card>

          {searchLoading ? (
            <div className="flex justify-center py-12"><Spinner /></div>
          ) : donors.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {donors.map((donor) => (
                <Card key={donor.id} className="flex flex-col">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-surface-100 flex items-center justify-center">
                        <User className="w-6 h-6 text-surface-400" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-surface-900">Donor #{donor.user_id}</h3>
                        <p className="text-sm text-surface-500 capitalize">{donor.gender}</p>
                      </div>
                    </div>
                    <div className="flex flex-col gap-1 items-end">
                      <Badge color="primary">{donor.blood_group}</Badge>
                    </div>
                  </div>
                  <div className="space-y-2 mb-6 flex-1">
                    <div className="flex items-center gap-2 text-surface-600">
                      <MapPin className="w-4 h-4" />
                      <span className="text-sm">{donor.city || 'Unknown City'}</span>
                    </div>
                  </div>
                  <div className="border-t border-surface-200 pt-4 mt-auto">
                    <Link to={`/requester/donors/${donor.user_id}`} className="text-sm font-medium text-primary-600 hover:text-primary-700 w-full text-center block">
                      View Donor Details
                    </Link>
                  </div>
                </Card>
              ))}
            </div>
          ) : selectedRequest && !searchLoading && donors.length === 0 ? (
             <EmptyState icon={Droplets} title="No matches found" description="No eligible donors were found for this request." />
          ) : null}
        </>
      )}
    </div>
  );
}
