import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PlusCircle, Activity, ShieldAlert } from 'lucide-react';
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
    expires_at: '',
    description: ''
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Minimum datetime-local value: current time (rounded to minute)
  const getMinDateTime = () => {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    return now.toISOString().slice(0, 16);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // 1. Mandatory patient name validation (reject newlines \n, \r, tabs \t, digits; accept multi-language letters)
    if (!formData.patient_name || !formData.patient_name.trim()) {
      setError('Patient name is required.');
      return;
    }
    if (/[\n\r\t]/.test(formData.patient_name)) {
      setError('Patient name cannot contain newlines or tabs.');
      return;
    }
    const cleanName = formData.patient_name.trim();
    if (cleanName.length < 2) {
      setError('Patient name must be at least 2 characters long.');
      return;
    }
    if (cleanName.length > 150) {
      setError('Patient name cannot exceed 150 characters.');
      return;
    }
    if (/[\d\p{N}]/u.test(cleanName)) {
      setError('Patient name cannot contain numeric digits. Please enter a genuine name without numbers.');
      return;
    }
    if (!/^[\p{L}\p{M} .'-]+$/u.test(cleanName)) {
      setError('Patient name can only contain letters, spaces, hyphens, periods, and apostrophes (numbers, symbols, newlines, and tabs are not allowed).');
      return;
    }
    if (!/\p{L}/u.test(cleanName)) {
      setError('Patient name must contain at least one letter.');
      return;
    }

    // 2. Mandatory operational fields validation
    const cleanHospital = formData.hospital_name.trim();
    if (!cleanHospital || cleanHospital.length < 2) {
      setError('Please specify a valid hospital, blood bank, or medical facility (at least 2 characters).');
      return;
    }

    const cleanCity = formData.city.trim();
    if (!cleanCity || cleanCity.length < 2) {
      setError('Please specify a valid city name (at least 2 characters).');
      return;
    }

    const digits = formData.contact_phone.replace(/\D/g, '');
    if (digits.length < 7) {
      setError('Please provide a valid contact phone number with at least 7 digits.');
      return;
    }

    // 3. Frontend validation: expires_at must be in the future
    if (formData.expires_at) {
      const expiresDate = new Date(formData.expires_at);
      if (expiresDate <= new Date()) {
        setError('Blood needed by time must be in the future.');
        return;
      }
    } else {
      setError('Please select when blood is needed by (expiration time).');
      return;
    }

    try {
      setLoading(true);
      setError('');
      await requestService.createRequest({
        ...formData,
        patient_name: cleanName,
        hospital_name: cleanHospital,
        city: cleanCity,
        contact_phone: formData.contact_phone.trim(),
        units_needed: parseInt(formData.units_needed, 10),
        // Send expires_at as ISO string for the backend
        expires_at: formData.expires_at ? new Date(formData.expires_at).toISOString() : undefined,
      });
      navigate('/requester/requests');
    } catch (err) {
      const detail = err.response?.data?.detail;
      if (Array.isArray(detail)) {
        // FastAPI / Pydantic validation error array
        setError(detail.map(d => d.msg).join('; '));
      } else {
        setError(detail || 'Failed to create request. Please check your inputs.');
      }
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
              <p className="text-sm text-surface-500">Provide accurate information to help donors find you. Fields marked with <span className="text-danger-500 font-bold">*</span> are required.</p>
            </div>
          </div>

          {/* Privacy Notice Callout */}
          <div className="mb-6 p-4 rounded-xl bg-blue-50/70 border border-blue-200 flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-semibold text-blue-900">Patient Privacy Notice</h4>
              <p className="text-xs text-blue-700 mt-0.5 leading-relaxed">
                BloodConnect only uses patient name, blood group, and hospital location to coordinate blood bank verification. To protect patient confidentiality, please <strong>do not include sensitive medical diagnoses, surgery histories, or confidential medical conditions</strong> in the notes.
              </p>
            </div>
          </div>

          {error && <Alert type="error" message={error} className="mb-6" />}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input 
                label="Patient Name" 
                name="patient_name" 
                placeholder="Full Name (English / Marathi / Hindi, e.g. Rajesh Sharma, ओंकार केदारे)"
                value={formData.patient_name} 
                onChange={handleChange} 
                required 
              />
              <Input 
                label="Contact Phone" 
                name="contact_phone" 
                placeholder="e.g. 9876543210"
                value={formData.contact_phone} 
                onChange={handleChange} 
                required 
              />
              
              <Select 
                label="Blood Group" 
                name="blood_group" 
                value={formData.blood_group} 
                onChange={handleChange} 
                required 
                options={['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']} 
              />
              
              <Input 
                label="Units Needed" 
                name="units_needed" 
                type="number" 
                min="1" 
                value={formData.units_needed} 
                onChange={handleChange} 
                required 
              />
              
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
              
              <Input 
                label="Required Date" 
                name="required_date" 
                type="date" 
                value={formData.required_date} 
                onChange={handleChange} 
                min={new Date().toISOString().split('T')[0]} 
                required 
              />
              
              <Input 
                label="Where is blood needed?" 
                placeholder="Hospital / Blood Bank / Location" 
                name="hospital_name" 
                value={formData.hospital_name} 
                onChange={handleChange} 
                required 
              />
              <Input 
                label="City" 
                name="city" 
                placeholder="e.g. Mumbai"
                value={formData.city} 
                onChange={handleChange} 
                required 
              />
            </div>

            <div className="bg-primary-50/50 border border-primary-200 rounded-xl p-4">
              <label className="block text-sm font-semibold text-primary-800 mb-2">
                Blood Needed By (Expiration) <span className="text-danger-500 font-bold ml-1" title="Mandatory field">*</span>
              </label>
              <p className="text-xs text-primary-600 mb-3">After this date and time, the request will automatically expire and donors will no longer see it.</p>
              <input
                type="datetime-local"
                name="expires_at"
                value={formData.expires_at}
                onChange={handleChange}
                min={getMinDateTime()}
                required
                className="w-full px-4 py-2.5 border border-primary-300 rounded-lg bg-white text-surface-900 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>

            <Textarea 
              label="Address Details (Optional)" 
              placeholder="Specific ward, building, or street address" 
              name="hospital_address" 
              value={formData.hospital_address} 
              onChange={handleChange} 
              rows={2} 
            />
            <Textarea 
              label="Additional Details / Description (Optional)" 
              placeholder="Operational directions or hospital desk guidance (do not include medical diagnoses)"
              name="description" 
              value={formData.description} 
              onChange={handleChange} 
              rows={3} 
            />

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
