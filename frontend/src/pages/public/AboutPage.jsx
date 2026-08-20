import { Heart, Target, Eye, Users } from 'lucide-react';
import Card from '../../components/ui/Card';

export default function AboutPage() {
  return (
    <div className="global-container py-16">
      <div className="text-center mb-16">
        <h1 className="text-4xl font-extrabold text-surface-900 mb-4">About BloodConnect</h1>
        <p className="text-surface-500 max-w-2xl mx-auto text-lg">We are on a mission to bridge the gap between blood donors and those in need.</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
        {[
          { icon: Target, title: 'Our Mission', text: 'To create an accessible platform that connects blood donors with patients in need, ensuring no life is lost due to blood shortage.' },
          { icon: Eye, title: 'Our Vision', text: 'A world where every person in need of blood can find a compatible donor quickly and reliably through technology.' },
          { icon: Users, title: 'Our Community', text: 'A growing network of verified donors, hospitals, and volunteers working together to save lives every day.' },
        ].map(({ icon: Icon, title, text }) => (
          <Card key={title} className="text-center">
            <div className="w-12 h-12 rounded-xl bg-primary-100 flex items-center justify-center mx-auto mb-4">
              <Icon className="w-6 h-6 text-primary-600" />
            </div>
            <h3 className="text-lg font-semibold text-surface-800 mb-2">{title}</h3>
            <p className="text-surface-500 text-sm">{text}</p>
          </Card>
        ))}
      </div>
      <div className="bg-primary-50 rounded-2xl p-8 md:p-12 text-center">
        <Heart className="w-10 h-10 text-primary-600 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-surface-900 mb-3">Every Donation Matters</h2>
        <p className="text-surface-600 max-w-xl mx-auto">A single blood donation can save up to three lives. Your contribution makes a real difference.</p>
      </div>
    </div>
  );
}
