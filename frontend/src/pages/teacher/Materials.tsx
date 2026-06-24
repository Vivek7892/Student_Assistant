import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Upload, FileText, Trash2, CheckCircle, Clock, Brain, Plus, X, Search } from 'lucide-react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Card, Button, Badge } from '@/components/ui'
import { CardSkeleton } from '@/components/ui/Skeleton'
import { useMaterials, useUploadMaterial, useDeleteMaterial, useSubjects } from '@/api/courses'
import { formatDate } from '@/lib/utils'
import toast from 'react-hot-toast'
import api from '@/lib/api'

const typeIcon: Record<string, string> = { pdf: '📄', docx: '📝', pptx: '📊', txt: '📃' }

export default function TeacherMaterials() {
  const [search, setSearch] = useState('')
  const [showUpload, setShowUpload] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [form, setForm] = useState({ title: '', subject: '', material_type: 'notes', description: '' })
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const { data: materials, isLoading } = useMaterials()
  const { data: subjects } = useSubjects()
  const { mutate: deleteMaterial } = useDeleteMaterial()

  const filtered = materials?.results?.filter((m) =>
    m.title.toLowerCase().includes(search.toLowerCase())
  )

  const handleUpload = async () => {
    if (!selectedFile || !form.title || !form.subject) {
      toast.error('Fill all required fields and select a file')
      return
    }
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', selectedFile)
      fd.append('category', 'material')
      fd.append('subject_id', form.subject)
      const { data: fileData } = await api.post('/files/upload/', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      await api.post('/courses/materials/', {
        title: form.title,
        subject: form.subject,
        material_type: form.material_type,
        description: form.description,
        file_url: fileData.public_url,
        file_name: selectedFile.name,
        file_size: selectedFile.size,
        file_type: selectedFile.name.split('.').pop()?.toUpperCase() || 'FILE',
      })
      toast.success('Material uploaded and queued for AI processing')
      setShowUpload(false)
      setSelectedFile(null)
      setForm({ title: '', subject: '', material_type: 'notes', description: '' })
    } catch (e: any) {
      toast.error(e?.response?.data?.error || 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  return (
    <DashboardLayout title="Study Materials">
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search materials..."
              className="w-full pl-9 pr-4 h-10 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <Button onClick={() => setShowUpload(!showUpload)}>
            <Upload className="h-4 w-4" /> Upload Material
          </Button>
        </div>

        <AnimatePresence>
          {showUpload && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
              <Card className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold flex items-center gap-2"><Plus className="h-4 w-4 text-primary" /> Upload Study Material</h3>
                  <button onClick={() => setShowUpload(false)} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Title <span className="text-destructive">*</span></label>
                    <input
                      className="w-full h-10 px-3 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                      placeholder="e.g. Chapter 3 Notes"
                      value={form.title}
                      onChange={(e) => setForm({ ...form, title: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Subject <span className="text-destructive">*</span></label>
                    <select
                      className="w-full h-10 px-3 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                      value={form.subject}
                      onChange={(e) => setForm({ ...form, subject: e.target.value })}
                    >
                      <option value="">Select subject...</option>
                      {subjects?.results?.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Type</label>
                    <select
                      className="w-full h-10 px-3 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                      value={form.material_type}
                      onChange={(e) => setForm({ ...form, material_type: e.target.value })}
                    >
                      {['notes', 'assignment', 'pyq', 'reference', 'syllabus', 'other'].map((t) => (
                        <option key={t} value={t} className="capitalize">{t}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Description</label>
                    <input
                      className="w-full h-10 px-3 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                      placeholder="Optional description"
                      value={form.description}
                      onChange={(e) => setForm({ ...form, description: e.target.value })}
                    />
                  </div>
                </div>

                <div
                  className="border-2 border-dashed border-border rounded-2xl p-8 text-center cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-all"
                  onClick={() => fileRef.current?.click()}
                >
                  <input
                    ref={fileRef}
                    type="file"
                    accept=".pdf,.docx,.pptx,.txt"
                    className="hidden"
                    onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                  />
                  {selectedFile ? (
                    <div className="flex items-center justify-center gap-3">
                      <span className="text-2xl">{typeIcon[selectedFile.name.split('.').pop() || ''] || '📁'}</span>
                      <div className="text-left">
                        <p className="font-medium text-sm">{selectedFile.name}</p>
                        <p className="text-xs text-muted-foreground">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                      </div>
                      <button onClick={(e) => { e.stopPropagation(); setSelectedFile(null) }} className="ml-2 text-muted-foreground hover:text-destructive">
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                      <p className="text-sm font-medium">Click to select file</p>
                      <p className="text-xs text-muted-foreground mt-1">PDF, DOCX, PPTX, TXT — max 50MB</p>
                    </>
                  )}
                </div>

                <Button onClick={handleUpload} loading={uploading} disabled={!selectedFile || !form.title || !form.subject}>
                  <Upload className="h-4 w-4" /> Upload & Process with AI
                </Button>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {isLoading
            ? Array.from({ length: 6 }).map((_, i) => <CardSkeleton key={i} />)
            : filtered?.map((material, i) => (
                <motion.div key={material.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                  <Card className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="text-3xl">{typeIcon[material.file_type?.toLowerCase()] || '📁'}</div>
                      <div className="flex items-center gap-2">
                        <Badge variant={material.is_processed ? 'success' : 'warning'} dot className="text-xs">
                          {material.is_processed ? 'AI Ready' : 'Processing'}
                        </Badge>
                        <button
                          onClick={() => deleteMaterial(material.id)}
                          className="text-muted-foreground hover:text-destructive transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                    <div>
                      <h3 className="font-semibold line-clamp-1">{material.title}</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">{material.subject_name} · {material.material_type}</p>
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{formatDate(material.created_at)}</span>
                      <span>{material.download_count} downloads</span>
                    </div>
                  </Card>
                </motion.div>
              ))}
          {!isLoading && !filtered?.length && (
            <div className="col-span-full text-center py-16 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-30" />
              <p>No materials yet. Upload your first study material!</p>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}
