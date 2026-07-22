import { ShieldCheck, Heart, Sparkles } from 'lucide-react'
import PageHeader from '../components/common/PageHeader'

export default function About() {
  return (
    <div>
      <PageHeader title="About Media Show" />
      <div className="soft-card p-6 space-y-5">
        <div className="flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl gradient-brand text-white shadow-soft">
            <ShieldCheck size={22} />
          </span>
          <div>
            <p className="font-display font-bold text-gray-800 dark:text-gray-100">Media Show</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Version 1.0.0</p>
          </div>
        </div>
        <p className="text-sm leading-relaxed text-gray-600 dark:text-gray-300">
          Media Show is an ad-free, safety-first space built for kids and teenagers to share ideas, watch
          educational videos, and learn — without the pressure of traditional social media. Every post
          passes through our Smart Ethical Shield before it's shown to anyone.
        </p>
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-secondary/10 p-4 text-center">
            <Heart size={18} className="mx-auto text-secondary-dark" />
            <p className="mt-1.5 text-xs font-medium text-gray-600 dark:text-gray-300">Ad-Free & Ethical</p>
          </div>
          <div className="rounded-2xl bg-accent/15 p-4 text-center">
            <Sparkles size={18} className="mx-auto text-accent-dark" />
            <p className="mt-1.5 text-xs font-medium text-gray-600 dark:text-gray-300">Built for Wellbeing</p>
          </div>
        </div>
        <p className="text-xs text-gray-400 text-center pt-2">Made with care for a kinder internet.</p>
      </div>
    </div>
  )
}
