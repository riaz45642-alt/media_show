export function SkeletonCard() {
  return (
    <div className="soft-card p-4 space-y-3">
      <div className="flex items-center gap-3">
        <div className="skeleton h-11 w-11 rounded-full" />
        <div className="flex-1 space-y-2">
          <div className="skeleton h-3 w-1/3 rounded-full" />
          <div className="skeleton h-2.5 w-1/5 rounded-full" />
        </div>
      </div>
      <div className="skeleton h-3 w-full rounded-full" />
      <div className="skeleton h-3 w-4/5 rounded-full" />
      <div className="skeleton h-32 w-full rounded-2xl" />
    </div>
  )
}

export function SkeletonRow() {
  return (
    <div className="flex items-center gap-3 p-3">
      <div className="skeleton h-14 w-20 rounded-xl shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="skeleton h-3 w-3/4 rounded-full" />
        <div className="skeleton h-2.5 w-1/2 rounded-full" />
      </div>
    </div>
  )
}
