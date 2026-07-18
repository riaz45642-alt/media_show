export default function PageHeader({ title, subtitle, action }) {
  return (
    <div className="flex items-start justify-between mb-6 animate-slideDown">
      <div>
        <h1 className="font-display text-2xl font-bold text-gray-800 dark:text-gray-100">{title}</h1>
        {subtitle && <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{subtitle}</p>}
      </div>
      {action}
    </div>
  )
}
