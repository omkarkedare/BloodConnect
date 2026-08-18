import { Link } from 'react-router-dom';
import { Home, AlertTriangle } from 'lucide-react';
import Button from '../components/ui/Button';

export default function NotFound() {
  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="text-center">
        <div className="w-20 h-20 rounded-full bg-warning-50 flex items-center justify-center mx-auto mb-6">
          <AlertTriangle className="w-10 h-10 text-warning-500" />
        </div>
        <h1 className="text-6xl font-extrabold text-surface-900 mb-2">404</h1>
        <h2 className="text-xl font-semibold text-surface-700 mb-4">Page Not Found</h2>
        <p className="text-surface-500 mb-8 max-w-md">The page you're looking for doesn't exist or has been moved.</p>
        <Link to="/"><Button icon={Home}>Back to Home</Button></Link>
      </div>
    </div>
  );
}
