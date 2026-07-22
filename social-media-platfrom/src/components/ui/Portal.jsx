import { createPortal } from 'react-dom'

// Renders children directly under <body>, bypassing whatever stacking
// context an ancestor might create (e.g. an element mid-animation with a
// transform). Without this, fixed-position overlays can end up trapped
// beneath other fixed elements like the bottom nav, even with a higher
// z-index, because z-index only competes within the nearest stacking
// context.
export default function Portal({ children }) {
  if (typeof document === 'undefined') return null
  return createPortal(children, document.body)
}
