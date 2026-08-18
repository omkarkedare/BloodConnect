import { Link } from 'react-router-dom';
import { Heart, Users, Clock, Shield, ArrowRight, Droplets } from 'lucide-react';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';

export default function HomePage() {
  const stats = [
    { label: 'Active Donors', value: '2,500+', icon: Users },
    { label: 'Lives Saved', value: '10,000+', icon: Heart },
    { label: 'Requests Fulfilled', value: '8,000+', icon: Droplets },
  ];

  const features = [
    { icon: Clock, title: 'Quick Matching', description: 'Find compatible donors in minutes with our smart matching system.' },
    { icon: Shield, title: 'Verified Donors', description: 'All donors are verified to ensure safe and reliable blood donations.' },
    { icon: Users, title: 'Community Driven', description: 'Join a growing community of donors making a difference every day.' },
  ];

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary-600 via-primary-700 to-primary-900 text-white">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle at 25% 50%, rgba(255,255,255,0.15) 0%, transparent 50%), radial-gradient(circle at 75% 50%, rgba(255,255,255,0.1) 0%, transparent 50%)' }} />
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 md:py-32 relative">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full text-sm font-medium mb-6">
              <Heart className="w-4 h-4 fill-white" /> Saving Lives Together
            </div>
            <h1 className="text-4xl md:text-6xl font-extrabold leading-tight mb-6">
              Every Drop of Blood <br />
              <span className="text-primary-200">Can Save a Life</span>
            </h1>
            <p className="text-lg text-primary-100 mb-8 max-w-xl leading-relaxed">
              Connect with blood donors instantly. Whether you need blood urgently or want to donate, BloodConnect makes the process simple, fast, and reliable.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link to="/register">
                <Button variant="secondary" size="lg">
                  Become a Donor <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </Link>
              <Link to="/register">
                <Button variant="outline" size="lg" className="!border-white !text-white hover:!bg-white/10">
                  Request Blood
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-12 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {stats.map(({ label, value, icon: Icon }) => (
            <Card key={label} className="text-center">
              <Icon className="w-8 h-8 text-primary-600 mx-auto mb-2" />
              <p className="text-3xl font-bold text-surface-900">{value}</p>
              <p className="text-surface-500 text-sm">{label}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold text-surface-900 mb-4">Why Choose BloodConnect?</h2>
          <p className="text-surface-500 max-w-2xl mx-auto">We make blood donation accessible, efficient, and impactful for everyone.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {features.map(({ icon: Icon, title, description }) => (
            <div key={title} className="text-center p-6 rounded-2xl hover:bg-surface-50 transition-colors">
              <div className="w-14 h-14 rounded-2xl bg-primary-100 flex items-center justify-center mx-auto mb-4">
                <Icon className="w-7 h-7 text-primary-600" />
              </div>
              <h3 className="text-lg font-semibold text-surface-800 mb-2">{title}</h3>
              <p className="text-surface-500 text-sm">{description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="bg-surface-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to Make a Difference?</h2>
          <p className="text-surface-300 mb-8 max-w-xl mx-auto">Join thousands of donors and help save lives in your community.</p>
          <Link to="/register">
            <Button variant="primary" size="lg">
              Get Started Today <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
