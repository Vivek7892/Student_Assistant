import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import {
  Calendar, Check, Clock, Edit3, ExternalLink, FolderOpen, Heart, Loader2,
  Plus, Search, Sparkles, Star, StickyNote, Tag, Trash2, X, Youtube,
} from 'lucide-react'
import { Badge, Button, Card, Skeleton } from '../../components/ui'
import { api } from '../../lib/api'

const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.07 } } }
const fadeUp = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { duration: 0.3 } } }

type ToastKind = 'success' | 'error'

interface Toast {
  id: number
  kind: ToastKind
  message: string
}

interface VideoMeta {
  url: string
  videoId: string
  title: string
  channel: string
  thumbnail: string
  duration: number
  durationFmt: string
  description: string
}

interface Video {
  id: string
  url: string
  videoId: string
  title: string
  thumbnailUrl: string
  channelName: string
  duration: string
  description: string
  folder: string
  notes: string
  tags: string[]
  favorite: boolean
  createdAt: string
}

interface VideoForm {
  notes: string
  tags: string
  folder: string
  newFolder: string
  favorite: boolean
}

const YOUTUBE_URL_RE = /^(https?:\/\/)?(www\.|m\.)?(youtube\.com\/(watch\?.*v=|embed\/|shorts\/|live\/)|youtu\.be\/)[A-Za-z0-9_-]{11}/i

function ytThumb(videoId: string) {
  return `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`
}

function normalizeVideo(d: any): Video {
  const folder = d.folder ?? d.folderId ?? d.collectionId ?? ''
  return {
    id: d.id,
    url: d.url ?? `https://www.youtube.com/watch?v=${d.videoId}`,
    videoId: d.videoId,
    title: d.title ?? 'Untitled video',
    thumbnailUrl: d.thumbnail ?? d.thumbnailUrl ?? ytThumb(d.videoId),
    channelName: d.channel ?? d.channelName ?? '',
    duration: d.durationFmt ?? (typeof d.duration === 'string' ? d.duration : ''),
    description: d.description ?? '',
    folder: folder ?? '',
    notes: d.notes ?? '',
    tags: Array.isArray(d.tags) ? d.tags : [],
    favorite: Boolean(d.favorite),
    createdAt: d.createdAt ?? '',
  }
}

function parseTags(value: string) {
  return value.split(',').map(tag => tag.trim()).filter(Boolean)
}

function formatDate(value: string) {
  if (!value) return 'Unknown date'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Unknown date'
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function videoPayload(meta: VideoMeta, form: VideoForm) {
  const folder = (form.newFolder.trim() || form.folder.trim())
  return {
    url: meta.url,
    videoId: meta.videoId,
    title: meta.title,
    thumbnail: meta.thumbnail,
    channel: meta.channel,
    duration: meta.duration,
    durationFmt: meta.durationFmt,
    description: meta.description,
    folder,
    folderId: folder,
    notes: form.notes,
    tags: parseTags(form.tags),
    favorite: form.favorite,
  }
}

function videoPayloadFromUrl(url: string, form: VideoForm) {
  const folder = (form.newFolder.trim() || form.folder.trim())
  return {
    url: url.trim(),
    folder,
    folderId: folder,
    notes: form.notes,
    tags: parseTags(form.tags),
    favorite: form.favorite,
  }
}

function ToastStack({ toasts }: { toasts: Toast[] }) {
  return (
    <div className="fixed right-4 top-4 z-[70] space-y-2">
      {toasts.map(toast => (
        <motion.div
          key={toast.id}
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className={`flex items-center gap-2 rounded-xl border px-4 py-3 text-sm shadow-lift ${
            toast.kind === 'success'
              ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300'
              : 'border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-300'
          }`}
        >
          {toast.kind === 'success' ? <Check size={16} /> : <X size={16} />}
          {toast.message}
        </motion.div>
      ))}
    </div>
  )
}

function MetadataPreview({ meta }: { meta: VideoMeta }) {
  return (
    <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)]">
      <div className="aspect-video w-full bg-black">
        <iframe
          title={meta.title}
          src={`https://www.youtube.com/embed/${meta.videoId}`}
          className="h-full w-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
      <div className="space-y-2 p-3">
        <div className="flex items-start gap-3">
          <img src={meta.thumbnail} alt="" className="h-14 w-24 rounded-lg object-cover" />
          <div className="min-w-0">
            <p className="line-clamp-2 text-sm font-semibold text-[var(--text-1)]">{meta.title}</p>
            <p className="mt-1 text-xs text-[var(--text-3)]">{meta.channel}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--text-3)]">
          <span className="inline-flex items-center gap-1"><Clock size={12} />{meta.durationFmt || 'Duration unavailable'}</span>
          <span className="inline-flex items-center gap-1"><Youtube size={12} />{meta.videoId}</span>
        </div>
        {meta.description && <p className="line-clamp-3 text-xs leading-relaxed text-[var(--text-2)]">{meta.description}</p>}
      </div>
    </div>
  )
}

function VideoModal({
  folders, initialVideo, onClose, onSaved,
}: {
  folders: string[]
  initialVideo?: Video | null
  onClose: () => void
  onSaved: (video: Video, mode: 'create' | 'update') => void
}) {
  const isEdit = Boolean(initialVideo)
  const [url, setUrl] = useState(initialVideo?.url ?? '')
  const [meta, setMeta] = useState<VideoMeta | null>(initialVideo ? {
    url: initialVideo.url,
    videoId: initialVideo.videoId,
    title: initialVideo.title,
    channel: initialVideo.channelName,
    thumbnail: initialVideo.thumbnailUrl,
    duration: 0,
    durationFmt: initialVideo.duration,
    description: initialVideo.description,
  } : null)
  const [form, setForm] = useState<VideoForm>({
    notes: initialVideo?.notes ?? '',
    tags: initialVideo?.tags.join(', ') ?? '',
    folder: initialVideo?.folder ?? '',
    newFolder: '',
    favorite: initialVideo?.favorite ?? false,
  })
  const [fetching, setFetching] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (isEdit) return
    setMeta(null)
    setError('')
    const trimmed = url.trim()
    if (!trimmed) return
    if (!YOUTUBE_URL_RE.test(trimmed)) {
      setError('Paste a valid YouTube watch, shorts, embed, or youtu.be URL.')
      return
    }
    const handle = window.setTimeout(async () => {
      setFetching(true)
      try {
        const res = await api.post('/api/videos/fetch/', { url: trimmed })
        setMeta(res.data)
      } catch (e: any) {
        setError(e.response?.data?.error ?? 'Could not fetch this video. It may be unavailable.')
      } finally {
        setFetching(false)
      }
    }, 450)
    return () => window.clearTimeout(handle)
  }, [url, isEdit])

  async function save() {
    if (!meta && !YOUTUBE_URL_RE.test(url.trim())) {
      setError('Paste a valid YouTube watch, shorts, live, embed, or youtu.be URL.')
      return
    }
    setSaving(true)
    setError('')
    try {
      if (isEdit && initialVideo) {
        const folder = form.newFolder.trim() || form.folder.trim()
        const res = await api.patch(`/api/videos/${initialVideo.id}/`, {
          notes: form.notes,
          tags: parseTags(form.tags),
          folder,
          folderId: folder,
          favorite: form.favorite,
        })
        onSaved(normalizeVideo(res.data), 'update')
      } else {
        const res = await api.post('/api/videos/', meta ? videoPayload(meta, form) : videoPayloadFromUrl(url, form))
        onSaved(normalizeVideo(res.data), 'create')
      }
      onClose()
    } catch (e: any) {
      setError(e.response?.data?.error ?? 'Failed to save video.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4 backdrop-blur-sm">
      <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}
        className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-lift">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h3 className="font-display text-lg font-semibold text-[var(--text-1)]">{isEdit ? 'Edit Video' : 'Add to Watch Later'}</h3>
            <p className="text-sm text-[var(--text-2)]">{isEdit ? 'Update your notes, tags, folder, and favorite status.' : 'Paste a YouTube link and StudyBuddy will fetch the details.'}</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-2 text-[var(--text-3)] hover:bg-[var(--surface-2)] hover:text-[var(--text-1)]" aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-3">
            <label className="block text-xs font-medium text-[var(--text-2)]">YouTube URL</label>
            <div className="relative">
              <Youtube size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-rose-500" />
              <input
                value={url}
                onChange={e => setUrl(e.target.value)}
                disabled={isEdit}
                placeholder="https://www.youtube.com/watch?v=..."
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-2)] py-2.5 pl-10 pr-3 text-sm text-[var(--text-1)] placeholder:text-[var(--text-3)] focus:border-[var(--primary)] focus:outline-none"
              />
              {fetching && <Loader2 size={16} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-[var(--primary)]" />}
            </div>

            {fetching && (
              <div className="flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-3 text-sm text-[var(--text-2)]">
                <Loader2 size={16} className="animate-spin text-[var(--primary)]" /> Fetching video metadata...
              </div>
            )}
            {meta && <MetadataPreview meta={meta} />}
          </div>

          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-[var(--text-2)]">Folder</label>
              <select
                value={form.folder}
                onChange={e => setForm(prev => ({ ...prev, folder: e.target.value, newFolder: '' }))}
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2.5 text-sm text-[var(--text-1)] focus:border-[var(--primary)] focus:outline-none"
              >
                <option value="">No folder</option>
                {folders.map(folder => <option key={folder} value={folder}>{folder}</option>)}
              </select>
            </div>
            <input
              value={form.newFolder}
              onChange={e => setForm(prev => ({ ...prev, newFolder: e.target.value, folder: '' }))}
              placeholder="Create new folder"
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2.5 text-sm text-[var(--text-1)] placeholder:text-[var(--text-3)] focus:border-[var(--primary)] focus:outline-none"
            />
            <input
              value={form.tags}
              onChange={e => setForm(prev => ({ ...prev, tags: e.target.value }))}
              placeholder="Tags, comma-separated"
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2.5 text-sm text-[var(--text-1)] placeholder:text-[var(--text-3)] focus:border-[var(--primary)] focus:outline-none"
            />
            <textarea
              value={form.notes}
              onChange={e => setForm(prev => ({ ...prev, notes: e.target.value }))}
              rows={6}
              placeholder="Notes"
              className="w-full resize-none rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2.5 text-sm text-[var(--text-1)] placeholder:text-[var(--text-3)] focus:border-[var(--primary)] focus:outline-none"
            />
            <label className="flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2.5 text-sm text-[var(--text-2)]">
              <input
                type="checkbox"
                checked={form.favorite}
                onChange={e => setForm(prev => ({ ...prev, favorite: e.target.checked }))}
                className="h-4 w-4 accent-primary-500"
              />
              Mark as favorite
            </label>
          </div>
        </div>

        {error && <p className="mt-4 rounded-xl bg-rose-500/10 px-3 py-2 text-sm text-rose-500">{error}</p>}

        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button variant="gradient" onClick={save} disabled={saving || fetching || (!meta && !YOUTUBE_URL_RE.test(url.trim()))}>
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
            {isEdit ? 'Save Changes' : 'Save Video'}
          </Button>
        </div>
      </motion.div>
    </div>
  )
}

function VideoCard({
  video, onEdit, onDelete, onToggleFav,
}: {
  video: Video
  onEdit: (video: Video) => void
  onDelete: (video: Video) => void
  onToggleFav: (video: Video) => void
}) {
  return (
    <motion.div variants={fadeUp}>
      <Card className="h-full overflow-hidden" hover>
        <a href={video.url} target="_blank" rel="noopener noreferrer" className="group relative block aspect-video bg-black">
          <img
            src={video.thumbnailUrl}
            alt={video.title}
            onError={e => { (e.currentTarget as HTMLImageElement).src = ytThumb(video.videoId) }}
            className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-[1.02]"
          />
          <span className="absolute inset-0 flex items-center justify-center bg-black/10 opacity-0 transition-opacity group-hover:opacity-100">
            <span className="rounded-full bg-white/95 p-3 text-rose-600 shadow-lift"><Youtube size={22} /></span>
          </span>
          {video.duration && <span className="absolute bottom-2 right-2 rounded-md bg-black/80 px-2 py-1 text-xs font-medium text-white">{video.duration}</span>}
        </a>
        <div className="space-y-3 p-4">
          <div>
            <h3 className="line-clamp-2 min-h-[2.75rem] text-sm font-semibold leading-snug text-[var(--text-1)]">{video.title}</h3>
            <p className="mt-1 truncate text-xs text-[var(--text-3)]">{video.channelName || 'Unknown channel'}</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {video.folder && <Badge color="primary" className="max-w-full"><FolderOpen size={12} /> <span className="truncate">{video.folder}</span></Badge>}
            <span className="inline-flex items-center gap-1 text-xs text-[var(--text-3)]"><Calendar size={12} />{formatDate(video.createdAt)}</span>
          </div>

          {video.notes && <p className="line-clamp-2 min-h-[2.5rem] text-xs leading-relaxed text-[var(--text-2)]"><StickyNote size={12} className="mr-1 inline" />{video.notes}</p>}

          <div className="flex min-h-6 flex-wrap gap-1.5">
            {video.tags.slice(0, 4).map(tag => (
              <span key={tag} className="inline-flex items-center gap-1 rounded-full bg-[var(--surface-2)] px-2 py-1 text-[11px] text-[var(--text-2)]">
                <Tag size={10} />{tag}
              </span>
            ))}
            {video.tags.length > 4 && <span className="text-[11px] text-[var(--text-3)]">+{video.tags.length - 4}</span>}
          </div>

          <div className="grid grid-cols-4 gap-2 pt-1">
            <a href={video.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center gap-1 rounded-xl bg-primary-500 px-2 py-2 text-xs font-medium text-white transition-colors hover:bg-primary-600">
              <ExternalLink size={13} /> Watch
            </a>
            <button onClick={() => onEdit(video)} className="inline-flex items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-2 text-[var(--text-2)] hover:text-[var(--text-1)]" aria-label="Edit">
              <Edit3 size={15} />
            </button>
            <button onClick={() => onToggleFav(video)} className={`inline-flex items-center justify-center rounded-xl border p-2 ${video.favorite ? 'border-amber-500/30 bg-amber-500/10 text-amber-500' : 'border-[var(--border)] bg-[var(--surface-2)] text-[var(--text-2)] hover:text-amber-500'}`} aria-label={video.favorite ? 'Unfavorite' : 'Favorite'}>
              <Star size={15} fill={video.favorite ? 'currentColor' : 'none'} />
            </button>
            <button onClick={() => onDelete(video)} className="inline-flex items-center justify-center rounded-xl border border-rose-500/20 bg-rose-500/10 p-2 text-rose-500 hover:bg-rose-500/15" aria-label="Delete">
              <Trash2 size={15} />
            </button>
          </div>
        </div>
      </Card>
    </motion.div>
  )
}

export default function Videos() {
  const [videos, setVideos] = useState<Video[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Video | null>(null)
  const [search, setSearch] = useState('')
  const [favoriteOnly, setFavoriteOnly] = useState(false)
  const [folderFilter, setFolderFilter] = useState('')
  const [toasts, setToasts] = useState<Toast[]>([])

  function toast(kind: ToastKind, message: string) {
    const id = Date.now()
    setToasts(prev => [...prev, { id, kind, message }])
    window.setTimeout(() => setToasts(prev => prev.filter(item => item.id !== id)), 3200)
  }

  useEffect(() => {
    api.get('/api/videos/')
      .then(res => setVideos(Array.isArray(res.data) ? res.data.map(normalizeVideo) : []))
      .catch(() => toast('error', 'Could not load saved videos.'))
      .finally(() => setLoading(false))
  }, [])

  const folders = useMemo(
    () => [...new Set(videos.map(video => video.folder).filter(Boolean))].sort(),
    [videos]
  )

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return videos.filter(video => {
      if (favoriteOnly && !video.favorite) return false
      if (folderFilter && video.folder !== folderFilter) return false
      if (!q) return true
      const haystack = [
        video.title,
        video.channelName,
        video.folder,
        video.notes,
        ...video.tags,
      ].join(' ').toLowerCase()
      return haystack.includes(q)
    })
  }, [videos, search, favoriteOnly, folderFilter])

  async function toggleFavorite(video: Video) {
    const favorite = !video.favorite
    setVideos(prev => prev.map(item => item.id === video.id ? { ...item, favorite } : item))
    try {
      const res = await api.patch(`/api/videos/${video.id}/`, { favorite })
      setVideos(prev => prev.map(item => item.id === video.id ? normalizeVideo(res.data) : item))
      toast('success', favorite ? 'Added to favorites.' : 'Removed from favorites.')
    } catch {
      setVideos(prev => prev.map(item => item.id === video.id ? video : item))
      toast('error', 'Could not update favorite status.')
    }
  }

  async function deleteVideo(video: Video) {
    if (!window.confirm(`Delete "${video.title}" from Watch Later?`)) return
    try {
      await api.delete(`/api/videos/${video.id}/`)
      setVideos(prev => prev.filter(item => item.id !== video.id))
      toast('success', 'Video deleted.')
    } catch {
      toast('error', 'Could not delete video.')
    }
  }

  function handleSaved(video: Video, mode: 'create' | 'update') {
    setVideos(prev => mode === 'create'
      ? [video, ...prev]
      : prev.map(item => item.id === video.id ? video : item)
    )
    toast('success', mode === 'create' ? 'Video saved to Watch Later.' : 'Video updated.')
  }

  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className="max-w-7xl space-y-6">
      <ToastStack toasts={toasts} />

      <motion.div variants={fadeUp} className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Youtube className="text-rose-500" size={24} />
            <h2 className="font-display text-2xl font-bold text-[var(--text-1)]">Watch Later</h2>
          </div>
          <p className="mt-1 text-sm text-[var(--text-2)]">{videos.length} saved videos for focused study sessions</p>
        </div>
        <Button variant="gradient" onClick={() => { setEditing(null); setModalOpen(true) }}>
          <Plus size={16} /> Add Video
        </Button>
      </motion.div>

      <motion.div variants={fadeUp} className="grid gap-3 sm:grid-cols-3">
        <Card className="p-4"><p className="text-xs text-[var(--text-3)]">Total</p><p className="mt-1 text-2xl font-bold text-[var(--text-1)]">{videos.length}</p></Card>
        <Card className="p-4"><p className="text-xs text-[var(--text-3)]">Favorites</p><p className="mt-1 text-2xl font-bold text-amber-500">{videos.filter(v => v.favorite).length}</p></Card>
        <Card className="p-4"><p className="text-xs text-[var(--text-3)]">Folders</p><p className="mt-1 text-2xl font-bold text-[var(--primary)]">{folders.length}</p></Card>
      </motion.div>

      <motion.div variants={fadeUp} className="flex flex-col gap-3 lg:flex-row">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-3)]" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search title, channel, folder, tags, or notes"
            className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-2)] py-2.5 pl-10 pr-3 text-sm text-[var(--text-1)] placeholder:text-[var(--text-3)] focus:border-[var(--primary)] focus:outline-none"
          />
        </div>
        <select
          value={folderFilter}
          onChange={e => setFolderFilter(e.target.value)}
          className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2.5 text-sm text-[var(--text-1)] focus:border-[var(--primary)] focus:outline-none"
        >
          <option value="">All folders</option>
          {folders.map(folder => <option key={folder} value={folder}>{folder}</option>)}
        </select>
        <button
          onClick={() => setFavoriteOnly(value => !value)}
          className={`inline-flex items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition-colors ${
            favoriteOnly
              ? 'border-amber-500/30 bg-amber-500/10 text-amber-500'
              : 'border-[var(--border)] bg-[var(--surface-2)] text-[var(--text-2)] hover:text-[var(--text-1)]'
          }`}
        >
          <Heart size={15} fill={favoriteOnly ? 'currentColor' : 'none'} /> Favorites
        </button>
      </motion.div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-80 rounded-2xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <motion.div variants={fadeUp}>
          <Card className="p-10 text-center">
            <Youtube size={38} className="mx-auto mb-3 text-rose-500/70" />
            <h3 className="font-display text-lg font-semibold text-[var(--text-1)]">
              {videos.length === 0 ? 'No videos saved yet' : 'No videos match your search'}
            </h3>
            <p className="mx-auto mt-2 max-w-md text-sm text-[var(--text-2)]">
              {videos.length === 0 ? 'Build a study queue by saving YouTube lessons with notes, tags, and folders.' : 'Try a different title, channel, folder, tag, or note.'}
            </p>
            {videos.length === 0 && (
              <Button variant="gradient" className="mt-5" onClick={() => { setEditing(null); setModalOpen(true) }}>
                <Plus size={16} /> Add Your First Video
              </Button>
            )}
          </Card>
        </motion.div>
      ) : (
        <motion.div variants={stagger} className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map(video => (
            <VideoCard
              key={video.id}
              video={video}
              onEdit={v => { setEditing(v); setModalOpen(true) }}
              onDelete={deleteVideo}
              onToggleFav={toggleFavorite}
            />
          ))}
        </motion.div>
      )}

      {modalOpen && (
        <VideoModal
          folders={folders}
          initialVideo={editing}
          onClose={() => { setModalOpen(false); setEditing(null) }}
          onSaved={handleSaved}
        />
      )}
    </motion.div>
  )
}
