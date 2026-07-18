export default function Input({ label, icon: Icon, className = '', textarea = false, ...props }) {
  const Tag = textarea ? 'textarea' : 'input'
  return (
    <label className="block">
      {label && (
        <span className="mb-1.5 block text-sm font-medium text-gray-600 dark:text-gray-300">
          {label}
        </span>
      )}
      <div className="relative">
        {Icon && (
          <Icon className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4.5 w-4.5 text-gray-400" size={18} />
        )}
        <Tag
          className={`focus-ring w-full rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 px-4 py-3 text-sm text-gray-800 dark:text-gray-100 placeholder:text-gray-400 outline-none transition-shadow duration-200 ${Icon ? 'pl-10' : ''} ${textarea ? 'min-h-[100px] resize-none' : ''} ${className}`}
          {...props}
        />
      </div>
    </label>
  )
}
