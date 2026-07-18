import { useState } from 'react'
import { Search } from 'lucide-react'
import PageHeader from '../components/common/PageHeader'
import ArticleCard from '../components/cards/ArticleCard'
import VideoCard from '../components/cards/VideoCard'
import EmptyState from '../components/common/EmptyState'
import { ARTICLES } from '../data/articles'
import { VIDEOS } from '../data/videos'

const CATEGORIES = ['All', 'Educational', 'Wellness', 'STEM', 'Safety', 'DIY']

export default function Explore() {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('All')

  const filteredArticles = ARTICLES.filter(
    (a) =>
      (category === 'All' || a.tag === category) &&
      a.title.toLowerCase().includes(query.toLowerCase())
  )
  const filteredVideos = VIDEOS.filter(
    (v) =>
      (category === 'All' || v.tag === category) &&
      v.title.toLowerCase().includes(query.toLowerCase())
  )
  const noResults = filteredArticles.length === 0 && filteredVideos.length === 0

  return (
    <div>
      <PageHeader title="Explore" subtitle="Discover educational content curated for you." />

      <div className="relative mb-4">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search articles, videos & topics..."
          className="focus-ring w-full rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 py-3 pl-11 pr-4 text-sm outline-none"
        />
      </div>

      <div className="mb-6 flex gap-2 overflow-x-auto pb-1 no-scrollbar">
        {CATEGORIES.map((c) => (
          <button
            key={c}
            onClick={() => setCategory(c)}
            className={`tap-scale shrink-0 rounded-full px-4 py-2 text-xs font-semibold transition-colors duration-300 ${
              category === c ? 'bg-primary text-white' : 'bg-white dark:bg-white/5 text-gray-500 dark:text-gray-300 border border-gray-100 dark:border-white/10'
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      {noResults ? (
        <EmptyState icon={Search} title="No results found" description="Try a different search term or category." />
      ) : (
        <>
          {filteredVideos.length > 0 && (
            <div className="mb-6">
              <p className="mb-2 text-sm font-semibold text-gray-700 dark:text-gray-200">Videos</p>
              <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3">
                {filteredVideos.map((v) => (
                  <VideoCard key={v.id} video={v} />
                ))}
              </div>
            </div>
          )}
          {filteredArticles.length > 0 && (
            <div>
              <p className="mb-2 text-sm font-semibold text-gray-700 dark:text-gray-200">Articles</p>
              <div className="space-y-3">
                {filteredArticles.map((a) => (
                  <ArticleCard key={a.id} article={a} />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
