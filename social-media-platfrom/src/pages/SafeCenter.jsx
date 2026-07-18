import { ShieldCheck, ScanText, ImageOff, MessageSquareWarning, Ban, Flag } from 'lucide-react'
import PageHeader from '../components/common/PageHeader'

const FEATURES = [
  { icon: ScanText, title: 'Text Filtering', desc: 'Scans posts, comments & messages for harmful language in real time.' },
  { icon: ImageOff, title: 'Image Filtering', desc: 'Detects and blocks inappropriate images before they are shown.' },
  { icon: MessageSquareWarning, title: 'Harmful Language Detection', desc: 'Flags bullying, hate speech and unsafe conversations.' },
  { icon: Ban, title: 'Automatic Blocking', desc: 'Unsafe content is blocked instantly, never shown to kids or teens.' },
  { icon: ShieldCheck, title: 'Safe-Content Badges', desc: 'Every verified post is marked with a Safe badge you can trust.' },
  { icon: Flag, title: 'Easy Reporting', desc: 'Report anything in one tap — reviewed by our team within 24h.' },
]

export default function SafeCenter() {
  return (
    <div>
      <PageHeader title="Safe Center" subtitle="Powered by the Smart Ethical Shield." />

      <div className="soft-card gradient-brand p-6 text-white mb-6 animate-scaleIn">
        <ShieldCheck size={30} />
        <h2 className="mt-3 font-display text-lg font-bold">Your Safety, Automated</h2>
        <p className="mt-1 text-sm text-white/85">
          Every piece of content on SafeZone passes through our AI moderation layer before it reaches you.
        </p>
      </div>

      <div className="space-y-3">
        {FEATURES.map(({ icon: Icon, title, desc }) => (
          <div key={title} className="soft-card p-4 flex items-start gap-3.5 hover-lift">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Icon size={18} />
            </span>
            <div>
              <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">{title}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
