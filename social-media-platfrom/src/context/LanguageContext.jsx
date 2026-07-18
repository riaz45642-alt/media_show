import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { translations, LANGUAGE_META } from '../i18n/translations'

const LanguageContext = createContext(null)

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState(() => localStorage.getItem('safezone_lang') || 'en')

  useEffect(() => {
    localStorage.setItem('safezone_lang', lang)
    const meta = LANGUAGE_META[lang] || LANGUAGE_META.en
    document.documentElement.lang = lang
    document.documentElement.dir = meta.dir
  }, [lang])

  const t = useMemo(() => {
    return (key, vars) => {
      const dict = translations[lang] || translations.en
      let str = dict[key] ?? translations.en[key] ?? key
      if (vars) {
        Object.entries(vars).forEach(([k, v]) => {
          str = str.replace(`{${k}}`, v)
        })
      }
      return str
    }
  }, [lang])

  const value = {
    lang,
    setLang,
    t,
    dir: (LANGUAGE_META[lang] || LANGUAGE_META.en).dir,
    languages: LANGUAGE_META,
  }

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
}

export const useLanguage = () => useContext(LanguageContext)
