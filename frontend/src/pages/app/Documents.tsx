import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  FileText, Music, File, Sparkles, Upload, Search, Trash2,
  CheckCircle2, FolderOpen, Folder, Tag, X, Eye, Download,
  Plus, HardDrive, RefreshCw, ExternalLink, Unlink,
} from 'lucide-react'
import { Card, Badge, Button, Input, Skeleton } from '../../components/ui'
import { api } from '../../lib/api'
import { cn } from '../../lib/utils'

const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.file'

const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.06 } } }
const fadeUp  = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { duration: 0.35 } } }

const typeIcon: Record<string, React.ElementType> = { pdf: FileText, audio: Music, doc: File, docx: File, pptx: FileText, txt: FileText }
const typeColor: Record<string, string> = { pdf: 'rose', audio: 'cyan', doc: 'amber', docx: 'amber', pptx: 'primary', txt: 'emerald' }

const TAG_COLORS = ['primary', 'emerald', 'cyan', 'amber', 'rose']

function formatSize(bytes: number) {
  if (!bytes) return '—'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function TxtViewer({ url }: { url: string }) {
  const [text, setText] = useState<string | null>(null)
  const [err,  setErr]  = useState(false)
  useEffect(() => {
    fetch(url)
      .then(r => r.text())
      .then(setText)
      .catch(() => setErr(true))
  }, [url])
  if (err) return (
    <div className="flex flex-col items-center justify-center h-full gap-3 text-[var(--text-3)]">
      <FileText size={32} />
      <p className="text-sm">Could not load file. <a href={url} target="_blank" rel="noopener noreferrer" className="text-primary-500 underline">Open in new tab</a></p>
    </div>
  )
  if (!text) return <div className="flex items-center justify-center h-full"><div className="w-6 h-6 border-2 border-primary-400 border-t-transparent rounded-full animate-spin" /></div>
  return (
    <pre className="w-full h-full overflow-auto p-6 text-sm text-[var(--text-1)] font-mono leading-relaxed whitespace-pre-wrap break-words">
      {text}
    </pre>
  )
}

function DocViewer({ doc }: { doc: any }) {
  const fileUrl: string = doc.file_url ?? ''
  const fileType: string = doc.file_type?.toLowerCase() ?? ''
  const [useFallback, setUseFallback] = useState(false)

  // For PDFs: use Google Docs Viewer (most reliable, no CORS/X-Frame issues)
  // For DOCX/PPTX: Google Docs Viewer also works
  // For local files: embed directly
  const isCloudinary = fileUrl.includes('cloudinary.com')
  const isDrive = fileUrl.includes('drive.google.com')
  const isRemote = fileUrl.startsWith('http') && !fileUrl.includes(window.location.hostname)

  let iframeSrc: string
  if (useFallback) {
    iframeSrc = `/api/files/proxy/${doc.id}/`
  } else if (isRemote && (fileType === 'pdf' || fileType === 'docx' || fileType === 'pptx')) {
    // Google Docs Viewer handles PDFs/DOCX/PPTX from any URL
    iframeSrc = `https://docs.google.com/viewer?url=${encodeURIComponent(fileUrl)}&embedded=true`
  } else if (isRemote) {
    iframeSrc = `/api/files/proxy/${doc.id}/`
  } else {
    iframeSrc = fileUrl
  }

  return (
    <div className="relative w-full h-full">
      <iframe
        key={iframeSrc}
        src={iframeSrc}
        className="w-full h-full border-0"
        title={doc.title}
        onError={() => !useFallback && setUseFallback(true)}
      />
      <div className="absolute bottom-3 right-3 flex items-center gap-2">
        {!useFallback && isRemote && (
          <button
            onClick={() => setUseFallback(true)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-black/60 text-white text-xs hover:bg-black/80 transition-colors">
            Proxy
          </button>
        )}
        <a href={fileUrl} target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-black/60 text-white text-xs hover:bg-black/80 transition-colors">
          <ExternalLink size={11} /> Open original
        </a>
      </div>
    </div>
  )
}

export default function Documents() {
  const [docs,        setDocs]        = useState<any[]>([])
  const [search,      setSearch]      = useState('')
  const [loading,     setLoading]     = useState(true)
  const [uploading,   setUploading]   = useState(false)
  const [summarizing, setSummarizing] = useState<string | null>(null)
  const [summaries,   setSummaries]   = useState<Record<string, string>>({})
  const [dragOver,    setDragOver]    = useState(false)
  const [activeFolder,setActiveFolder]= useState<string>('All')
  const [folders,     setFolders]     = useState<string[]>(['Lecture Notes', 'Assignments', 'References'])
  const [docFolders,  setDocFolders]  = useState<Record<string, string>>({})
  const [docTags,     setDocTags]     = useState<Record<string, string[]>>({})
  const [showFolderModal, setShowFolderModal] = useState(false)
  const [newFolder,   setNewFolder]   = useState('')
  const [tagInput,    setTagInput]    = useState<Record<string, string>>({})
  const [showDriveModal, setShowDriveModal] = useState(false)
  const [driveStatus,  setDriveStatus]  = useState<{ connected: boolean; folder_url?: string; folder_name?: string } | null>(null)
  const [driveSyncing, setDriveSyncing] = useState(false)
  const [driveSyncResult, setDriveSyncResult] = useState<{ synced: string[]; skipped: string[] } | null>(null)
  const [driveConnecting, setDriveConnecting] = useState(false)
  const [viewDoc, setViewDoc] = useState<any>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetchDocs()
    api.get('/api/files/drive/status/')
      .then(r => setDriveStatus(r.data))
      .catch(() => {})
  }, [])

  function fetchDocs() {
    api.get('/api/courses/materials/')
      .then(r => setDocs(Array.isArray(r.data) ? r.data : r.data?.results ?? []))
      .catch(() => setDocs([]))
      .finally(() => setLoading(false))
  }

  async function uploadFile(file: File) {
    setUploading(true)
    try {
      const form = new FormData()
      form.append('file', file)
      form.append('title', file.name.replace(/\.[^.]+$/, ''))
      form.append('file_type', file.name.split('.').pop()?.toLowerCase() ?? 'pdf')
      await api.post('/api/files/upload/', form, { headers: { 'Content-Type': 'multipart/form-data' } })
      fetchDocs()
    } catch (err: any) {
      alert(err?.response?.data?.error ?? 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  function handleFiles(files: FileList | null) {
    if (!files?.length) return
    Array.from(files).forEach(uploadFile)
  }

  function connectDrive() {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID
    if (!clientId) { alert('VITE_GOOGLE_CLIENT_ID not set in frontend .env'); return }
    const redirectUri = `${window.location.origin}/drive-callback`
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: `${DRIVE_SCOPE} email profile`,
      access_type: 'offline',
      prompt: 'consent',
    })
    setDriveConnecting(true)
    const popup = window.open(`https://accounts.google.com/o/oauth2/v2/auth?${params}`, 'drive-oauth', 'width=500,height=600')
    const timer = setInterval(async () => {
      try {
        if (!popup || popup.closed) { clearInterval(timer); setDriveConnecting(false); return }
        const url = popup.location.href
        if (url.includes('/drive-callback')) {
          const code = new URL(url).searchParams.get('code')
          popup.close()
          clearInterval(timer)
          if (code) {
            await api.post('/api/files/drive/connect/', { code, redirect_uri: redirectUri })
            const r = await api.get('/api/files/drive/status/')
            setDriveStatus(r.data)
          }
          setDriveConnecting(false)
        }
      } catch { /* cross-origin until redirect */ }
    }, 500)
  }

  async function syncDrive() {
    setDriveSyncing(true)
    setDriveSyncResult(null)
    try {
      const r = await api.post('/api/files/drive/sync/')
      setDriveSyncResult({ synced: r.data.synced ?? [], skipped: r.data.skipped ?? [] })
      if (r.data.total > 0) fetchDocs()
    } catch (err: any) {
      alert(err?.response?.data?.error ?? 'Sync failed')
    } finally {
      setDriveSyncing(false)
    }
  }

  async function disconnectDrive() {
    await api.delete('/api/files/drive/disconnect/').catch(() => {})
    setDriveStatus({ connected: false })
    setDriveSyncResult(null)
  }

  async function deleteDoc(id: string) {
    if (!confirm('Delete this document?')) return
    setDocs(d => d.filter(x => x.id !== id))
    if (viewDoc?.id === id) setViewDoc(null)
    api.delete(`/api/courses/materials/${id}/`).catch(() => fetchDocs())
  }

  async function summarize(id: string) {
    setSummarizing(id)
    try {
      const r = await api.post('/api/ai/summarize/', { material_id: id })
      setSummaries(s => ({ ...s, [id]: r.data.summary }))
    } catch {
      setSummaries(s => ({ ...s, [id]: 'Could not generate summary.' }))
    } finally {
      setSummarizing(null)
    }
  }

  function assignFolder(docId: string, folder: string) {
    setDocFolders(f => ({ ...f, [docId]: folder }))
  }

  function addTag(docId: string) {
    const tag = tagInput[docId]?.trim()
    if (!tag) return
    setDocTags(t => ({ ...t, [docId]: [...(t[docId] ?? []), tag] }))
    setTagInput(i => ({ ...i, [docId]: '' }))
  }

  function removeTag(docId: string, tag: string) {
    setDocTags(t => ({ ...t, [docId]: (t[docId] ?? []).filter(x => x !== tag) }))
  }

  function addFolder() {
    const f = newFolder.trim()
    if (!f || folders.includes(f)) return
    setFolders(fs => [...fs, f])
    setNewFolder('')
    setShowFolderModal(false)
  }

  const allFolders = ['All', ...folders]

  const filtered = docs.filter(d => {
    const matchSearch = d.title?.toLowerCase().includes(search.toLowerCase()) ||
      d.subject_name?.toLowerCase().includes(search.toLowerCase())
    const matchFolder = activeFolder === 'All' || docFolders[d.id] === activeFolder
    return matchSearch && matchFolder
  })

  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-6 max-w-6xl">
      {/* Header */}
      <motion.div variants={fadeUp} className="flex items-center gap-2">
        <div className="flex-1">
          <Input icon={<Search size={14} />} placeholder="Search documents…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Button variant="secondary" size="sm" className="gap-1.5 shrink-0" onClick={() => setShowDriveModal(true)}>
          <HardDrive size={14} /> <span className="hidden sm:inline">Drive</span>
          {driveStatus?.connected && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />}
        </Button>
        <Button variant="gradient" size="sm" className="gap-1.5 shrink-0" onClick={() => fileRef.current?.click()} disabled={uploading}>
          <Upload size={14} /> <span className="hidden sm:inline">{uploading ? 'Uploading…' : 'Upload'}</span>
        </Button>
        <input ref={fileRef} type="file" multiple accept=".pdf,.docx,.pptx,.txt" className="hidden" onChange={e => handleFiles(e.target.files)} />
      </motion.div>

      <div className="flex gap-4">
        {/* Sidebar — Folders: hidden on mobile, shown as horizontal scroll */}
        <motion.div variants={fadeUp} className="hidden sm:block w-44 shrink-0 space-y-1">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-[var(--text-3)] uppercase tracking-wider">Folders</span>
            <button onClick={() => setShowFolderModal(true)}
              className="w-5 h-5 rounded flex items-center justify-center hover:bg-[var(--surface-2)] text-[var(--text-3)]">
              <Plus size={12} />
            </button>
          </div>
          {allFolders.map(f => (
            <button key={f} onClick={() => setActiveFolder(f)}
              className={cn(
                'w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm transition-colors text-left',
                activeFolder === f
                  ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-300 font-medium'
                  : 'text-[var(--text-2)] hover:bg-[var(--surface-2)]'
              )}>
              {f === 'All'
                ? <FolderOpen size={14} className="shrink-0" />
                : <Folder size={14} className="shrink-0" />}
              <span className="truncate">{f}</span>
              <span className="ml-auto text-xs text-[var(--text-3)]">
                {f === 'All' ? docs.length : docs.filter(d => docFolders[d.id] === f).length}
              </span>
            </button>
          ))}
        </motion.div>

        {/* Main content */}
        <div className="flex-1 min-w-0 space-y-3">
          {/* Mobile folder pills */}
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 sm:hidden">
            {allFolders.map(f => (
              <button key={f} onClick={() => setActiveFolder(f)}
                className={cn('shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors',
                  activeFolder === f
                    ? 'bg-primary-500 text-white'
                    : 'bg-[var(--surface-2)] text-[var(--text-2)] border border-[var(--border)]'
                )}>{f}</button>
            ))}
          </div>
          {/* Drop zone */}
          <motion.div variants={fadeUp}>
            <div
              onDragOver={e => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onDrop={e => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files) }}
              onClick={() => fileRef.current?.click()}
              className={cn(
                'border-2 border-dashed rounded-2xl p-4 sm:p-6 text-center cursor-pointer transition-colors',
                dragOver
                  ? 'border-primary-400 bg-primary-50 dark:bg-primary-900/20'
                  : 'border-[var(--border)] hover:border-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/10'
              )}
            >
              <Upload size={20} className="mx-auto text-[var(--text-3)] mb-1.5" />
              <p className="text-sm font-medium text-[var(--text-2)]">
                {uploading ? 'Uploading…' : 'Drop files or tap to upload'}
              </p>
              <p className="text-xs text-[var(--text-3)] mt-0.5">PDF, DOCX, PPTX, TXT up to 50MB</p>
            </div>
          </motion.div>

          {/* File list */}
          {loading ? (
            <div className="space-y-3">
              {[0,1,2].map(i => <Skeleton key={i} className="h-20 rounded-2xl" />)}
            </div>
          ) : filtered.length === 0 ? (
            <motion.div variants={fadeUp}>
              <Card className="p-12 text-center">
                <FileText size={32} className="mx-auto text-[var(--text-3)] mb-3" />
                <p className="text-sm font-medium text-[var(--text-2)]">
                  {search ? 'No documents match your search' : activeFolder !== 'All' ? `No documents in "${activeFolder}"` : 'No documents uploaded yet'}
                </p>
              </Card>
            </motion.div>
          ) : (
            <motion.div variants={fadeUp} className="space-y-2">
              {filtered.map(d => {
                const ext     = d.file_type?.toLowerCase() ?? 'pdf'
                const Icon    = typeIcon[ext] ?? File
                const color   = typeColor[ext] ?? 'primary'
                const summary = summaries[d.id] ?? d.summary
                const tags    = docTags[d.id] ?? []
                const folder  = docFolders[d.id]
                return (
                  <Card key={d.id} hover className="p-4">
                    <div className="flex items-start gap-3">
                      <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center shrink-0',
                        color === 'rose'    ? 'bg-rose-400/10'    :
                        color === 'cyan'    ? 'bg-cyan-400/10'    :
                        color === 'amber'   ? 'bg-amber-400/10'   :
                        color === 'emerald' ? 'bg-emerald-400/10' : 'bg-primary-100 dark:bg-primary-900/30'
                      )}>
                        <Icon size={16} className={cn(
                          color === 'rose'    ? 'text-rose-500'    :
                          color === 'cyan'    ? 'text-cyan-500'    :
                          color === 'amber'   ? 'text-amber-500'   :
                          color === 'emerald' ? 'text-emerald-500' : 'text-primary-500'
                        )} />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-[var(--text-1)] truncate">{d.title}</p>
                            <div className="flex flex-wrap items-center gap-1.5 mt-1">
                              <Badge color={color}>{ext.toUpperCase()}</Badge>
                              {d.subject_name && <span className="text-xs text-[var(--text-3)]">{d.subject_name}</span>}
                              {d.file_size && <span className="text-xs text-[var(--text-3)]">{formatSize(d.file_size)}</span>}
                              {d.is_processed && (
                                <span className="flex items-center gap-1 text-xs text-emerald-500">
                                  <CheckCircle2 size={10} /> Indexed
                                </span>
                              )}
                              {folder && (
                                <span className="flex items-center gap-1 text-xs text-[var(--text-3)]">
                                  <Folder size={10} /> {folder}
                                </span>
                              )}
                            </div>
                            {/* Tags */}
                            {tags.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-1.5">
                                {tags.map((tag, ti) => (
                                  <span key={tag}
                                    className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium',
                                      ti % 2 === 0 ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-300'
                                                   : 'bg-emerald-400/10 text-emerald-600 dark:text-emerald-400'
                                    )}>
                                    <Tag size={9} /> {tag}
                                    <button onClick={() => removeTag(d.id, tag)} className="hover:text-rose-500 ml-0.5">
                                      <X size={9} />
                                    </button>
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-1 shrink-0">
                            <button onClick={() => setViewDoc(d)}
                              className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-[var(--surface-2)] text-[var(--text-3)] hover:text-primary-500 transition-colors"
                              title="View document">
                              <Eye size={14} />
                            </button>
                            <Button variant="ghost" size="sm"
                              onClick={() => summarize(d.id)}
                              className="gap-1 text-xs px-2 py-1"
                              disabled={summarizing === d.id || !d.is_processed}>
                              <Sparkles size={11} />
                              {summarizing === d.id ? '…' : summary ? '✓' : 'AI'}
                            </Button>
                            <button onClick={() => deleteDoc(d.id)}
                              className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-rose-500/10 text-[var(--text-3)] hover:text-rose-500 transition-colors">
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>

                        {/* Inline tag input + folder assign */}
                        <div className="flex items-center gap-2 mt-2">
                          <div className="flex items-center gap-1 flex-1">
                            <Tag size={11} className="text-[var(--text-3)]" />
                            <input
                              value={tagInput[d.id] ?? ''}
                              onChange={e => setTagInput(i => ({ ...i, [d.id]: e.target.value }))}
                              onKeyDown={e => e.key === 'Enter' && addTag(d.id)}
                              placeholder="Add tag…"
                              className="text-xs bg-transparent border-none outline-none text-[var(--text-2)] placeholder:text-[var(--text-3)] w-24"
                            />
                          </div>
                          <select
                            value={folder ?? ''}
                            onChange={e => assignFolder(d.id, e.target.value)}
                            className="text-xs bg-[var(--surface-2)] border border-[var(--border)] rounded-lg px-2 py-1 text-[var(--text-2)] focus:outline-none focus:border-[var(--primary)]">
                            <option value="">Move to folder…</option>
                            {folders.map(f => <option key={f} value={f}>{f}</option>)}
                          </select>
                        </div>

                        {/* Summary */}
                        {summary && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                            className="mt-2 p-2.5 rounded-lg bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800">
                            <p className="text-xs text-[var(--text-2)] leading-relaxed">{summary}</p>
                          </motion.div>
                        )}
                      </div>
                    </div>
                  </Card>
                )
              })}
            </motion.div>
          )}
        </div>

        {/* ── Full-screen document viewer ── */}
        <AnimatePresence>
          {viewDoc && (
            <>
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm"
                onClick={() => setViewDoc(null)}
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.97, y: 16 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.97, y: 16 }}
                transition={{ duration: 0.2 }}
                className="fixed inset-3 sm:inset-6 z-50 flex flex-col rounded-2xl overflow-hidden bg-[var(--surface)] shadow-2xl"
                onClick={e => e.stopPropagation()}
              >
                {/* Viewer toolbar */}
                <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--border)] shrink-0">
                  <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center shrink-0',
                    typeColor[viewDoc.file_type] === 'rose'    ? 'bg-rose-400/10'    :
                    typeColor[viewDoc.file_type] === 'amber'   ? 'bg-amber-400/10'   :
                    typeColor[viewDoc.file_type] === 'emerald' ? 'bg-emerald-400/10' : 'bg-primary-100 dark:bg-primary-900/30'
                  )}>
                    {(() => { const Icon = typeIcon[viewDoc.file_type] ?? File; return <Icon size={15} className="text-primary-500" /> })()} 
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-[var(--text-1)] truncate">{viewDoc.title}</p>
                    <p className="text-xs text-[var(--text-3)]">{viewDoc.file_type?.toUpperCase()} · {formatSize(viewDoc.file_size)}</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {viewDoc.file_url && (
                      <a href={viewDoc.file_url} target="_blank" rel="noopener noreferrer" download
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--surface-2)] border border-[var(--border)] text-xs font-medium text-[var(--text-1)] hover:bg-[var(--surface)] transition-colors">
                        <Download size={13} /> Download
                      </a>
                    )}
                    <button onClick={() => setViewDoc(null)}
                      className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-[var(--surface-2)] text-[var(--text-2)] transition-colors ml-1">
                      <X size={16} />
                    </button>
                  </div>
                </div>

                {/* Viewer body */}
                <div className="flex-1 overflow-hidden bg-neutral-100 dark:bg-neutral-900">
                  {viewDoc.file_type === 'txt' ? (
                    <TxtViewer url={viewDoc.file_url} />
                  ) : (
                    <DocViewer doc={viewDoc} />
                  )}
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>

      {/* Google Drive Modal */}
      <AnimatePresence>
        {showDriveModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md glass rounded-2xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <HardDrive size={18} className="text-primary-500" />
                  <h3 className="font-display font-semibold text-[var(--text-1)]">Google Drive</h3>
                </div>
                <button onClick={() => { setShowDriveModal(false); setDriveSyncResult(null) }}
                  className="p-1 rounded-lg hover:bg-[var(--surface-2)] text-[var(--text-2)]"><X size={14} /></button>
              </div>

              {!driveStatus?.connected ? (
                <>
                  <p className="text-xs text-[var(--text-3)] leading-relaxed">
                    Connect your Google Drive to sync documents from your <strong>Student_Assistant</strong> folder automatically.
                  </p>
                  <Button variant="gradient" size="sm" className="w-full gap-2" onClick={connectDrive} disabled={driveConnecting}>
                    <HardDrive size={14} /> {driveConnecting ? 'Connecting…' : 'Connect Google Drive'}
                  </Button>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-400/10 border border-emerald-400/20">
                    <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400">Connected</p>
                      <p className="text-xs text-[var(--text-3)] truncate">{driveStatus.folder_name ?? 'Student_Assistant'} folder</p>
                    </div>
                    {driveStatus.folder_url && (
                      <a href={driveStatus.folder_url} target="_blank" rel="noopener noreferrer"
                        className="text-[var(--text-3)] hover:text-primary-500">
                        <ExternalLink size={13} />
                      </a>
                    )}
                  </div>

                  <p className="text-xs text-[var(--text-3)]">
                    Upload PDF, DOCX, PPTX, or TXT files to your <strong>Student_Assistant</strong> folder in Drive, then click Sync.
                  </p>

                  {driveSyncResult && (
                    <div className="p-3 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] text-xs space-y-1">
                      <p className="font-medium text-[var(--text-1)]">{driveSyncResult.synced.length} file(s) synced</p>
                      {driveSyncResult.synced.map(f => (
                        <p key={f} className="text-emerald-500 truncate">✓ {f}</p>
                      ))}
                      {driveSyncResult.skipped.length > 0 && (
                        <p className="text-[var(--text-3)]">{driveSyncResult.skipped.length} skipped (already synced or unsupported)</p>
                      )}
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Button variant="gradient" size="sm" className="flex-1 gap-2" onClick={syncDrive} disabled={driveSyncing}>
                      <RefreshCw size={13} className={driveSyncing ? 'animate-spin' : ''} />
                      {driveSyncing ? 'Syncing…' : 'Sync Now'}
                    </Button>
                    <Button variant="ghost" size="sm" className="gap-1 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20" onClick={disconnectDrive}>
                      <Unlink size={13} /> Disconnect
                    </Button>
                  </div>
                </>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* New Folder Modal */}
      <AnimatePresence>
        {showFolderModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-xs glass rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-display font-semibold text-[var(--text-1)]">New Folder</h3>
                <button onClick={() => setShowFolderModal(false)} className="p-1 rounded-lg hover:bg-[var(--surface-2)] text-[var(--text-2)]"><X size={14} /></button>
              </div>
              <input
                value={newFolder} onChange={e => setNewFolder(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addFolder()}
                placeholder="Folder name…" autoFocus
                className="w-full px-3 py-2.5 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] text-sm text-[var(--text-1)] placeholder:text-[var(--text-3)] focus:outline-none focus:border-[var(--primary)] transition-colors"
              />
              <div className="flex gap-2 justify-end">
                <Button variant="secondary" size="sm" onClick={() => setShowFolderModal(false)}>Cancel</Button>
                <Button variant="gradient" size="sm" onClick={addFolder} disabled={!newFolder.trim()}>Create</Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
