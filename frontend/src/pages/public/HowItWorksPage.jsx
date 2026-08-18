import { UserPlus, Search, HeartHandshake, Droplets } from 'lucide-react';

const steps = [
  { icon: UserPlus, title: 'Register', description: 'Create an account as a donor or requester. Fill in your details and get started in minutes.', step: '01' },
  { icon: Search, title: 'Find a Match', description: 'Search for compatible donors by blood group and location, or post a blood request for others to see.', step: '02' },
  { icon: HeartHandshake, title: 'Connect', description: 'Donors respond to requests. Requesters review responses and connect with compatible donors.', step: '03' },
  { icon: Droplets, title: 'Donate & Save Lives', description: 'Complete the donation at the hospital. Your contribution is recorded and verified.', step: '04' },
];

export default function HowItWorksPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <div className="text-center mb-16">
        <h1 className="text-4xl font-extrabold text-surface-900 mb-4">How It Works</h1>
        <p className="text-surface-500 max-w-2xl mx-auto text-lg">Our simple four-step process makes blood donation easy and accessible.</p>
      </div>
      <div className="space-y-12">
        {steps.map(({ icon: Icon, title, description, step }, idx) => (
          <div key={step} className={`flex flex-col md:flex-row items-center gap-8 ${idx % 2 !== 0 ? 'md:flex-row-reverse' : ''}`}>
            <div className="flex-shrink-0">
              <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center shadow-lg">
                <Icon className="w-10 h-10 text-white" />
              </div>
            </div>
            <div className={`text-center md:text-left ${idx % 2 !== 0 ? 'md:text-right' : ''}`}>
              <span className="text-sm font-bold text-primary-500">Step {step}</span>
              <h3 className="text-2xl font-bold text-surface-900 mt-1 mb-3">{title}</h3>
              <p className="text-surface-500 max-w-md">{description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
