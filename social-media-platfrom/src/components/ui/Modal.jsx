import { useEffect } from 'react'
import { X } from 'lucide-react'
import Portal from './Portal'

export default function Modal({ open, onClose, title, children }) {
  useEffect(() => {
    if (!open) return
    const onKeyDown = (e) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = prevOverflow
    }
  }, [open, onClose])

  if (!open) return null
  return (
    <Portal>
      <div
        className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-6"
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div
          className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm animate-fadeIn"
          onClick={onClose}
        />
        <div className="relative w-full sm:max-w-md soft-card animate-slideUp rounded-t-3xl sm:rounded-3xl p-6 max-h-[85vh] overflow-y-auto">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display font-semibold text-lg text-gray-800 dark:text-gray-100">{title}</h3>
            <button onClick={onClose} aria-label="Close" className="tap-scale rounded-full p-1.5 hover:bg-gray-100 dark:hover:bg-white/10">
              <X size={20} className="text-gray-500" />
            </button>
          </div>
          {children}
        </div>
      </div>
    </Portal>
  )
}
