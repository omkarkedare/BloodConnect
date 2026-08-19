import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LogIn, Mail, Lock, Heart } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import Button from '../../components/ui/Button';
import Input from '../../components/forms/Input';
import Alert from '../../components/ui/Alert';

export default function LoginPage() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await login(form);
      const routes = { donor: '/donor/dashboard', requester: '/requester/dashboard', admin: '/admin/dashboard' };
      navigate(routes[user.role] || '/');
    } catch (err) {
      setError(err.response?.data?.detail || 'Invalid email or password');
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
          <h1 className="text-2xl font-bold text-surface-900">Welcome Back</h1>
          <p className="text-surface-500 mt-1">Sign in to your BloodConnect account</p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-surface-200 p-8">
          {error && <Alert type="error" message={error} dismissible className="mb-6" />}
          <form onSubmit={handleSubmit} className="space-y-5">
            <Input label="Email" name="email" type="email" icon={Mail} value={form.email} onChange={handleChange} placeholder="you@example.com" required />
            <Input label="Password" name="password" type="password" icon={Lock} value={form.password} onChange={handleChange} placeholder="••••••••" required />
            <Button type="submit" className="w-full" loading={loading} icon={LogIn}>Sign In</Button>
          </form>
          <p className="text-center text-sm text-surface-500 mt-6">
            Don't have an account?{' '}
            <Link to="/register" className="text-primary-600 font-semibold hover:text-primary-700">Register</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
