import { useEffect, useState } from 'react'
import { Megaphone, ClipboardList, Plus } from 'lucide-react'
import * as groupService from '../../services/groupService'

export default function GroupEducation({ group }) {
  const [announcements, setAnnouncements] = useState([])
  const [assignments, setAssignments] = useState([])
  const [showAnnForm, setShowAnnForm] = useState(false)
  const [showAsgForm, setShowAsgForm] = useState(false)
  const canManage = ['owner', 'admin'].includes(group.my_role)

  const load = () => {
    groupService.listAnnouncements(group.id).then(setAnnouncements)
    groupService.listAssignments(group.id).then(setAssignments)
  }
  useEffect(load, [group.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const submitAnnouncement = async (e) => {
    e.preventDefault()
    const form = new FormData(e.target)
    await groupService.createAnnouncement(group.id, { title: form.get('title'), body: form.get('body') }).catch((err) => alert(err.message))
    setShowAnnForm(false)
    load()
  }

  const submitAssignment = async (e) => {
    e.preventDefault()
    const form = new FormData(e.target)
    await groupService.createAssignment(group.id, {
      title: form.get('title'),
      description: form.get('description'),
      dueAt: form.get('dueAt') ? new Date(form.get('dueAt')).toISOString() : null,
    }).catch((err) => alert(err.message))
    setShowAsgForm(false)
    load()
  }

  return (
    <div className="space-y-6">
      <section>
        <div className="mb-2 flex items-center justify-between">
          <h3 className="flex items-center gap-1.5 text-sm font-semibold text-gray-500"><Megaphone size={14} /> Announcements</h3>
          {canManage && <button onClick={() => setShowAnnForm((v) => !v)} className="flex items-center gap-1 text-xs font-medium text-primary"><Plus size={12} /> New</button>}
        </div>
        {showAnnForm && (
          <form onSubmit={submitAnnouncement} className="mb-3 space-y-2 rounded-lg border border-gray-100 p-3 dark:border-white/10">
            <input name="title" required placeholder="Title" className="w-full rounded-lg border border-gray-200 px-3 py-1.5 text-sm dark:border-white/10 dark:bg-white/5" />
            <textarea name="body" required placeholder="Announcement..." rows={2} className="w-full rounded-lg border border-gray-200 px-3 py-1.5 text-sm dark:border-white/10 dark:bg-white/5" />
            <button type="submit" className="rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-white">Post</button>
          </form>
        )}
        <div className="space-y-2">
          {announcements.map((a) => (
            <div key={a.id} className="rounded-lg border border-gray-100 p-3 dark:border-white/10">
              <p className="font-semibold">{a.title}</p>
              <p className="text-sm text-gray-500">{a.body}</p>
            </div>
          ))}
          {announcements.length === 0 && <p className="text-sm text-gray-400">No announcements yet.</p>}
        </div>
      </section>

      <section>
        <div className="mb-2 flex items-center justify-between">
          <h3 className="flex items-center gap-1.5 text-sm font-semibold text-gray-500"><ClipboardList size={14} /> Assignments</h3>
          {canManage && <button onClick={() => setShowAsgForm((v) => !v)} className="flex items-center gap-1 text-xs font-medium text-primary"><Plus size={12} /> New</button>}
        </div>
        {showAsgForm && (
          <form onSubmit={submitAssignment} className="mb-3 space-y-2 rounded-lg border border-gray-100 p-3 dark:border-white/10">
            <input name="title" required placeholder="Assignment title" className="w-full rounded-lg border border-gray-200 px-3 py-1.5 text-sm dark:border-white/10 dark:bg-white/5" />
            <textarea name="description" placeholder="Details..." rows={2} className="w-full rounded-lg border border-gray-200 px-3 py-1.5 text-sm dark:border-white/10 dark:bg-white/5" />
            <input name="dueAt" type="datetime-local" className="w-full rounded-lg border border-gray-200 px-3 py-1.5 text-sm dark:border-white/10 dark:bg-white/5" />
            <button type="submit" className="rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-white">Create</button>
          </form>
        )}
        <div className="space-y-2">
          {assignments.map((a) => (
            <div key={a.id} className="rounded-lg border border-gray-100 p-3 dark:border-white/10">
              <div className="flex items-center justify-between">
                <p className="font-semibold">{a.title}</p>
                {a.due_at && <span className="text-xs text-gray-400">Due {new Date(a.due_at).toLocaleDateString()}</span>}
              </div>
              {a.description && <p className="text-sm text-gray-500">{a.description}</p>}
            </div>
          ))}
          {assignments.length === 0 && <p className="text-sm text-gray-400">No assignments yet.</p>}
        </div>
      </section>
    </div>
  )
}
