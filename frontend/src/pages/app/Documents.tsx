import { useEffect, useRef, useState } from 'react'
import { Download, Eye, FileText, Search, Sparkles, Trash2, Upload, X } from 'lucide-react'
import { Badge, Button, Card, Input } from '../../components/ui'
import { api } from '../../lib/api'
import { formatDate } from '../../lib/utils'
import { useAuth } from '../../store/authStore'

interface Material {
  id: string
  title: string
  file_name: string
  file_size: number
  file_type: string
  file_url: string
  subject_name?: string
  is_processed: boolean
  created_at: string
}

export default function Documents() {
  const [materials, setMaterials] = useState<Material[]>([])
  const [query, setQuery] = useState('')
  const [uploading, setUploading] = useState(false)
  const [summary, setSummary] = useState('')
  const [viewer, setViewer] = useState<Material | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const token = useAuth(state => state.token)

  async function load() {
    const res = await api.get('/api/courses/materials/')
    setMaterials(Array.isArray(res.data) ? res.data : res.data.results ?? [])
  }

  useEffect(() => { load() }, [])

  const filtered = materials.filter(material =>
    `${material.title} ${material.file_name} ${material.subject_name ?? ''}`.toLowerCase().includes(query.toLowerCase()),
  )

  async function upload(files: FileList | null) {
    if (!files?.length) return
    setUploading(true)
    try {
      for (const file of Array.from(files)) {
        const data = new FormData()
        data.append('file', file)
        data.append('title', file.name.replace(/\.[^.]+$/, ''))
        await api.post('/api/files/upload/', data, { headers: { 'Content-Type': 'multipart/form-data' } })
      }
      await load()
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  async function remove(id: string) {
    await api.delete(`/api/courses/materials/${id}/`)
    setMaterials(current => current.filter(material => material.id !== id))
  }

  async function summarize(id: string) {
    setSummary('Generating summary...')
    try {
      const res = await api.post('/api/ai/summarize/', { material_id: id })
      setSummary(res.data.summary)
    } catch (err: any) {
      setSummary(err?.response?.data?.error ?? 'Could not summarize this document.')
    }
  }

  function proxyUrl(material: Material, download = false) {
    const params = new URLSearchParams()
    if (token) params.set('token', token)
    if (download) params.set('download', '1')
    const suffix = params.toString()
    const base = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '')
    return `${base}/api/files/proxy/${material.id}/${suffix ? `?${suffix}` : ''}`
  }

  return (
    <div className="space-y-5 pb-20 md:pb-0">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div>
          <h2 className="font-display text-xl font-bold">Documents</h2>
          <p className="text-sm text-[var(--text-2)]">Uploaded files are saved, indexed, and scoped to your account.</p>
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row lg:ml-auto lg:max-w-xl">
          <Input icon={<Search size={14} />} placeholder="Search documents..." value={query} onChange={e => setQuery(e.target.value)} />
          <Button variant="gradient" className="sm:w-auto" disabled={uploading} onClick={() => inputRef.current?.click()}><Upload size={15} /> {uploading ? 'Uploading...' : 'Upload'}</Button>
          <input ref={inputRef} type="file" multiple accept=".pdf,.docx,.pptx,.txt" className="hidden" onChange={e => upload(e.target.files)} />
        </div>
      </div>

      {viewer && (
        <Card className="overflow-hidden">
          <div className="flex flex-col gap-3 border-b border-[var(--border)] p-4 sm:flex-row sm:items-center">
            <div className="min-w-0 flex-1">
              <h3 className="truncate font-display text-base font-semibold">{viewer.title}</h3>
              <p className="truncate text-xs text-[var(--text-3)]">{viewer.file_name}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="secondary" onClick={() => window.open(proxyUrl(viewer, true), '_blank', 'noopener,noreferrer')}>
                <Download size={13} /> Download
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setViewer(null)}>
                <X size={13} /> Close
              </Button>
            </div>
          </div>
          <iframe
            title={viewer.title}
            src={proxyUrl(viewer)}
            className="h-[72vh] w-full bg-white"
          />
        </Card>
      )}

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {filtered.map(material => (
          <Card key={material.id} className="p-4">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-100 text-primary-600 dark:bg-primary-900/30"><FileText size={18} /></div>
              <div className="min-w-0 flex-1">
                <h3 className="truncate font-display text-base font-semibold">{material.title}</h3>
                <div className="mt-1 flex flex-wrap items-center gap-1.5">
                  <Badge color={material.is_processed ? 'emerald' : 'amber'}>{material.is_processed ? 'Indexed' : 'Processing'}</Badge>
                  <span className="text-xs uppercase text-[var(--text-3)]">{material.file_type}</span>
                </div>
              </div>
            </div>
            <p className="mt-3 truncate text-sm text-[var(--text-2)]">{material.file_name}</p>
            <p className="mt-1 text-xs text-[var(--text-3)]">{Math.round(material.file_size / 1024)} KB - {formatDate(material.created_at)}</p>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <Button size="sm" variant="secondary" onClick={() => summarize(material.id)}><Sparkles size={13} /> Summary</Button>
              <Button size="sm" variant="secondary" onClick={() => setViewer(material)}><Eye size={13} /> View</Button>
              <Button size="sm" variant="ghost" className="col-span-2 text-rose-500" onClick={() => remove(material.id)}><Trash2 size={13} /> Delete</Button>
            </div>
          </Card>
        ))}
      </div>

      {summary && (
        <Card className="p-5">
          <div className="flex items-start justify-between gap-3">
            <h3 className="font-display font-semibold">Gemini Summary</h3>
            <Button variant="ghost" size="sm" onClick={() => setSummary('')}>Close</Button>
          </div>
          <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-[var(--text-2)]">{summary}</p>
        </Card>
      )}
    </div>
  )
}
