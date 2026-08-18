import { AlertTriangle, RefreshCw } from 'lucide-react';
import Button from '../ui/Button';

export default function ErrorDisplay({
  title = 'Something went wrong',
  message = 'An unexpected error occurred. Please try again.',
  onRetry,
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <div className="w-16 h-16 rounded-full bg-danger-50 flex items-center justify-center mb-4">
        <AlertTriangle className="w-8 h-8 text-danger-500" />
      </div>
      <h2 className="text-xl font-semibold text-surface-800 mb-2">{title}</h2>
      <p className="text-surface-500 mb-6 max-w-md">{message}</p>
      {onRetry && (
        <Button onClick={onRetry} variant="primary" icon={RefreshCw}>
          Try Again
        </Button>
      )}
    </div>
  );
}
