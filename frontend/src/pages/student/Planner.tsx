import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Calendar, Plus, Brain, BookOpen, Clock, CheckCircle, Loader2 } from 'lucide-react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Card, Button, Badge } from '@/components/ui'
import { CardSkeleton } from '@/components/ui/Skeleton'
import { useStudyPlans, useGenerateStudyPlan } from '@/api/ai'
import { useSubjects } from '@/api/courses'
import { formatDate } from '@/lib/utils'

export default function PlannerPage() {
  const [showGenerate, setShowGenerate] = useState(false)
  const [activePlan, setActivePlan] = useState<any>(null)
  const [config, setConfig] = useState({ subject_ids: [] as string[], duration_days: 14, exam_date: '', title: '' })

  const { data: plans, isLoading } = useStudyPlans()
  const { data: subjects } = useSubjects()
  const { mutate: generate, isPending } = useGenerateStudyPlan()

  const toggleSubject = (id: string) => {
    setConfig((c) => ({
      ...c,
      subject_ids: c.subject_ids.includes(id) ? c.subject_ids.filter((s) => s !== id) : [...c.subject_ids, id],
    }))
  }

  if (activePlan) {
    const planData = activePlan.plan_data
    return (
      <DashboardLayout title="Study Plan">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <Button variant="ghost" onClick={() => setActivePlan(null)}>← Back to Plans</Button>
            <h2 className="font-bold text-lg">{activePlan.title}</h2>
          </div>

          {planData?.overview && (
            <Card className="bg-primary/5 border-primary/20">
              <p className="text-sm">{planData.overview}</p>
            </Card>
          )}

          {planData?.tips?.length > 0 && (
            <Card>
              <h3 className="font-semibold mb-3 flex items-center gap-2"><CheckCircle className="h-4 w-4 text-green-500" /> Study Tips</h3>
              <ul className="space-y-1.5">
                {planData.tips.map((tip: string, i: number) => (
                  <li key={i} className="text-sm text-muted-foreground flex gap-2"><span className="text-primary shrink-0">•</span>{tip}</li>
                ))}
              </ul>
            </Card>
          )}

          <div className="space-y-4">
            {planData?.daily_schedule?.map((day: any) => (
              <Card key={day.day}>
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-primary" /> Day {day.day} {day.date && `— ${day.date}`}
                </h4>
                <div className="space-y-2">
                  {day.tasks?.map((task: any, j: number) => (
                    <div key={j} className="flex items-start gap-3 p-3 rounded-xl bg-muted/50">
                      <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <BookOpen className="h-4 w-4 text-primary" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">{task.subject}</p>
                        <p className="text-xs text-muted-foreground">{task.topic}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <Badge variant="secondary" className="text-xs">{task.type}</Badge>
                        <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1 justify-end"><Clock className="h-3 w-3" />{task.duration_hours}h</p>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            ))}
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout title="Study Planner">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <p className="text-muted-foreground text-sm">{plans?.count || 0} study plans</p>
          <Button onClick={() => setShowGenerate(!showGenerate)}>
            <Plus className="h-4 w-4" /> Generate Plan
          </Button>
        </div>

        <AnimatePresence>
          {showGenerate && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
              <Card className="space-y-4">
                <h3 className="font-semibold flex items-center gap-2"><Brain className="h-4 w-4 text-primary" /> AI Study Plan Generator</h3>

                <div>
                  <label className="text-sm font-medium mb-2 block">Select Subjects</label>
                  <div className="flex flex-wrap gap-2">
                    {subjects?.results?.map((s) => (
                      <button
                        key={s.id}
                        onClick={() => toggleSubject(s.id)}
                        className={`px-3 py-1.5 rounded-xl text-sm font-medium border transition-all ${
                          config.subject_ids.includes(s.id)
                            ? 'bg-primary text-primary-foreground border-primary'
                            : 'border-border hover:border-primary/40 hover:bg-muted/50'
                        }`}
                      >
                        {s.name}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid md:grid-cols-3 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Duration (days)</label>
                    <select
                      className="w-full h-10 px-3 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                      onChange={(e) => setConfig({ ...config, duration_days: +e.target.value })}
                    >
                      {[7, 14, 21, 30].map((d) => <option key={d} value={d}>{d} days</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Exam Date</label>
                    <input
                      type="date"
                      className="w-full h-10 px-3 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                      onChange={(e) => setConfig({ ...config, exam_date: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Plan Title (optional)</label>
                    <input
                      type="text"
                      placeholder="My Study Plan"
                      className="w-full h-10 px-3 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                      onChange={(e) => setConfig({ ...config, title: e.target.value })}
                    />
                  </div>
                </div>

                <Button
                  onClick={() => generate(config, { onSuccess: () => setShowGenerate(false) })}
                  loading={isPending}
                  disabled={!config.subject_ids.length || !config.exam_date}
                >
                  <Brain className="h-4 w-4" /> Generate with AI
                </Button>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {isLoading
            ? Array.from({ length: 3 }).map((_, i) => <CardSkeleton key={i} />)
            : plans?.results?.map((plan, i) => (
                <motion.div key={plan.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                  <Card hover className="space-y-3 cursor-pointer" onClick={() => setActivePlan(plan)}>
                    <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                      <Calendar className="h-5 w-5 text-white" />
                    </div>
                    <h3 className="font-semibold">{plan.title}</h3>
                  <p className="text-sm text-muted-foreground">{(plan.plan_data?.overview as string) || 'AI-generated study plan'}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">{formatDate(plan.created_at)}</span>
                      <Badge variant="default" className="text-xs">AI</Badge>
                    </div>
                  </Card>
                </motion.div>
              ))}
          {!isLoading && !plans?.results?.length && (
            <div className="col-span-full text-center py-16 text-muted-foreground">
              <Calendar className="h-12 w-12 mx-auto mb-4 opacity-30" />
              <p>No study plans yet. Generate one with AI!</p>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}
