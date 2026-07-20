const EMOJIS = [
  '😀', '😂', '🥰', '😍', '😊', '😉', '😎', '🤩', '🥳', '😇',
  '🙃', '😅', '🤗', '🤔', '😴', '😢', '😭', '😡', '🥺', '😱',
  '👍', '👎', '👏', '🙌', '🙏', '💪', '✌️', '🤝', '👋', '🫶',
  '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '💔', '💯',
  '🔥', '✨', '🎉', '🎊', '🌟', '⭐', '🌈', '☀️', '🌙', '⚡',
  '🐶', '🐱', '🦁', '🐼', '🦋', '🌸', '🌻', '🍀', '🍕', '🍩',
]

export default function EmojiPicker({ onSelect }) {
  return (
    <div className="soft-card absolute bottom-full right-0 mb-2 w-64 max-h-56 overflow-y-auto p-3 shadow-soft animate-scaleIn z-20">
      <div className="grid grid-cols-8 gap-1">
        {EMOJIS.map((e) => (
          <button
            key={e}
            type="button"
            onClick={() => onSelect(e)}
            className="tap-scale flex h-7 w-7 items-center justify-center rounded-lg text-lg hover:bg-primary/10"
          >
            {e}
          </button>
        ))}
      </div>
    </div>
  )
}
