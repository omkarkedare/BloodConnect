import { useState, useEffect } from 'react';
import { Droplets, Calendar, MapPin, Activity } from 'lucide-react';
import donationService from '../../services/donationService';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import StatusBadge from '../../components/ui/StatusBadge';
import Spinner from '../../components/ui/Spinner';
import EmptyState from '../../components/ui/EmptyState';
import Alert from '../../components/ui/Alert';

export default function DonorDonations() {
  const [donations, setDonations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchDonations();
  }, []);

  const fetchDonations = async () => {
    try {
      setLoading(true);
      const res = await donationService.getMyDonations();
      setDonations(res.data);
    } catch (err) {
      setError('Failed to load donation history.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="flex justify-center py-12"><Spinner /></div>;

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-surface-900">My Donations</h1>
        <p className="text-surface-500 mt-1">View your donation history</p>
      </div>

      {error && <Alert type="error" message={error} className="mb-6" />}

      {donations.length === 0 ? (
        <EmptyState
          icon={Droplets}
          title="No donations yet"
          description="Your completed donations will appear here."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {donations.map(donation => (
            <Card key={donation.id} className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                    <Droplets className="w-5 h-5 text-red-500" />
                  </div>
                  <div>
                    <h3 className="font-bold text-surface-900">{donation.blood_group}</h3>
                    <p className="text-sm text-surface-500">{donation.units_donated} Unit(s)</p>
                  </div>
                </div>
                <StatusBadge status={donation.status} />
              </div>

              <div className="space-y-2 text-sm text-surface-600 mt-4 pt-4 border-t border-surface-200">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-surface-400" />
                  <span>{new Date(donation.donation_date).toLocaleDateString()}</span>
                </div>
                {donation.hospital_name && (
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-surface-400" />
                    <span>{donation.hospital_name}</span>
                  </div>
                )}
                {donation.request_id && (
                  <div className="flex items-center gap-2 mt-2 pt-2 border-t border-surface-100">
                    <Activity className="w-4 h-4 text-surface-400" />
                    <span className="text-xs font-medium uppercase tracking-wider text-primary-600">
                      Request FULFILLED
                    </span>
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
