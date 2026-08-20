import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { User, MapPin, Activity, Calendar } from 'lucide-react';
import donorService from '../../services/donorService';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Spinner from '../../components/ui/Spinner';
import Alert from '../../components/ui/Alert';

export default function DonorDetail() {
  const { id } = useParams();
  const [donor, setDonor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchDonorDetails();
  }, [id]);

  const fetchDonorDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      // We must fetch all donors and filter locally since there is no specific getDonor(id) endpoint for requesters
      const res = await donorService.searchDonors({});
      const foundDonor = res.data.find(d => d.user_id === parseInt(id, 10));
      
      if (foundDonor) {
        setDonor(foundDonor);
      } else {
        setError('Donor not found.');
      }
    } catch (err) {
      setError('Failed to fetch donor details.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="flex justify-center py-12"><Spinner /></div>;
  if (error || !donor) return <Alert type="error" message={error || 'Donor not found'} className="m-6" />;

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-surface-900">Donor Details</h1>
        <p className="text-surface-500 mt-1">Review donor profile and eligibility</p>
      </div>

      <Card className="p-8">
        <div className="flex items-start gap-4 mb-6 pb-6 border-b border-surface-200">
          <div className="w-16 h-16 rounded-full bg-primary-100 flex items-center justify-center">
            <User className="w-8 h-8 text-primary-600" />
          </div>
          <div className="flex-1">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-2xl font-bold text-surface-900">Donor #{donor.user_id}</h2>
                <div className="flex items-center gap-2 mt-1 text-surface-500">
                  <span className="capitalize">{donor.gender}</span>
                  <span>•</span>
                  <span>{donor.weight_kg ? `${donor.weight_kg} kg` : 'Weight not provided'}</span>
                </div>
              </div>
              <Badge color="primary" className="text-lg px-3 py-1">{donor.blood_group}</Badge>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          <div>
            <h3 className="text-sm font-semibold text-surface-500 uppercase mb-4 flex items-center gap-2">
              <MapPin className="w-4 h-4" /> Location
            </h3>
            <p className="text-surface-900">{donor.city || 'Not specified'}</p>
            {donor.state && <p className="text-surface-600">{donor.state}</p>}
            {donor.address && <p className="text-surface-600">{donor.address}</p>}
          </div>

          <div>
            <h3 className="text-sm font-semibold text-surface-500 uppercase mb-4 flex items-center gap-2">
              <Activity className="w-4 h-4" /> Medical Profile
            </h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-surface-600">Availability Status</span>
                <Badge color={donor.is_available ? 'success' : 'surface'}>
                  {donor.is_available ? 'Available to Donate' : 'Unavailable'}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-surface-600">Last Donation</span>
                <span className="text-surface-900 font-medium">
                  {donor.last_donation_date ? new Date(donor.last_donation_date).toLocaleDateString() : 'Never'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {donor.medical_conditions && (
          <div className="bg-surface-50 p-4 rounded-lg border border-surface-200">
            <h4 className="font-semibold text-surface-900 mb-2">Medical Conditions</h4>
            <p className="text-surface-600 text-sm">{donor.medical_conditions}</p>
          </div>
        )}

      </Card>
    </div>
  );
}
