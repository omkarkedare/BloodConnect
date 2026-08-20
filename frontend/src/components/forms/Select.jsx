import { AlertCircle, ChevronDown } from 'lucide-react';

export default function Select({
  label,
  error,
  icon: Icon,
  options = [],
  placeholder = 'Select an option',
  className = '',
  ...props
}) {
  return (
    <div className={`w-full ${className}`}>
      {label && (
        <label className="block text-sm font-medium text-surface-700 mb-1.5">
          {label}
        </label>
      )}
      <div className="relative w-full">
        {Icon && (
          <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-surface-400 pointer-events-none" />
        )}
        <select
          className={`block w-full appearance-none rounded-xl border bg-white py-2.5 text-surface-800 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 ${
            Icon ? 'pl-10' : 'px-4'
          } pr-10 ${
            error
              ? 'border-danger-500 focus:ring-danger-500'
              : 'border-surface-300'
          }`}
          {...props}
        >
          <option value="">{placeholder}</option>
          {options.map((opt) => (
            <option key={opt.value || opt} value={opt.value || opt}>
              {opt.label || opt}
            </option>
          ))}
        </select>
        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-surface-400 pointer-events-none" />
      </div>
      {error && (
        <p className="mt-1.5 flex items-center gap-1 text-sm text-danger-600">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
          <span>{error}</span>
        </p>
      )}
    </div>
  );
}
