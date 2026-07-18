import { useEffect, useRef, useState, useCallback } from 'react'
import { Search } from 'lucide-react'
import PageHeader from '../components/common/PageHeader'
import EmptyState from '../components/common/EmptyState'
import ExploreTile from '../components/explore/ExploreTile'
import ExploreLightbox from '../components/explore/ExploreLightbox'
import { generateExploreItems } from '../data/explore'
import { useLanguage } from '../context/LanguageContext'

const CATEGORIES = ['All', 'Educational', 'Wellness', 'STEM', 'Safety', 'DIY', 'Art', 'Outdoors', 'Kindness']

export default function Explore() {
  const { t } = useLanguage()
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('All')
  const [items, setItems] = useState(() => generateExploreItems(0))
  const [page, setPage] = useState(0)
  const [loadingMore, setLoadingMore] = useState(false)
  const [active, setActive] = useState(null)
  const sentinelRef = useRef(null)

  const loadMore = useCallback(() => {
    setLoadingMore(true)
    // Simulate a network round-trip for a smooth, natural infinite-scroll feel.
    setTimeout(() => {
      setPage((p) => {
        const next = p + 1
        setItems((prev) => [...prev, ...generateExploreItems(next)])
        return next
      })
      setLoadingMore(false)
    }, 500)
  }, [])

  useEffect(() => {
    const el = sentinelRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !loadingMore) loadMore()
      },
      { rootMargin: '400px' }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [loadMore, loadingMore])

  const filtered = items.filter(
    (i) =>
      (category === 'All' || i.tag === category) &&
      i.caption.toLowerCase().includes(query.toLowerCase())
  )

  return (
    <div>
      <PageHeader title={t('explore_title')} subtitle={t('explore_subtitle')} />

      <div className="relative mb-4">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('search_placeholder')}
          className="focus-ring w-full rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 py-3 pl-11 pr-4 text-sm outline-none"
        />
      </div>

      <div className="mb-5 flex gap-2 overflow-x-auto pb-1 no-scrollbar">
        {CATEGORIES.map((c) => (
          <button
            key={c}
            onClick={() => setCategory(c)}
            className={`tap-scale shrink-0 rounded-full px-4 py-2 text-xs font-semibold transition-colors duration-300 ${
              category === c
                ? 'bg-primary text-white'
                : 'bg-white dark:bg-white/5 text-gray-500 dark:text-gray-300 border border-gray-100 dark:border-white/10'
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={Search} title={t('no_results')} description={t('no_results_desc')} />
      ) : (
        <>
          <div className="columns-2 sm:columns-3 gap-3">
            {filtered.map((item) => (
              <ExploreTile key={item.id} item={item} onOpen={setActive} />
            ))}
          </div>

          <div ref={sentinelRef} className="h-10" />

          {loadingMore && (
            <div className="columns-2 sm:columns-3 gap-3 mt-1">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="skeleton mb-3 aspect-square w-full break-inside-avoid rounded-2xl" />
              ))}
            </div>
          )}
        </>
      )}

      <ExploreLightbox item={active} onClose={() => setActive(null)} />
    </div>
  )
}
