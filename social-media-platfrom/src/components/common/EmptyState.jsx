export default function EmptyState({ icon: Icon, title, description }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 px-6 animate-fadeIn">
      {Icon && (
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 animate-floatY">
          <Icon size={28} className="text-primary" />
        </div>
      )}
      <h3 className="font-display font-semibold text-gray-700 dark:text-gray-200">{title}</h3>
      {description && <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 max-w-xs">{description}</p>}
    </div>
  )
}
