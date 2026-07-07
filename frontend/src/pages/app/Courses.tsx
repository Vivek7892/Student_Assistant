import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  Youtube, Plus, Trash2, X, Clock, Eye, Star, Search,
  BookmarkCheck, Tag, StickyNote, FolderOpen,
} from 'lucide-react'
import { Card, Badge, Button, Skeleton } from '../../components/ui'
import { api } from '../../lib/api'

const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.07 } } }
const fadeUp  = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { duration: 0.3 } } }
const YT_API_KEY = (import.meta as any).env?.VITE_YOUTUBE_API_KEY ?? ''

// ── helpers ──────────────────────────────────────────────────────────────────
function extractYtId(url: string) {
  const m = url.match(/(?:v=|youtu\.be\/|embed\/)([-\w]{11})/)
  return m ? m[1] : null
}

function formatDuration(iso: string) {
  const m = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/)
  if (!m) return ''
  return [m[1] ? m[1].padStart(2, '0') : null, (m[2] ?? '0').padStart(2, '0'), (m[3] ?? '0').padStart(2, '0')]
    .filter(Boolean).join(':')
}

function fmtViews(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}K`
  return String(n)
}

async function fetchYtMeta(ytId: string) {
  const thumb = `https://img.youtube.com/vi/${ytId}/mqdefault.jpg`
  if (!YT_API_KEY || YT_API_KEY === 'your-youtube-api-key') {
    return { youtubeId: ytId, title: `YouTube Video (${ytId})`, thumbnailUrl: thumb,
      channelName: '', duration: '', videoUrl: `https://www.youtube.com/watch?v=${ytId}`, viewCount: 0 }
  }
  const r = await fetch(
    `https://www.googleapis.com/youtube/v3/videos?id=${ytId}&part=snippet,contentDetails,statistics&key=${YT_API_KEY}`
  ).then(x => x.json())
  const item = r.items?.[0]
  if (!item) throw new Error('Video not found')
  return {
    youtubeId:    ytId,
    title:        item.snippet.title,
    description:  item.snippet.description ?? '',
    channelName:  item.snippet.channelTitle,
    thumbnailUrl: item.snippet.thumbnails?.medium?.url ?? thumb,
    duration:     formatDuration(item.contentDetails.duration),
    publishedAt:  item.snippet.publishedAt,
    videoUrl:     `https://www.youtube.com/watch?v=${ytId}`,
    viewCount:    parseInt(item.statistics?.viewCount ?? '0'),
  }
}

// ── types ─────────────────────────────────────────────────────────────────────
interface Video {
  id: string
  youtubeId: string
  title: string
  description?: string
  channelName?: string
  thumbnailUrl: string
  duration?: string
  publishedAt?: string
  videoUrl: string
  tags: string[]
  notes: string
  favorite: boolean
  collectionId?: string
  createdAt: string
}

// ── AddVideoModal ─────────────────────────────────────────────────────────────
function AddVideoModal({ collections, onAdd, onClose }: {
  collections: string[]
  onAdd: (v: Video) => void
  onClose: () => void
}) {
  const [url,        setUrl]        = useState('')
  const [tags,       setTags]       = useState('')
  const [notes,      setNotes]      = useState('')
  const [collection, setCollection] = useState('')
  const [newCol,     setNewCol]     = useState('')
  const [loading,    setLoading]    = useState(false)
  const [error,      setError]      = useState('')

  async function submit() {
    if (!url.trim()) return
    setLoading(true); setError('')
    try {
      const ytId = extractYtId(url.trim())
      if (!ytId) { setError('Invalid YouTube URL'); return }
      const meta = await fetchYtMeta(ytId)
      const col  = newCol.trim() || collection || undefined
      const r = await api.post('/api/videos/', {
        ...meta,
        tags:         tags.split(',').map(t => t.trim()).filter(Boolean),
        notes:        notes.trim(),
        collectionId: col,
      })
      onAdd(r.data)
      onClose()
    } catch (e: any) {
      setError(e.response?.data?.detail ?? e.message ?? 'Failed to add video')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md glass rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-display font-semibold text-[var(--text-1)]">Add YouTube Video</h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-[var(--surface-2)] text-[var(--text-2)]"><X size={16} /></button>
        </div>

        <input type="url" value={url} onChange={e => setUrl(e.target.value)}
          placeholder="https://www.youtube.com/watch?v=..."
          className="w-full px-3 py-2.5 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] text-sm text-[var(--text-1)] placeholder:text-[var(--text-3)] focus:outline-none focus:border-[var(--primary)] transition-colors"
          onKeyDown={e => e.key === 'Enter' && submit()}
        />

        {/* Collection */}
        <div className="grid grid-cols-2 gap-2">
          <select value={collection} onChange={e => setCollection(e.target.value)}
            className="px-3 py-2.5 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] text-sm text-[var(--text-1)] focus:outline-none focus:border-[var(--primary)] transition-colors">
            <option value="">No collection</option>
            {collections.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <input value={newCol} onChange={e => setNewCol(e.target.value)}
            placeholder="Or new collection…"
            className="px-3 py-2.5 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] text-sm text-[var(--text-1)] placeholder:text-[var(--text-3)] focus:outline-none focus:border-[var(--primary)] transition-colors"
          />
        </div>

        <input value={tags} onChange={e => setTags(e.target.value)}
          placeholder="Tags (comma-separated)"
          className="w-full px-3 py-2.5 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] text-sm text-[var(--text-1)] placeholder:text-[var(--text-3)] focus:outline-none focus:border-[var(--primary)] transition-colors"
        />
        <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
          placeholder="Notes…"
          className="w-full px-3 py-2.5 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] text-sm text-[var(--text-1)] placeholder:text-[var(--text-3)] focus:outline-none focus:border-[var(--primary)] resize-none transition-colors"
        />

        {error && <p className="text-xs text-rose-500">{error}</p>}
        <div className="flex gap-2 justify-end">
          <Button variant="secondary" size="sm" onClick={onClose}>Cancel</Button>
          <Button variant="gradient" size="sm" onClick={submit} disabled={loading || !url.trim()}>
            {loading ? 'Fetching…' : 'Add Video'}
          </Button>
        </div>
      </motion.div>
    </div>
  )
}

// ── VideoCard ─────────────────────────────────────────────────────────────────
function VideoCard({ video, onDelete, onToggleFav }: {
  video: Video
  onDelete: (id: string) => void
  onToggleFav: (id: string, fav: boolean) => void
}) {
  return (
    <motion.div variants={fadeUp}
      className="flex gap-3 p-3 rounded-xl hover:bg-[var(--surface-2)] transition-colors group">
      <a href={video.videoUrl} target="_blank" rel="noopener noreferrer" className="shrink-0">
        <img src={video.thumbnailUrl} alt={video.title}
          className="w-24 sm:w-32 h-[54px] sm:h-[72px] object-cover rounded-lg" />
      </a>
      <div className="flex-1 min-w-0">
        <a href={video.videoUrl} target="_blank" rel="noopener noreferrer"
          className="text-sm font-medium text-[var(--text-1)] hover:text-[var(--primary)] line-clamp-2 leading-snug">
          {video.title}
        </a>
        {video.channelName && (
          <p className="text-xs text-[var(--text-3)] mt-0.5">{video.channelName}</p>
        )}
        <div className="flex flex-wrap items-center gap-2 mt-1.5">
          {video.duration && (
            <span className="flex items-center gap-1 text-xs text-[var(--text-3)]">
              <Clock size={11} /> {video.duration}
            </span>
          )}
          {video.collectionId && (
            <span className="flex items-center gap-1 text-xs text-[var(--text-3)]">
              <FolderOpen size={11} /> {video.collectionId}
            </span>
          )}
          {video.tags.map(t => (
            <span key={t} className="flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-full bg-[var(--surface-3)] text-[var(--text-3)]">
              <Tag size={9} /> {t}
            </span>
          ))}
        </div>
        {video.notes && (
          <p className="flex items-start gap-1 text-xs text-[var(--text-3)] mt-1 line-clamp-1">
            <StickyNote size={10} className="mt-0.5 shrink-0" /> {video.notes}
          </p>
        )}
      </div>
      <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-all">
        <button onClick={() => onToggleFav(video.id, !video.favorite)}
          className={`p-1.5 rounded-lg transition-colors ${video.favorite ? 'text-amber-400' : 'hover:bg-[var(--surface-3)] text-[var(--text-3)]'}`}>
          <Star size={14} fill={video.favorite ? 'currentColor' : 'none'} />
        </button>
        <button onClick={() => onDelete(video.id)}
          className="p-1.5 rounded-lg hover:bg-rose-500/10 text-rose-500 transition-colors">
          <Trash2 size={14} />
        </button>
      </div>
    </motion.div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function Videos() {
  const [videos,      setVideos]      = useState<Video[]>([])
  const [loading,     setLoading]     = useState(true)
  const [showModal,   setShowModal]   = useState(false)
  const [search,      setSearch]      = useState('')
  const [filterCol,   setFilterCol]   = useState('')
  const [filterFav,   setFilterFav]   = useState(false)

  useEffect(() => {
    api.get('/api/videos/')
      .then(r => setVideos(Array.isArray(r.data) ? r.data : []))
      .catch(() => setVideos([]))
      .finally(() => setLoading(false))
  }, [])

  async function deleteVideo(id: string) {
    await api.delete(`/api/videos/${id}/`)
    setVideos(v => v.filter(x => x.id !== id))
  }

  async function toggleFav(id: string, fav: boolean) {
    await api.patch(`/api/videos/${id}/`, { favorite: fav })
    setVideos(v => v.map(x => x.id === id ? { ...x, favorite: fav } : x))
  }

  const collections = [...new Set(videos.map(v => v.collectionId).filter(Boolean))] as string[]

  const filtered = videos.filter(v => {
    if (filterFav && !v.favorite) return false
    if (filterCol && v.collectionId !== filterCol) return false
    if (search) {
      const q = search.toLowerCase()
      return v.title.toLowerCase().includes(q) ||
        v.channelName?.toLowerCase().includes(q) ||
        v.tags.some(t => t.toLowerCase().includes(q))
    }
    return true
  })

  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-6 max-w-4xl">
      {/* Header */}
      <motion.div variants={fadeUp} className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-xl font-bold text-[var(--text-1)]">Video Library</h2>
          <p className="text-sm text-[var(--text-2)]">{videos.length} videos saved</p>
        </div>
        <Button variant="gradient" size="sm" className="gap-1.5" onClick={() => setShowModal(true)}>
          <Plus size={14} /> Add Video
        </Button>
      </motion.div>

      {/* Filters */}
      <motion.div variants={fadeUp} className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[180px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-3)]" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search videos, channels, tags…"
            className="w-full pl-8 pr-3 py-2 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] text-sm text-[var(--text-1)] placeholder:text-[var(--text-3)] focus:outline-none focus:border-[var(--primary)] transition-colors"
          />
        </div>
        {collections.length > 0 && (
          <select value={filterCol} onChange={e => setFilterCol(e.target.value)}
            className="px-3 py-2 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] text-sm text-[var(--text-1)] focus:outline-none focus:border-[var(--primary)] transition-colors">
            <option value="">All collections</option>
            {collections.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        )}
        <button onClick={() => setFilterFav(f => !f)}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-sm transition-colors ${
            filterFav
              ? 'bg-amber-500/10 border-amber-500/30 text-amber-500'
              : 'bg-[var(--surface-2)] border-[var(--border)] text-[var(--text-2)] hover:border-[var(--primary)]'
          }`}>
          <Star size={13} fill={filterFav ? 'currentColor' : 'none'} /> Favorites
        </button>
      </motion.div>

      {/* Content */}
      {loading ? (
        <div className="space-y-3">{[0,1,2,3].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)}</div>
      ) : filtered.length === 0 ? (
        <motion.div variants={fadeUp}>
          <Card className="p-12 text-center">
            <Youtube size={32} className="mx-auto text-[var(--text-3)] mb-3" />
            <p className="text-sm font-medium text-[var(--text-2)]">
              {videos.length === 0 ? 'No videos yet' : 'No videos match your filters'}
            </p>
            {videos.length === 0 && (
              <Button variant="gradient" size="sm" className="mt-4 gap-1.5" onClick={() => setShowModal(true)}>
                <Plus size={13} /> Add Your First Video
              </Button>
            )}
          </Card>
        </motion.div>
      ) : (
        <motion.div variants={fadeUp}>
          <Card className="p-4 divide-y divide-[var(--border)]">
            {filtered.map(v => (
              <VideoCard key={v.id} video={v} onDelete={deleteVideo} onToggleFav={toggleFav} />
            ))}
          </Card>
        </motion.div>
      )}

      {/* Stats row */}
      {videos.length > 0 && (
        <motion.div variants={fadeUp} className="grid grid-cols-3 gap-3">
          {[
            { icon: Youtube,       label: 'Total',     value: videos.length,                          color: 'text-rose-500' },
            { icon: Star,          label: 'Favorites',  value: videos.filter(v => v.favorite).length,  color: 'text-amber-400' },
            { icon: BookmarkCheck, label: 'Collections',value: collections.length,                     color: 'text-[var(--primary)]' },
          ].map(({ icon: Icon, label, value, color }) => (
            <Card key={label} className="p-4 flex items-center gap-3">
              <Icon size={20} className={color} />
              <div>
                <p className="text-lg font-bold text-[var(--text-1)]">{value}</p>
                <p className="text-xs text-[var(--text-3)]">{label}</p>
              </div>
            </Card>
          ))}
        </motion.div>
      )}

      {showModal && (
        <AddVideoModal
          collections={collections}
          onAdd={v => setVideos(prev => [v, ...prev])}
          onClose={() => setShowModal(false)}
        />
      )}
    </motion.div>
  )
}
