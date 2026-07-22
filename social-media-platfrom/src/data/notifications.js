export const NOTIFICATIONS = [
  { id: 'n1', type: 'badge', category: 'system', text: 'You earned the "Kind Heart" badge!', time: '10m ago', read: false },
  { id: 'n2', type: 'like', category: 'likes', text: 'Maya R. and 12 others liked your post', time: '1h ago', read: false },
  { id: 'n3', type: 'comment', category: 'comments', text: 'Leo P. commented on your sketch', time: '3h ago', read: true },
  { id: 'n4', type: 'system', category: 'system', text: 'Your Media Show Score went up to 88!', time: '1d ago', read: true },
  { id: 'n5', type: 'reminder', category: 'system', text: 'Screen Time Reminder: you have been active for 45 minutes', time: '1d ago', read: true },
  { id: 'n6', type: 'mention', category: 'mentions', text: 'Nina T. mentioned you in a comment', time: '2h ago', read: false },
  { id: 'n7', type: 'follower', category: 'followers', text: 'Zoe H. started following you', time: '4h ago', read: false },
  { id: 'n8', type: 'message', category: 'messages', text: 'You have a new message from Study Group', time: '5h ago', read: true },
  { id: 'n9', type: 'moderation', category: 'moderation', text: 'Your post is under manual review', time: '6h ago', read: false },
  { id: 'n12', type: 'appeal', category: 'appeals', text: 'Your appeal for "Meme caption..." was approved', time: '3h ago', read: false },
  { id: 'n10', type: 'report', category: 'reports', text: 'A report you filed was resolved', time: '1d ago', read: true },
  { id: 'n11', type: 'security', category: 'security', text: 'New login detected from a new device', time: '2d ago', read: false },
]

export const NOTIFICATION_CATEGORIES = [
  { key: 'all', label: 'All' },
  { key: 'likes', label: 'Likes' },
  { key: 'comments', label: 'Comments' },
  { key: 'mentions', label: 'Mentions' },
  { key: 'followers', label: 'Followers' },
  { key: 'messages', label: 'Messages' },
  { key: 'moderation', label: 'Moderation' },
  { key: 'appeals', label: 'Appeals' },
  { key: 'reports', label: 'Reports' },
  { key: 'security', label: 'Security' },
  { key: 'system', label: 'System' },
]
