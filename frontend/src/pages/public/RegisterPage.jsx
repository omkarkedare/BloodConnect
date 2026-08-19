import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { UserPlus, Mail, Lock, User, Phone, Heart } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import Button from '../../components/ui/Button';
import Input from '../../components/forms/Input';
import Select from '../../components/forms/Select';
import Alert from '../../components/ui/Alert';

export default function RegisterPage() {
  const [form, setForm] = useState({ full_name: '', email: '', password: '', confirm_password: '', phone: '', role: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.password !== form.confirm_password) { setError('Passwords do not match'); return; }
    setLoading(true);
    try {
      await register({ full_name: form.full_name, email: form.email, password: form.password, phone: form.phone || null, role: form.role });
      navigate('/login');
    } catch (err) {
      setError(err.response?.data?.detail || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-primary-600 flex items-center justify-center mx-auto mb-4">
            <Heart className="w-7 h-7 text-white fill-white" />
          </div>
          <h1 className="text-2xl font-bold text-surface-900">Create Account</h1>
          <p className="text-surface-500 mt-1">Join BloodConnect and start saving lives</p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-surface-200 p-8">
          {error && <Alert type="error" message={error} dismissible className="mb-6" />}
          <form onSubmit={handleSubmit} className="space-y-5">
            <Input label="Full Name" name="full_name" icon={User} value={form.full_name} onChange={handleChange} placeholder="John Doe" required />
            <Input label="Email" name="email" type="email" icon={Mail} value={form.email} onChange={handleChange} placeholder="you@example.com" required />
            <Input label="Phone (optional)" name="phone" icon={Phone} value={form.phone} onChange={handleChange} placeholder="+92 300 1234567" />
            <Select label="Register as" name="role" value={form.role} onChange={handleChange} options={[{ value: 'donor', label: 'Blood Donor' }, { value: 'requester', label: 'Blood Requester / Hospital' }]} required />
            <Input label="Password" name="password" type="password" icon={Lock} value={form.password} onChange={handleChange} placeholder="Min 8 characters" required />
            <Input label="Confirm Password" name="confirm_password" type="password" icon={Lock} value={form.confirm_password} onChange={handleChange} placeholder="Repeat password" required />
            <Button type="submit" className="w-full" loading={loading} icon={UserPlus}>Create Account</Button>
          </form>
          <p className="text-center text-sm text-surface-500 mt-6">
            Already have an account?{' '}
            <Link to="/login" className="text-primary-600 font-semibold hover:text-primary-700">Sign In</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
