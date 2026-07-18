import { useState } from 'react'
import { Check, ChevronDown, Globe } from 'lucide-react'
import { useLanguage } from '../../context/LanguageContext'

export default function LanguageSwitcher() {
  const { lang, setLang, languages, t } = useLanguage()
  const [open, setOpen] = useState(false)

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="tap-scale flex items-center gap-2 rounded-full border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 px-3.5 py-2 text-sm font-medium text-gray-700 dark:text-gray-200"
      >
        <Globe size={15} className="text-primary" />
        {languages[lang]?.native}
        <ChevronDown size={14} className={`transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-50 mt-2 w-48 overflow-hidden rounded-2xl border border-gray-100 dark:border-white/10 bg-white dark:bg-[#161C2C] shadow-soft animate-scaleIn">
            {Object.entries(languages).map(([code, meta]) => (
              <button
                key={code}
                onClick={() => {
                  setLang(code)
                  setOpen(false)
                }}
                className="tap-scale flex w-full items-center justify-between px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-primary/5"
              >
                <span>
                  {meta.native} <span className="text-xs text-gray-400">· {meta.label}</span>
                </span>
                {lang === code && <Check size={15} className="text-primary" />}
              </button>
            ))}
          </div>
        </>
      )}
      <p className="sr-only">{t('language')}</p>
    </div>
  )
}
