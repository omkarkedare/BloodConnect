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
    <div className="min-h-screen flex bg-surface-50">
      {/* Left Side: Branding / Visual */}
      <div className="hidden lg:flex lg:w-1/2 bg-primary-900 text-white p-12 flex-col justify-between relative overflow-hidden">
        {/* Background Decorative Pattern */}
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 30% 70%, rgba(255,255,255,0.4) 0%, transparent 50%), radial-gradient(circle at 70% 30%, rgba(255,255,255,0.3) 0%, transparent 50%)' }} />
        
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-16">
            <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center">
              <Heart className="w-6 h-6 text-primary-600 fill-primary-600" />
            </div>
            <span className="text-2xl font-bold tracking-tight">BloodConnect</span>
          </div>
          <h1 className="text-5xl font-extrabold leading-tight mb-6">
            Connecting donors.<br />
            <span className="text-primary-300">Saving lives.</span>
          </h1>
          <p className="text-lg text-primary-100 max-w-md leading-relaxed">
            Join the most reliable blood donation network. A single drop can make a world of difference for patients in critical need.
          </p>
        </div>

        <div className="relative z-10 bg-white/10 backdrop-blur-md p-6 rounded-2xl border border-white/20">
          <p className="italic text-primary-50">"I found a donor within hours for my mother's surgery. This platform is a lifesaver."</p>
          <div className="mt-4 flex items-center gap-3">
            <div className="w-10 h-10 bg-primary-400 rounded-full flex items-center justify-center font-bold text-white">R</div>
            <div>
              <p className="font-semibold text-sm">Rahul S.</p>
              <p className="text-xs text-primary-200">Requester</p>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side: Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 sm:p-12">
        <div className="w-full max-w-md">
          {/* Mobile Header (Hidden on Desktop) */}
          <div className="lg:hidden text-center mb-8">
            <div className="w-12 h-12 rounded-xl bg-primary-600 flex items-center justify-center mx-auto mb-4">
              <Heart className="w-6 h-6 text-white fill-white" />
            </div>
            <h1 className="text-2xl font-bold text-surface-900">BloodConnect</h1>
          </div>

          <div className="mb-8">
            <h2 className="text-3xl font-bold text-surface-900 mb-2">Welcome Back</h2>
            <p className="text-surface-500">Sign in to your account to continue.</p>
          </div>

          {error && <Alert type="error" message={error} className="mb-6" />}

          <form onSubmit={handleSubmit} className="space-y-5 w-full">
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
            <Button type="submit" className="w-full py-3 mt-4 text-lg" loading={loading} icon={LogIn}>
              Sign In
            </Button>
          </form>

          <p className="text-center text-sm text-surface-600 mt-8">
            Don't have an account?{' '}
            <Link to="/register" className="text-primary-600 font-bold hover:text-primary-700 hover:underline">
              Create an account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
