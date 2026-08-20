import { Link } from 'react-router-dom';
import { Heart, Users, Clock, Shield, ArrowRight, Droplets, Info, Search, MapPin, Phone } from 'lucide-react';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';

export default function HomePage() {
  const compatibility = [
    { type: 'O-', receives: 'O-' },
    { type: 'O+', receives: 'O+, O-' },
    { type: 'A-', receives: 'A-, O-' },
    { type: 'A+', receives: 'A+, A-, O+, O-' },
    { type: 'B-', receives: 'B-, O-' },
    { type: 'B+', receives: 'B+, B-, O+, O-' },
    { type: 'AB-', receives: 'AB-, A-, B-, O-' },
    { type: 'AB+', receives: 'Everyone (Universal Recipient)' },
  ];

  return (
    <div className="bg-surface-50 min-h-screen w-full flex flex-col">
      {/* Hero Section */}
      <section className="bg-white border-b border-surface-200 py-20 md:py-32 w-full">
        <div className="global-container text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary-100 text-primary-600 mb-6">
            <Heart className="w-8 h-8 fill-current" />
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold text-surface-900 tracking-tight mb-6">
            Connecting Donors With Those Who Need Them
          </h1>
          <p className="text-lg md:text-xl text-surface-600 max-w-2xl mx-auto mb-10 leading-relaxed">
            A fast, reliable platform connecting patients in urgent need with eligible blood donors in their community. Every drop counts.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link to="/register">
              <Button variant="primary" size="lg" className="w-full sm:w-auto px-8" icon={Search}>
                Find a Donor
              </Button>
            </Link>
            <Link to="/register">
              <Button variant="outline" size="lg" className="w-full sm:w-auto px-8" icon={Heart}>
                Become a Donor
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Main Content Containers */}
      <section className="global-container py-16 space-y-12">
        
        {/* About & Why Us */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <Card className="p-8 border-t-4 border-t-primary-500">
            <h2 className="text-2xl font-bold text-surface-900 mb-4 flex items-center gap-2">
              <Info className="w-6 h-6 text-primary-600" /> About BloodConnect
            </h2>
            <p className="text-surface-600 leading-relaxed">
              BloodConnect bridges the critical gap between blood donors and recipients. Our platform streamlines the entire donation lifecycle—from raising an urgent request to finding a compatible match, facilitating communication, and finalizing the donation securely.
            </p>
          </Card>
          
          <Card className="p-8">
            <h2 className="text-2xl font-bold text-surface-900 mb-6">Why BloodConnect?</h2>
            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-surface-100 flex items-center justify-center flex-shrink-0">
                  <Clock className="w-5 h-5 text-surface-700" />
                </div>
                <div>
                  <h3 className="font-semibold text-surface-900">Real-Time Matching</h3>
                  <p className="text-sm text-surface-500 mt-1">Smart algorithms instantly identify compatible donors available nearby.</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-surface-100 flex items-center justify-center flex-shrink-0">
                  <Shield className="w-5 h-5 text-surface-700" />
                </div>
                <div>
                  <h3 className="font-semibold text-surface-900">Secure & Private</h3>
                  <p className="text-sm text-surface-500 mt-1">Contact details are only shared after both parties confirm the match.</p>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* How It Works */}
        <Card className="p-8">
          <h2 className="text-2xl font-bold text-surface-900 mb-8 text-center">How It Works</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 text-center">
            {[
              { step: '1', title: 'Request', desc: 'Patient creates a blood request with required details.' },
              { step: '2', title: 'Match', desc: 'Eligible donors receive notifications and see the request.' },
              { step: '3', title: 'Connect', desc: 'Donor accepts, and requester confirms the match.' },
              { step: '4', title: 'Donate', desc: 'Donation occurs at the hospital and is verified on platform.' },
            ].map((item) => (
              <div key={item.step} className="relative">
                <div className="w-12 h-12 mx-auto bg-primary-50 text-primary-700 font-bold rounded-full flex items-center justify-center mb-4 text-xl">
                  {item.step}
                </div>
                <h3 className="font-semibold text-surface-900 mb-2">{item.title}</h3>
                <p className="text-sm text-surface-500">{item.desc}</p>
              </div>
            ))}
          </div>
        </Card>

        {/* Blood Groups / Compatibility */}
        <Card className="p-8 border-t-4 border-t-error-500">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-surface-900 mb-2 flex items-center justify-center gap-2">
              <Droplets className="w-6 h-6 text-error-500" /> Blood Compatibility
            </h2>
            <p className="text-sm text-surface-500 bg-surface-100 p-3 rounded-lg inline-block">
              Compatibility shown is for preliminary red-blood-cell donor matching.<br className="hidden sm:block"/>
              Final transfusion compatibility must be confirmed by qualified medical professionals.
            </p>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr>
                  <th className="py-3 px-4 bg-surface-50 font-semibold text-surface-900 border-b border-surface-200">Patient Blood Type</th>
                  <th className="py-3 px-4 bg-surface-50 font-semibold text-surface-900 border-b border-surface-200">Can Receive From Donors</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-100">
                {compatibility.map((row) => (
                  <tr key={row.type} className="hover:bg-surface-50 transition-colors">
                    <td className="py-3 px-4 font-medium text-error-600">{row.type}</td>
                    <td className="py-3 px-4 text-surface-700">{row.receives}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Contact Container */}
        <Card className="p-8 bg-surface-900 text-white">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
            <div>
              <h2 className="text-2xl font-bold mb-2">Get in Touch</h2>
              <p className="text-surface-400 mb-6">Need help or have questions? Our support team is available.</p>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-surface-800 flex items-center justify-center">
                    <Phone className="w-5 h-5 text-primary-400" />
                  </div>
                  <div>
                    <p className="text-sm text-surface-400">Call Us</p>
                    <p className="font-medium">8975xxxxxx</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-surface-800 flex items-center justify-center">
                    <MapPin className="w-5 h-5 text-primary-400" />
                  </div>
                  <div>
                    <p className="text-sm text-surface-400">Location</p>
                    <p className="font-medium">Chhatrapati Sambhajinagar, Maharashtra, India</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="text-center md:text-right">
              <Users className="w-32 h-32 text-surface-800 mx-auto md:mr-0 md:ml-auto opacity-50" />
            </div>
          </div>
        </Card>

      </section>
    </div>
  );
}
