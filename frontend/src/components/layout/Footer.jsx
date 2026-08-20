import { Link } from 'react-router-dom';
import { Heart, Mail, Phone, MapPin } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-surface-900 text-surface-300 w-full">
      <div className="global-container py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-primary-600 flex items-center justify-center">
                <Heart className="w-4 h-4 text-white fill-white" />
              </div>
              <span className="text-lg font-bold text-white">BloodConnect</span>
            </div>
            <p className="text-surface-400 text-sm leading-relaxed max-w-md">
              Connecting donors. Saving lives.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-white font-semibold mb-4">Quick Links</h3>
            <ul className="space-y-2 text-sm">
              {[{ to: '/about', label: 'About Us' }, { to: '/how-it-works', label: 'How It Works' }, { to: '/blood-groups', label: 'Blood Groups' }, { to: '/contact', label: 'Contact' }].map(({ to, label }) => (
                <li key={to}>
                  <Link to={to} className="text-surface-400 hover:text-white transition-colors">{label}</Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="text-white font-semibold mb-4">Contact</h3>
            <ul className="space-y-3 text-sm">
              <li className="flex items-center gap-2 text-surface-400">
                <Phone className="w-4 h-4" /> 8975xxxxxx
              </li>
              <li className="flex items-start gap-2 text-surface-400">
                <MapPin className="w-4 h-4 mt-0.5" /> 
                <span>Chhatrapati Sambhajinagar,<br/>Maharashtra, India</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 pt-8 border-t border-surface-800 text-center text-sm text-surface-500">
          &copy; {new Date().getFullYear()} BloodConnect. All rights reserved. Built with <Heart className="w-3 h-3 inline text-primary-500 fill-primary-500" /> for humanity.
        </div>
      </div>
    </footer>
  );
}
