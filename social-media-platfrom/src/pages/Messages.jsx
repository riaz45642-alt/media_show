import { useState } from 'react'
import { MessageCircle, ShieldCheck } from 'lucide-react'
import PageHeader from '../components/common/PageHeader'
import Avatar from '../components/ui/Avatar'
import EmptyState from '../components/common/EmptyState'
import ConversationView from '../components/messages/ConversationView'

const THREADS = [
  { id: 't1', name: 'Study Group', color: '#4A90E2', last: 'See you at the library!', time: '2h', unread: 2 },
  { id: 't2', name: 'Maya R.', color: '#2ECC71', last: 'That volcano project was awesome', time: '5h', unread: 0 },
  { id: 't3', name: 'Robotics Team', color: '#F1C40F', last: 'Practice moved to Friday', time: '1d', unread: 0 },
]

const SEED_MESSAGES = {
  t1: [
    { id: 't1-1', mine: false, text: "Don't forget notes for tomorrow!" },
    { id: 't1-2', mine: false, text: 'See you at the library!' },
  ],
  t2: [
    { id: 't2-1', mine: false, text: 'That volcano project was awesome' },
    { id: 't2-2', mine: true, text: 'Thank you! Yours too 🌋' },
  ],
  t3: [{ id: 't3-1', mine: false, text: 'Practice moved to Friday' }],
}

export default function Messages() {
  const [activeThread, setActiveThread] = useState(null)

  if (activeThread) {
    return (
      <ConversationView
        thread={activeThread}
        initialMessages={SEED_MESSAGES[activeThread.id] || []}
        onBack={() => setActiveThread(null)}
      />
    )
  }

  return (
    <div>
      <PageHeader title="Messages" subtitle="All chats are monitored by Smart Ethical Shield." />

      <div className="mb-5 flex items-center gap-2 rounded-2xl bg-secondary/10 p-3.5 text-xs text-secondary-dark dark:text-secondary">
        <ShieldCheck size={16} className="shrink-0" />
        Messages are automatically screened for safety in real time.
      </div>

      {THREADS.length === 0 ? (
        <EmptyState icon={MessageCircle} title="No conversations yet" description="Start chatting with friends safely." />
      ) : (
        <div className="space-y-2">
          {THREADS.map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveThread(t)}
              className="soft-card w-full flex items-center gap-3.5 p-4 text-left hover-lift animate-slideUp"
            >
              <Avatar name={t.name} color={t.color} size={46} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">{t.name}</p>
                  <span className="text-xs text-gray-400">{t.time}</span>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">{t.last}</p>
              </div>
              {t.unread > 0 && (
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-white">
                  {t.unread}
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
