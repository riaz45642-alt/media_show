import { useRef, useState } from 'react'
import { ImagePlus, X, ShieldAlert } from 'lucide-react'
import Modal from '../ui/Modal'
import Button from '../ui/Button'
import { usePosts } from '../../context/PostsContext'
import { useLanguage } from '../../context/LanguageContext'
import useModeration from '../../hooks/useModeration'

export default function CreatePostModal({ open, onClose }) {
  const { t } = useLanguage()
  const { addPost } = usePosts()
  const { checking, check } = useModeration()
  const fileRef = useRef(null)

  const [text, setText] = useState('')
  const [media, setMedia] = useState([]) // [{ type, src, file }]
  const [error, setError] = useState('')

  const reset = () => {
    setText('')
    setMedia([])
    setError('')
  }

  const handleClose = () => {
    // Discard: revoke any object URLs the user attached but never posted.
    media.forEach((m) => URL.revokeObjectURL(m.src))
    reset()
    onClose()
  }

  const handleFiles = (e) => {
    const files = Array.from(e.target.files || [])
    const items = files.map((file) => ({
      type: file.type.startsWith('video') ? 'video' : 'image',
      src: URL.createObjectURL(file),
      file,
    }))
    setMedia((prev) => {
      const combined = [...prev, ...items].slice(0, 6)
      // Revoke URLs for any files dropped by the 6-item cap so they don't leak.
      const dropped = [...prev, ...items].slice(6)
      dropped.forEach((m) => URL.revokeObjectURL(m.src))
      return combined
    })
    e.target.value = ''
  }

  const removeMedia = (idx) => {
    setMedia((prev) => {
      const target = prev[idx]
      if (target) URL.revokeObjectURL(target.src)
      return prev.filter((_, i) => i !== idx)
    })
  }

  const canPost = text.trim().length > 0 || media.length > 0

  const handleSubmit = async () => {
    setError('')
    const result = await check({ text, image: media[0]?.file })
    if (!result.safe) {
      setError(t('content_flagged'))
      return
    }
    const type = media.length === 0 ? 'text' : media.length > 1 ? 'mixed' : media[0].type
    addPost({ text, media: media.map(({ type: mt, src }) => ({ type: mt, src })), type })
    reset()
    onClose()
  }

  return (
    <Modal open={open} onClose={handleClose} title={t('create_post')}>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={t('write_caption')}
        rows={3}
        className="focus-ring w-full resize-none rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 px-4 py-3 text-sm text-gray-800 dark:text-gray-100 placeholder:text-gray-400 outline-none"
      />

      {media.length > 0 && (
        <div className="mt-3 grid grid-cols-3 gap-2">
          {media.map((m, i) => (
            <div key={i} className="relative aspect-square overflow-hidden rounded-xl bg-black/5">
              {m.type === 'video' ? (
                <video src={m.src} className="h-full w-full object-cover" muted />
              ) : (
                <img src={m.src} alt="" className="h-full w-full object-cover" />
              )}
              <button
                onClick={() => removeMedia(i)}
                className="tap-scale absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/50 text-white"
                aria-label={t('remove')}
              >
                <X size={13} />
              </button>
            </div>
          ))}
        </div>
      )}

      <input
        ref={fileRef}
        type="file"
        accept="image/*,video/*"
        multiple
        onChange={handleFiles}
        className="hidden"
      />

      <button
        onClick={() => fileRef.current?.click()}
        className="tap-scale mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-primary/30 py-3 text-sm font-medium text-primary hover:bg-primary/5"
      >
        <ImagePlus size={17} /> {t('add_photos_videos')}
      </button>

      {error && (
        <div className="mt-3 flex items-start gap-2 rounded-xl bg-red-50 dark:bg-red-900/10 p-3 text-xs text-red-500">
          <ShieldAlert size={16} className="mt-0.5 shrink-0" />
          <p>{error}</p>
        </div>
      )}

      <div className="mt-4 flex gap-2.5">
        <Button variant="ghost" className="flex-1" onClick={handleClose}>
          {t('cancel')}
        </Button>
        <Button variant="primary" className="flex-1" disabled={!canPost || checking} onClick={handleSubmit}>
          {checking ? t('checking_content') : t('post')}
        </Button>
      </div>
    </Modal>
  )
}
