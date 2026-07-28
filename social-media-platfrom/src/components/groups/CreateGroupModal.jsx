import { useState } from 'react'
import Modal from '../ui/Modal'
import Button from '../ui/Button'
import * as groupService from '../../services/groupService'

const CATEGORIES = ['General', 'Mathematics', 'Science', 'Programming', 'English', 'School Class', 'University Course', 'Sports', 'Art & Design', 'Other']

export default function CreateGroupModal({ open, onClose, onCreated }) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('General')
  const [privacy, setPrivacy] = useState('public')
  const [isEducational, setIsEducational] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const reset = () => {
    setName(''); setDescription(''); setCategory('General'); setPrivacy('public'); setIsEducational(false); setError('')
  }

  const handleClose = () => { reset(); onClose() }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!name.trim()) return setError('Group name is required')
    setSaving(true)
    setError('')
    try {
      await groupService.createGroup({ name: name.trim(), description, category, privacy, isEducational })
      onCreated?.()
      handleClose()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={open} onClose={handleClose} title="Create a group">
      <form onSubmit={handleSubmit} className="space-y-3 p-4">
        <h2 className="font-display text-lg font-bold">Create a group</h2>

        <div>
          <label className="mb-1 block text-sm font-medium">Group name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} maxLength={100}
            className="w-full rounded-lg border border-gray-200 bg-white/70 px-3 py-2 text-sm dark:border-white/10 dark:bg-white/5" />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">Description</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} maxLength={1000} rows={3}
            className="w-full rounded-lg border border-gray-200 bg-white/70 px-3 py-2 text-sm dark:border-white/10 dark:bg-white/5" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-sm font-medium">Category</label>
            <select value={category} onChange={(e) => setCategory(e.target.value)}
              className="w-full rounded-lg border border-gray-200 bg-white/70 px-3 py-2 text-sm dark:border-white/10 dark:bg-white/5">
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Privacy</label>
            <select value={privacy} onChange={(e) => setPrivacy(e.target.value)}
              className="w-full rounded-lg border border-gray-200 bg-white/70 px-3 py-2 text-sm dark:border-white/10 dark:bg-white/5">
              <option value="public">Public</option>
              <option value="private">Private</option>
            </select>
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={isEducational} onChange={(e) => setIsEducational(e.target.checked)} />
          This is an educational group (notes, assignments, announcements)
        </label>

        {error && <p className="text-sm text-red-500">{error}</p>}

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={handleClose}>Cancel</Button>
          <Button type="submit" disabled={saving}>{saving ? 'Creating...' : 'Create group'}</Button>
        </div>
      </form>
    </Modal>
  )
}
