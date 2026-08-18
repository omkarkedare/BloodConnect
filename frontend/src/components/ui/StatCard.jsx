export default function StatCard({ icon: Icon, label, value, color = 'primary', trend }) {
  const colorMap = {
    primary: 'bg-primary-100 text-primary-600',
    secondary: 'bg-secondary-100 text-secondary-600',
    success: 'bg-success-50 text-success-600',
    warning: 'bg-warning-50 text-warning-600',
    danger: 'bg-danger-50 text-danger-600',
  };

  return (
    <div className="bg-white rounded-xl border border-surface-200 p-6 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-surface-500">{label}</p>
          <p className="text-3xl font-bold text-surface-900 mt-1">{value}</p>
          {trend && (
            <p className="text-xs text-surface-400 mt-1">{trend}</p>
          )}
        </div>
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${colorMap[color]}`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </div>
  );
}
