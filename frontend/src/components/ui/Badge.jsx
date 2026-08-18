const colorMap = {
  red: 'bg-red-100 text-red-700 ring-red-600/20',
  green: 'bg-green-100 text-green-700 ring-green-600/20',
  blue: 'bg-blue-100 text-blue-700 ring-blue-600/20',
  yellow: 'bg-yellow-100 text-yellow-700 ring-yellow-600/20',
  purple: 'bg-purple-100 text-purple-700 ring-purple-600/20',
  orange: 'bg-orange-100 text-orange-700 ring-orange-600/20',
  gray: 'bg-gray-100 text-gray-700 ring-gray-600/20',
  primary: 'bg-primary-100 text-primary-700 ring-primary-600/20',
};

export default function Badge({ children, color = 'gray', className = '' }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${colorMap[color] || colorMap.gray} ${className}`}
    >
      {children}
    </span>
  );
}
