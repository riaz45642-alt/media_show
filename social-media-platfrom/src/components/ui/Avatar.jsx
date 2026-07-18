export default function Avatar({ name = 'U', src, color = '#4A90E2', size = 44, ring = false }) {
  const initials = name
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  const style = { width: size, height: size }

  if (src) {
    return (
      <img
        src={src}
        alt={name}
        style={style}
        className={`rounded-full object-cover ${ring ? 'ring-4 ring-primary/20' : ''}`}
      />
    )
  }

  return (
    <div
      style={{ ...style, backgroundColor: color }}
      className={`flex items-center justify-center rounded-full font-display font-semibold text-white ${ring ? 'ring-4 ring-primary/20' : ''}`}
    >
      <span style={{ fontSize: size * 0.38 }}>{initials}</span>
    </div>
  )
}
