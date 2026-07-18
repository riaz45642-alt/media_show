import { BookOpen, ArrowRight } from 'lucide-react'

export default function ArticleCard({ article }) {
  return (
    <div className="soft-card p-4 flex items-start gap-3.5 hover-lift cursor-pointer animate-slideUp">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-secondary/10 text-secondary-dark dark:text-secondary">
        <BookOpen size={18} />
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">{article.title}</p>
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 line-clamp-2">{article.excerpt}</p>
        <div className="mt-2 flex items-center gap-2 text-[11px] text-gray-400">
          <span>{article.readTime}</span>
          <span>•</span>
          <span>{article.tag}</span>
        </div>
      </div>
      <ArrowRight size={16} className="mt-1 text-gray-300" />
    </div>
  )
}
