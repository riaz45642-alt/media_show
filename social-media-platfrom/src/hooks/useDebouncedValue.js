import { useEffect, useState } from 'react'

/**
 * Returns a debounced copy of `value` that only updates after `delay`ms
 * of no further changes. Used to avoid re-filtering/re-fetching on every
 * keystroke in search inputs.
 */
export default function useDebouncedValue(value, delay = 250) {
  const [debounced, setDebounced] = useState(value)

  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])

  return debounced
}
