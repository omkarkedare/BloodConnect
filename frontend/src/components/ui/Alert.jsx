import { AlertCircle, CheckCircle2, Info, AlertTriangle, X } from 'lucide-react';
import { useState } from 'react';

const typeStyles = {
  success: {
    bg: 'bg-success-50 border-success-500',
    icon: CheckCircle2,
    iconColor: 'text-success-600',
  },
  error: {
    bg: 'bg-danger-50 border-danger-500',
    icon: AlertCircle,
    iconColor: 'text-danger-600',
  },
  warning: {
    bg: 'bg-warning-50 border-warning-500',
    icon: AlertTriangle,
    iconColor: 'text-warning-600',
  },
  info: {
    bg: 'bg-secondary-50 border-secondary-500',
    icon: Info,
    iconColor: 'text-secondary-600',
  },
};

export default function Alert({ type = 'info', title, message, dismissible = false }) {
  const [visible, setVisible] = useState(true);
  if (!visible) return null;

  const style = typeStyles[type];
  const IconComponent = style.icon;

  return (
    <div className={`rounded-lg border-l-4 p-4 ${style.bg}`}>
      <div className="flex items-start">
        <IconComponent className={`w-5 h-5 mt-0.5 ${style.iconColor}`} />
        <div className="ml-3 flex-1">
          {title && <h3 className="text-sm font-semibold text-surface-800">{title}</h3>}
          {message && <p className="text-sm text-surface-600 mt-1">{message}</p>}
        </div>
        {dismissible && (
          <button onClick={() => setVisible(false)} className="text-surface-400 hover:text-surface-600 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}
