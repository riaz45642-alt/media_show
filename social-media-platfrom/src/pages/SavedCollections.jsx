import { useState } from 'react'
import { FolderPlus, Trash2, Pencil, Bookmark, Check, X } from 'lucide-react'
import PageHeader from '../components/common/PageHeader'
import EmptyState from '../components/common/EmptyState'
import { usePosts } from '../context/PostsContext'

export default function SavedCollections() {
  const { collections, savedPosts, createCollection, renameCollection, deleteCollection, addToCollection } =
    usePosts()
  const [newName, setNewName] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [editValue, setEditValue] = useState('')
  const [activeId, setActiveId] = useState(null)

  const active = collections.find((c) => c.id === activeId)

  const handleCreate = (e) => {
    e.preventDefault()
    createCollection(newName)
    setNewName('')
  }

  const startEdit = (c) => {
    setEditingId(c.id)
    setEditValue(c.name)
  }

  const saveEdit = (id) => {
    renameCollection(id, editValue)
    setEditingId(null)
  }

  if (active) {
    const posts = savedPosts.filter((p) => active.postIds.includes(p.id))
    return (
      <div>
        <PageHeader title={active.name} subtitle={`${posts.length} saved post${posts.length === 1 ? '' : 's'}`} />
        <button onClick={() => setActiveId(null)} className="mb-4 text-sm font-semibold text-primary">
          ← All Collections
        </button>
        {posts.length === 0 ? (
          <EmptyState icon={Bookmark} title="Nothing here yet" description="Save posts into this collection from their post card." />
        ) : (
          <div className="grid grid-cols-3 gap-1.5">
            {posts.map((p) => (
              <div key={p.id} className="aspect-square overflow-hidden rounded-xl bg-gray-100 dark:bg-white/5">
                {p.media?.[0] && <img src={p.media[0]} alt="" className="h-full w-full object-cover" />}
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div>
      <PageHeader title="Saved Collections" subtitle="Organize your saved posts into folders." />

      <form onSubmit={handleCreate} className="soft-card mb-4 flex items-center gap-2 p-3">
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="New collection name…"
          className="flex-1 bg-transparent text-sm outline-none placeholder:text-gray-400"
        />
        <button type="submit" className="tap-scale flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary">
          <FolderPlus size={14} /> Create
        </button>
      </form>

      {collections.length === 0 ? (
        <EmptyState icon={Bookmark} title="No collections yet" description="Create your first collection above." />
      ) : (
        <div className="space-y-2.5">
          {collections.map((c) => (
            <div key={c.id} className="soft-card flex items-center gap-3 p-4 animate-slideUp">
              <button
                onClick={() => setActiveId(c.id)}
                className="flex flex-1 items-center gap-3 text-left"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Bookmark size={17} />
                </span>
                <div>
                  {editingId === c.id ? (
                    <input
                      autoFocus
                      value={editValue}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => setEditValue(e.target.value)}
                      className="rounded-md border border-gray-200 px-1.5 py-0.5 text-sm dark:bg-gray-800"
                    />
                  ) : (
                    <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">{c.name}</p>
                  )}
                  <p className="text-xs text-gray-400">{c.postIds.length} posts</p>
                </div>
              </button>
              {editingId === c.id ? (
                <>
                  <button onClick={() => saveEdit(c.id)} className="tap-scale text-secondary-dark"><Check size={16} /></button>
                  <button onClick={() => setEditingId(null)} className="tap-scale text-gray-400"><X size={16} /></button>
                </>
              ) : (
                <>
                  <button onClick={() => startEdit(c)} className="tap-scale text-gray-400 hover:text-gray-600"><Pencil size={15} /></button>
                  {c.id !== 'col-default' && (
                    <button onClick={() => deleteCollection(c.id)} className="tap-scale text-gray-400 hover:text-red-500"><Trash2 size={15} /></button>
                  )}
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
