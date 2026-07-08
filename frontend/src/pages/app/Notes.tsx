import { useEffect, useMemo, useState } from 'react'
import { BookOpen, Heart, Pin, Plus, Search, Trash2 } from 'lucide-react'
import { Badge, Button, Card, Input } from '../../components/ui'
import { api } from '../../lib/api'
import { formatDate } from '../../lib/utils'

interface Note {
  id: string
  title: string
  subject_label: string
  color: string
  tags: string[]
  content: string
  pinned: boolean
  favorite: boolean
  updated_at: string
  token: string
}

const emptyNote = {
  title: 'Untitled note',
  subject_label: 'General',
  color: 'primary',
  tags: [],
  content: '# New note\nStart writing...',
  pinned: false,
  favorite: false,
}

export default function Notes() {
  const [notes, setNotes] = useState<Note[]>([])
  const [active, setActive] = useState<Note | null>(null)
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)

  async function load() {
    setLoading(true)
    try {
      const res = await api.get('/api/ai/notes/')
      setNotes(Array.isArray(res.data) ? res.data : res.data.results ?? [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const filtered = useMemo(() => notes.filter(note =>
    `${note.title} ${note.subject_label} ${note.tags.join(' ')} ${note.content}`.toLowerCase().includes(query.toLowerCase()),
  ), [notes, query])

  async function create() {
    const res = await api.post('/api/ai/notes/', emptyNote)
    setNotes(current => [res.data, ...current])
    setActive(res.data)
  }

  async function save(id: string, patch: Partial<Note>) {
    const res = await api.patch(`/api/ai/notes/${id}/`, patch)
    setNotes(current => current.map(note => note.id === id ? res.data : note))
    setActive(res.data)
  }

  async function remove(id: string) {
    await api.delete(`/api/ai/notes/${id}/`)
    setNotes(current => current.filter(note => note.id !== id))
    setActive(null)
  }

  return (
    <div className="space-y-5 pb-20 md:pb-0">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div>
          <h2 className="font-display text-xl font-bold text-[var(--text-1)]">Notes Library</h2>
          <p className="text-sm text-[var(--text-2)]">Private notes saved to your account.</p>
        </div>
        <Button variant="gradient" className="sm:ml-auto" onClick={create}><Plus size={15} /> New Note</Button>
      </div>

      <Input icon={<Search size={14} />} placeholder="Search notes..." value={query} onChange={e => setQuery(e.target.value)} />

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {loading && <Card className="col-span-full p-6 text-sm text-[var(--text-2)]">Loading notes...</Card>}
        {!loading && filtered.map(note => (
          <Card key={note.id} hover className="p-4" onClick={() => setActive(note)}>
            <div className="flex items-start gap-2">
              <Badge color={note.color}>{note.subject_label || 'General'}</Badge>
              <div className="ml-auto flex gap-1 text-[var(--text-3)]">
                {note.pinned && <Pin size={13} />}
                {note.favorite && <Heart size={13} className="text-rose-500" />}
              </div>
            </div>
            <h3 className="mt-3 line-clamp-1 font-display text-base font-semibold text-[var(--text-1)]">{note.title}</h3>
            <p className="mt-2 line-clamp-3 min-h-[3.75rem] text-sm leading-relaxed text-[var(--text-2)]">{note.content.replace(/[#*_`>\-[\]()]/g, ' ')}</p>
            <div className="mt-3 flex flex-wrap gap-1">{note.tags.map(tag => <span key={tag} className="rounded-full bg-[var(--surface-2)] px-2 py-0.5 text-xs text-[var(--text-3)]">#{tag}</span>)}</div>
            <div className="mt-4 flex items-center justify-between text-xs text-[var(--text-3)]"><span>Token {note.token.slice(0, 8)}</span><span>Edited {formatDate(note.updated_at)}</span></div>
          </Card>
        ))}
        {!loading && filtered.length === 0 && (
          <div className="col-span-full rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface)] p-10 text-center">
            <BookOpen size={30} className="mx-auto text-[var(--text-3)]" />
            <h3 className="mt-3 font-display font-semibold">No notes yet</h3>
            <p className="mt-1 text-sm text-[var(--text-2)]">Create your first saved note.</p>
          </div>
        )}
      </div>

      {active && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
          <Card className="max-h-[92vh] w-full max-w-2xl overflow-y-auto p-5">
            <input value={active.title} onChange={e => save(active.id, { title: e.target.value })} className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 font-display text-lg font-semibold outline-none" />
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <input value={active.subject_label} onChange={e => save(active.id, { subject_label: e.target.value || 'General' })} className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm outline-none" />
              <input value={active.tags.join(', ')} onChange={e => save(active.id, { tags: e.target.value.split(',').map(t => t.trim()).filter(Boolean) })} placeholder="tags" className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm outline-none" />
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button variant={active.pinned ? 'gradient' : 'secondary'} size="sm" onClick={() => save(active.id, { pinned: !active.pinned })}><Pin size={14} /> Pin</Button>
              <Button variant={active.favorite ? 'gradient' : 'secondary'} size="sm" onClick={() => save(active.id, { favorite: !active.favorite })}><Heart size={14} /> Favorite</Button>
              <Button variant="ghost" size="sm" className="ml-auto text-rose-500" onClick={() => remove(active.id)}><Trash2 size={14} /> Delete</Button>
              <Button variant="secondary" size="sm" onClick={() => setActive(null)}>Close</Button>
            </div>
            <textarea value={active.content} onChange={e => save(active.id, { content: e.target.value })} rows={14} className="mt-3 w-full resize-none rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-3 font-mono text-sm text-[var(--text-1)] outline-none" />
          </Card>
        </div>
      )}
    </div>
  )
}
