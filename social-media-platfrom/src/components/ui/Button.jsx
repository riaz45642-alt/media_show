const VARIANTS = {
  primary: 'bg-primary text-white hover:bg-primary-dark shadow-soft',
  secondary: 'bg-secondary text-white hover:bg-secondary-dark shadow-soft',
  accent: 'bg-accent text-gray-900 hover:bg-accent-dark shadow-soft',
  outline: 'bg-transparent border-2 border-primary text-primary hover:bg-primary/10',
  ghost: 'bg-transparent text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5',
  danger: 'bg-red-500 text-white hover:bg-red-600 shadow-soft',
}

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  as: Tag = 'button',
  fullWidth = false,
  ...props
}) {
  const sizes = {
    sm: 'text-sm px-3.5 py-2',
    md: 'text-sm px-5 py-2.5',
    lg: 'text-base px-6 py-3.5',
  }
  return (
    <Tag
      className={`btn-press tap-scale focus-ring inline-flex items-center justify-center gap-2 rounded-full font-semibold transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${sizes[size]} ${VARIANTS[variant]} ${fullWidth ? 'w-full' : ''} ${className}`}
      {...props}
    >
      {children}
    </Tag>
  )
}
