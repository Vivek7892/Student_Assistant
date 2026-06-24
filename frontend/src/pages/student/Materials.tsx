import { useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { FileText, Search, Download, MessageSquare, Brain, CheckCircle, Clock, File } from 'lucide-react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Card, Button, Badge } from '@/components/ui'
import { CardSkeleton } from '@/components/ui/Skeleton'
import { useMaterials } from '@/api/courses'
import { useSummarize } from '@/api/ai'
import { formatDate } from '@/lib/utils'
import toast from 'react-hot-toast'

const typeIcon: Record<string, string> = { pdf: '📄', docx: '📝', pptx: '📊', txt: '📃' }

export default function MaterialsPage() {
  const [searchParams] = useSearchParams()
  const [search, setSearch] = useState('')
  const [summary, setSummary] = useState<{ id: string; text: string } | null>(null)
  const subjectFilter = searchParams.get('subject') || undefined

  const { data: materials, isLoading } = useMaterials(subjectFilter ? { subject: subjectFilter } : undefined)
  const { mutate: summarize, isPending: summarizing } = useSummarize()

  const filtered = materials?.results?.filter((m) =>
    m.title.toLowerCase().includes(search.toLowerCase())
  )

  const handleSummarize = (id: string) => {
    summarize(id, {
      onSuccess: (data) => setSummary({ id, text: data.summary }),
      onError: () => toast.error('Summary failed — add an OpenAI key to .env'),
    })
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
          <p className="text-sm text-muted-foreground shrink-0">{filtered?.length || 0} materials</p>
        </div>

        {summary && (
          <Card className="border-primary/30 bg-primary/5 space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-sm flex items-center gap-2"><Brain className="h-4 w-4 text-primary" /> AI Summary</h4>
              <button onClick={() => setSummary(null)} className="text-xs text-muted-foreground hover:text-foreground">✕</button>
            </div>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{summary.text}</p>
          </Card>
        )}

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {isLoading
            ? Array.from({ length: 6 }).map((_, i) => <CardSkeleton key={i} />)
            : filtered?.map((material, i) => (
                <motion.div key={material.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                  <Card hover className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="text-3xl">{typeIcon[material.file_type?.toLowerCase()] || '📁'}</div>
                      <Badge variant={material.is_processed ? 'success' : 'warning'} dot className="text-xs">
                        {material.is_processed ? 'AI Ready' : 'Processing'}
                      </Badge>
                    </div>
                    <div>
                      <h3 className="font-semibold line-clamp-2">{material.title}</h3>
                      <p className="text-xs text-muted-foreground mt-1 uppercase tracking-wide">{material.file_type}</p>
                    </div>
                    <p className="text-xs text-muted-foreground">{formatDate(material.created_at)}</p>
                    <div className="flex gap-2">
                      <Link to={`/student/chat?material=${material.id}`} className="flex-1">
                        <Button size="sm" variant="outline" className="w-full gap-1.5" disabled={!material.is_processed}>
                          <MessageSquare className="h-3.5 w-3.5" /> Chat
                        </Button>
                      </Link>
                      <Button
                        size="sm"
                        className="flex-1 gap-1.5"
                        disabled={!material.is_processed || summarizing}
                        loading={summarizing && summary?.id === material.id}
                        onClick={() => handleSummarize(material.id)}
                      >
                        <Brain className="h-3.5 w-3.5" /> Summary
                      </Button>
                    </div>
                    {material.file_url && (
                      <a href={material.file_url} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-xs text-primary hover:underline">
                        <Download className="h-3.5 w-3.5" /> Download file
                      </a>
                    )}
                  </Card>
                </motion.div>
              ))}
          {!isLoading && !filtered?.length && (
            <div className="col-span-full text-center py-16 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-30" />
              <p>{search ? 'No materials match your search.' : 'No study materials yet.'}</p>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}
