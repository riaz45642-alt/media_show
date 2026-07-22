import { useEffect } from 'react'
import { Heart, MessageCircle, Share2, X } from 'lucide-react'
import { useLanguage } from '../../context/LanguageContext'
import Portal from '../ui/Portal'

export default function ExploreLightbox({ item, onClose }) {
  const { t } = useLanguage()

  useEffect(() => {
    if (!item) return
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
  }, [item, onClose])

  if (!item) return null

  return (
    <Portal>
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-900/70 backdrop-blur-sm p-0 sm:p-6 animate-fadeIn" onClick={onClose}>
      <div
        className="relative w-full sm:max-w-md soft-card overflow-hidden rounded-none sm:rounded-3xl animate-scaleIn max-h-full sm:max-h-[88vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="tap-scale absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-black/40 text-white"
        >
          <X size={18} />
        </button>

        <div className="aspect-square w-full bg-black">
          {item.type === 'video' ? (
            <video src={item.src} className="h-full w-full object-contain" controls autoPlay playsInline />
          ) : (
            <img src={item.src} alt="" className="h-full w-full object-contain" />
          )}
        </div>

        <div className="p-4 sm:p-5">
          <p className="text-sm text-gray-700 dark:text-gray-200">{item.caption}</p>
          {item.tag && (
            <span className="mt-2 inline-block rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
              #{item.tag}
            </span>
          )}
          <div className="mt-3.5 flex items-center gap-5 border-t border-gray-100 dark:border-white/10 pt-3">
            <span className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400">
              <Heart size={18} /> {item.likes} {t('like')}
            </span>
            <span className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400">
              <MessageCircle size={18} /> {item.comments}
            </span>
            <span className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400">
              <Share2 size={18} />
            </span>
          </div>
        </div>
      </div>
    </div>
    </Portal>
  )
}
