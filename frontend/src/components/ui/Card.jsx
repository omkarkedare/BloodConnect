export default function Card({ children, className = '', header, ...props }) {
  return (
    <div
      className={`bg-white rounded-2xl shadow-sm hover:shadow-md border border-surface-200 transition-all duration-300 ${className}`}
      {...props}
    >
      {header && (
        <div className="px-6 py-4 border-b border-surface-100">
          {typeof header === 'string' ? (
            <h3 className="text-lg font-semibold text-surface-800">{header}</h3>
          ) : (
            header
          )}
        </div>
      )}
      <div className="p-6">{children}</div>
    </div>
  );
}
