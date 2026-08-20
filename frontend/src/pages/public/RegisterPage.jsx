import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { UserPlus, Mail, Lock, User, Phone, Heart, Droplets } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import Button from '../../components/ui/Button';
import Input from '../../components/forms/Input';
import Select from '../../components/forms/Select';
import Alert from '../../components/ui/Alert';

export default function RegisterPage() {
  const [form, setForm] = useState({ full_name: '', email: '', password: '', confirm_password: '', phone: '', role: 'donor', blood_group: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (form.password !== form.confirm_password) { 
      setError('Passwords do not match'); 
      return; 
    }
    
    if (form.role === 'donor' && !form.blood_group) {
      setError('Please select your blood group');
      return;
    }

    setLoading(true);
    try {
      await register({ 
        full_name: form.full_name, 
        email: form.email, 
        password: form.password, 
        phone: form.phone || null, 
        role: form.role 
      });
      navigate('/login');
    } catch (err) {
      setError(err.response?.data?.detail || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const bloodGroupOptions = [
    'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'
  ];

  return (
    <div className="min-h-screen flex bg-surface-50">
      {/* Left Side: Branding / Visual */}
      <div className="hidden lg:flex lg:w-1/2 bg-primary-900 text-white p-12 flex-col justify-between relative overflow-hidden">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 30% 70%, rgba(255,255,255,0.4) 0%, transparent 50%), radial-gradient(circle at 70% 30%, rgba(255,255,255,0.3) 0%, transparent 50%)' }} />
        
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-16">
            <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center">
              <Heart className="w-6 h-6 text-primary-600 fill-primary-600" />
            </div>
            <span className="text-2xl font-bold tracking-tight">BloodConnect</span>
          </div>
          <h1 className="text-5xl font-extrabold leading-tight mb-6">
            Join our community.<br />
            <span className="text-primary-300">Save a life today.</span>
          </h1>
          <p className="text-lg text-primary-100 max-w-md leading-relaxed">
            Whether you're here to donate or to find blood for a loved one, you're taking a vital step. Every registration strengthens our network of hope.
          </p>
        </div>
      </div>

      {/* Right Side: Register Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 sm:p-12 overflow-y-auto">
        <div className="w-full max-w-md my-auto py-8">
          <div className="lg:hidden text-center mb-8">
            <div className="w-12 h-12 rounded-xl bg-primary-600 flex items-center justify-center mx-auto mb-4">
              <Heart className="w-6 h-6 text-white fill-white" />
            </div>
            <h1 className="text-2xl font-bold text-surface-900">BloodConnect</h1>
          </div>

          <div className="mb-8">
            <h2 className="text-3xl font-bold text-surface-900 mb-2">Create Account</h2>
            <p className="text-surface-500">Fill in the details below to get started.</p>
          </div>

          {error && <Alert type="error" message={error} className="mb-6" />}

          <form onSubmit={handleSubmit} className="space-y-5 w-full">
            {/* Role Selection */}
            <div>
              <label className="block text-sm font-medium text-surface-700 mb-1.5">I am registering as a:</label>
              <div className="grid grid-cols-2 gap-4 w-full">
                <button
                  type="button"
                  onClick={() => setForm({ ...form, role: 'donor' })}
                  className={`w-full py-2.5 px-4 rounded-xl border text-sm font-semibold transition-all text-center ${
                    form.role === 'donor' 
                      ? 'bg-primary-50 border-primary-500 text-primary-700 ring-1 ring-primary-500' 
                      : 'bg-white border-surface-200 text-surface-600 hover:bg-surface-50'
                  }`}
                >
                  Blood Donor
                </button>
                <button
                  type="button"
                  onClick={() => setForm({ ...form, role: 'requester' })}
                  className={`w-full py-2.5 px-4 rounded-xl border text-sm font-semibold transition-all text-center ${
                    form.role === 'requester' 
                      ? 'bg-primary-50 border-primary-500 text-primary-700 ring-1 ring-primary-500' 
                      : 'bg-white border-surface-200 text-surface-600 hover:bg-surface-50'
                  }`}
                >
                  Requester
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 w-full">
              <Input 
                label="Full Name" 
                name="full_name" 
                icon={User} 
                value={form.full_name} 
                onChange={handleChange} 
                placeholder="Enter your name" 
                required 
              />
              <Input 
                label="Phone (Optional)" 
                name="phone" 
                icon={Phone} 
                value={form.phone} 
                onChange={handleChange} 
                placeholder="Enter your phone number" 
                type="tel"
              />
            </div>

            <Input 
              label="Email Address" 
              name="email" 
              type="email" 
              icon={Mail} 
              value={form.email} 
              onChange={handleChange} 
              placeholder="Enter your email" 
              required 
            />

            {/* Conditional Blood Group */}
            {form.role === 'donor' && (
              <div className="animate-in fade-in slide-in-from-top-2 duration-300 w-full">
                <Select 
                  label="Your Blood Group (Required)" 
                  name="blood_group"
                  icon={Droplets}
                  value={form.blood_group}
                  onChange={handleChange}
                  options={bloodGroupOptions}
                  placeholder="Select Blood Group"
                  required={form.role === 'donor'}
                />
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 w-full">
              <Input 
                label="Password" 
                name="password" 
                type="password" 
                icon={Lock} 
                value={form.password} 
                onChange={handleChange} 
                placeholder="Enter your password" 
                required 
              />
              <Input 
                label="Confirm Password" 
                name="confirm_password" 
                type="password" 
                icon={Lock} 
                value={form.confirm_password} 
                onChange={handleChange} 
                placeholder="Enter your password" 
                required 
              />
            </div>

            <Button type="submit" className="w-full py-3 mt-4 text-lg" loading={loading} icon={UserPlus}>
              Create Account
            </Button>
          </form>

          <p className="text-center text-sm text-surface-600 mt-8">
            Already have an account?{' '}
            <Link to="/login" className="text-primary-600 font-bold hover:text-primary-700 hover:underline">
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
