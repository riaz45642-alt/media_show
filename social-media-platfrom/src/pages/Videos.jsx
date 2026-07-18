import { useEffect, useState } from 'react'
import PageHeader from '../components/common/PageHeader'
import VideoCard from '../components/cards/VideoCard'
import { SkeletonRow } from '../components/common/Skeleton'
import { VIDEOS } from '../data/videos'

export default function Videos() {
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 500)
    return () => clearTimeout(t)
  }, [])

  return (
    <div>
      <PageHeader title="Videos" subtitle="Fun, educational & fully moderated clips." />
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonRow key={i} />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3">
          {VIDEOS.map((v) => (
            <VideoCard key={v.id} video={v} />
          ))}
        </div>
      )}
    </div>
  )
}
