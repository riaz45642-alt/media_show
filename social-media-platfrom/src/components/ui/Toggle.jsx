export default function Toggle({ checked, onChange, label, description }) {
  return (
    <div className="flex items-center justify-between gap-4 py-1">
      {(label || description) && (
        <div>
          {label && <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">{label}</p>}
          {description && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{description}</p>}
        </div>
      )}
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`tap-scale relative h-7 w-12 shrink-0 rounded-full transition-colors duration-300 ${checked ? 'bg-secondary' : 'bg-gray-300 dark:bg-white/10'}`}
      >
        <span
          className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow-md transition-transform duration-300 ${checked ? 'translate-x-5.5' : 'translate-x-0.5'}`}
        />
      </button>
    </div>
  )
}
