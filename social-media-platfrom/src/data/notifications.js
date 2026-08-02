export const NOTIFICATIONS = []
export const NOTIFICATION_CATEGORIES = [
  { key: 'all', label: 'All' },
  { key: 'likes', label: 'Likes' },
  { key: 'comments', label: 'Comments' },
  { key: 'follows', label: 'Follows' },
  { key: 'messages', label: 'Messages' },
  { key: 'calls', label: 'Calls' },
  { key: 'mentions', label: 'Mentions' },
  { key: 'system', label: 'System' },
]

export const NOTIFICATION_PREFERENCES = [
  { key: 'enabled', label: 'All Notifications' },
  ...NOTIFICATION_CATEGORIES.filter(({ key }) => key !== 'all'),
  { key: 'stories', label: 'Stories' },
]
