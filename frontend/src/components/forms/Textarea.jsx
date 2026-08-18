import { AlertCircle } from 'lucide-react';

export default function Textarea({
  label,
  error,
  className = '',
  rows = 4,
  ...props
}) {
  return (
    <div className={className}>
      {label && (
        <label className="block text-sm font-medium text-surface-700 mb-1.5">
          {label}
        </label>
      )}
      <textarea
        rows={rows}
        className={`w-full rounded-lg border bg-white px-4 py-2.5 text-surface-800 placeholder-surface-400 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 resize-none ${
          error
            ? 'border-danger-500 focus:ring-danger-500'
            : 'border-surface-300'
        }`}
        {...props}
      />
      {error && (
        <p className="mt-1.5 flex items-center gap-1 text-sm text-danger-600">
          <AlertCircle className="w-3.5 h-3.5" />
          {error}
        </p>
      )}
    </div>
  );
}
