import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';

export default function StatCard({ icon: Icon, label, value, color = 'primary', trend, to, onClick }) {
  const colorMap = {
    primary: 'bg-primary-100 text-primary-600 group-hover:bg-primary-600 group-hover:text-white',
    secondary: 'bg-secondary-100 text-secondary-600 group-hover:bg-secondary-600 group-hover:text-white',
    success: 'bg-emerald-50 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white',
    warning: 'bg-amber-50 text-amber-600 group-hover:bg-amber-600 group-hover:text-white',
    danger: 'bg-red-50 text-danger-600 group-hover:bg-red-600 group-hover:text-white',
    amber: 'bg-amber-50 text-amber-600 group-hover:bg-amber-600 group-hover:text-white',
    rose: 'bg-rose-50 text-rose-600 group-hover:bg-rose-600 group-hover:text-white',
    purple: 'bg-purple-50 text-purple-600 group-hover:bg-purple-600 group-hover:text-white',
  };

  const activeColorClass = colorMap[color] || colorMap.primary;

  const cardContent = (
    <div className="flex items-center justify-between">
      <div className="flex-1 min-w-0 pr-3">
        <div className="flex items-center gap-1.5">
          <p className="text-sm font-semibold text-surface-600 leading-snug break-words">{label}</p>
          {to && (
            <ArrowUpRight className="w-4 h-4 text-surface-400 opacity-0 group-hover:opacity-100 group-hover:text-primary-600 transition-all shrink-0" />
          )}
        </div>
        <p className="text-3xl font-bold text-surface-900 mt-1">{value}</p>
        {trend && (
          <p className="text-xs text-surface-400 mt-1">{trend}</p>
        )}
      </div>
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors duration-200 shrink-0 ${activeColorClass}`}>
        <Icon className="w-6 h-6" />
      </div>
    </div>
  );

  const baseClasses = "bg-white rounded-xl border border-surface-200 p-6 transition-all duration-200 block";
  const interactiveClasses = "hover:border-primary-300 hover:shadow-md cursor-pointer group hover:-translate-y-0.5";

  if (to) {
    return (
      <Link to={to} className={`${baseClasses} ${interactiveClasses}`}>
        {cardContent}
      </Link>
    );
  }

  if (onClick) {
    return (
      <div onClick={onClick} role="button" tabIndex={0} className={`${baseClasses} ${interactiveClasses}`}>
        {cardContent}
      </div>
    );
  }

  return (
    <div className={baseClasses}>
      {cardContent}
    </div>
  );
}
