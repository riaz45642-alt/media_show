import { useState } from 'react'
import { Link2, BookImage, SendHorizontal, Check } from 'lucide-react'
import Modal from '../ui/Modal'
import { useLanguage } from '../../context/LanguageContext'
import { usePosts } from '../../context/PostsContext'

export default function ShareSheet({ post, open, onClose }) {
  const { t } = useLanguage()
  const { incrementShare } = usePosts()
  const [copied, setCopied] = useState(false)

  if (!post) return null

  const handleAction = async (kind) => {
    incrementShare(post.id)
    if (kind === 'copy') {
      try {
        await navigator.clipboard.writeText(`https://safezone.app/post/${post.id}`)
      } catch {
        /* clipboard may be unavailable in sandboxed preview — ignore */
      }
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
      return
    }
    onClose()
  }

  const options = [
    { key: 'copy', icon: copied ? Check : Link2, label: copied ? t('link_copied') : t('copy_link') },
    { key: 'story', icon: BookImage, label: t('share_to_story') },
    { key: 'message', icon: SendHorizontal, label: t('send_in_message') },
  ]

  return (
    <Modal open={open} onClose={onClose} title={t('share_post')}>
      <div className="grid grid-cols-3 gap-3">
        {options.map(({ key, icon: Icon, label }) => (
          <button
            key={key}
            onClick={() => handleAction(key)}
            className="tap-scale flex flex-col items-center gap-2 rounded-2xl border border-gray-100 dark:border-white/10 p-4 hover-lift"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Icon size={18} />
            </span>
            <span className="text-center text-[11px] font-medium text-gray-600 dark:text-gray-300">{label}</span>
          </button>
        ))}
      </div>
    </Modal>
  )
}
