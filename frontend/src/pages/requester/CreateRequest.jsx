import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PlusCircle, Activity } from 'lucide-react';
import requestService from '../../services/requestService';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/forms/Input';
import Select from '../../components/forms/Select';
import Textarea from '../../components/forms/Textarea';
import Alert from '../../components/ui/Alert';

export default function CreateRequest() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    patient_name: '',
    blood_group: 'A+',
    units_needed: 1,
    urgency: 'normal',
    hospital_name: '',
    hospital_address: '',
    city: '',
    contact_phone: '',
    required_date: '',
    description: ''
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError('');
      await requestService.createRequest({
        ...formData,
        units_needed: parseInt(formData.units_needed, 10)
      });
      navigate('/requester/requests');
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to create request. Please check your inputs.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-surface-900">Create Blood Request</h1>
          <p className="text-surface-500 mt-1">Submit a new request to find compatible donors</p>
        </div>
      </div>

      <div className="max-w-3xl">
        <Card className="p-8">
          <div className="flex items-center gap-3 mb-6 pb-6 border-b border-surface-200">
            <div className="w-12 h-12 rounded-full bg-primary-100 flex items-center justify-center">
              <Activity className="w-6 h-6 text-primary-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-surface-900">Patient & Requirement Details</h2>
              <p className="text-sm text-surface-500">Provide accurate information to help donors find you.</p>
            </div>
          </div>

          {error && <Alert type="error" message={error} className="mb-6" />}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input label="Patient Name" name="patient_name" value={formData.patient_name} onChange={handleChange} required />
              <Input label="Contact Phone" name="contact_phone" value={formData.contact_phone} onChange={handleChange} required />
              
              <Select 
                label="Blood Group" 
                name="blood_group" 
                value={formData.blood_group} 
                onChange={handleChange} 
                required 
                options={['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']} 
              />
              
              <Input label="Units Needed" name="units_needed" type="number" min="1" value={formData.units_needed} onChange={handleChange} required />
              
              <Select 
                label="Urgency" 
                name="urgency" 
                value={formData.urgency} 
                onChange={handleChange} 
                required
                options={[
                  { value: 'normal', label: 'Normal' },
                  { value: 'urgent', label: 'Urgent' },
                  { value: 'critical', label: 'Critical' }
                ]} 
              />
              
              <Input label="Required Date" name="required_date" type="date" value={formData.required_date} onChange={handleChange} min={new Date().toISOString().split('T')[0]} required />
              
              <Input label="Hospital Name" name="hospital_name" value={formData.hospital_name} onChange={handleChange} required />
              <Input label="City" name="city" value={formData.city} onChange={handleChange} required />
            </div>

            <Textarea label="Hospital Address (Optional)" name="hospital_address" value={formData.hospital_address} onChange={handleChange} rows={2} />
            <Textarea label="Additional Details / Description (Optional)" name="description" value={formData.description} onChange={handleChange} rows={3} />

            <div className="flex justify-end pt-4 border-t border-surface-200">
              <Button type="submit" isLoading={loading} icon={PlusCircle}>
                Create Request
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}
