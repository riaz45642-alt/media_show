import { useState } from 'react'
import { Moon, Bell, Focus, Timer, ShieldCheck, Globe, Lock } from 'lucide-react'
import PageHeader from '../components/common/PageHeader'
import Toggle from '../components/ui/Toggle'
import LanguageSwitcher from '../components/common/LanguageSwitcher'
import { useTheme } from '../context/ThemeContext'
import { useLanguage } from '../context/LanguageContext'
import { useAuth } from '../context/AuthContext'

export default function Settings() {
  const { theme, toggleTheme } = useTheme()
  const { t } = useLanguage()
  const { user, updateUser } = useAuth()
  const [notifs, setNotifs] = useState(true)
  const [focusMode, setFocusMode] = useState(false)
  const [screenReminder, setScreenReminder] = useState(true)
  const [shield, setShield] = useState(true)

  const isPrivate = user?.isPrivate ?? false

  const rows = [
    { icon: Moon, label: 'Dark Mode', description: 'Easier on the eyes at night', checked: theme === 'dark', onChange: toggleTheme },
    { icon: Bell, label: 'Notifications', description: 'Likes, comments & badge alerts', checked: notifs, onChange: setNotifs },
    { icon: Focus, label: 'Focus Mode', description: 'Hide non-essential content while studying', checked: focusMode, onChange: setFocusMode },
    { icon: Timer, label: 'Screen Time Reminder', description: 'Gentle nudge after 45 minutes', checked: screenReminder, onChange: setScreenReminder },
    { icon: ShieldCheck, label: 'Smart Ethical Shield', description: 'Automated safety moderation for all content you see', checked: shield, onChange: setShield },
    {
      icon: isPrivate ? Lock : Globe,
      label: 'Public Profile',
      description: isPrivate
        ? 'Off — only approved followers can see your posts & followers/following'
        : 'On — anyone can view your profile, posts & followers/following',
      checked: !isPrivate,
      onChange: (checked) => updateUser({ isPrivate: !checked }),
    },
  ]

  return (
    <div>
      <PageHeader title={t('settings')} subtitle={t('settings_subtitle')} />

      <div className="soft-card mb-4 flex items-center justify-between gap-3.5 p-4">
        <div className="flex items-center gap-3.5">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Globe size={17} />
          </span>
          <div>
            <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">{t('language')}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{t('language_desc')}</p>
          </div>
        </div>
        <LanguageSwitcher />
      </div>

      <div className="soft-card divide-y divide-gray-100 dark:divide-white/10">
        {rows.map(({ icon: Icon, label, description, checked, onChange }) => (
          <div key={label} className="flex items-center gap-3.5 p-4">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Icon size={17} />
            </span>
            <div className="flex-1">
              <Toggle checked={checked} onChange={onChange} label={label} description={description} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
