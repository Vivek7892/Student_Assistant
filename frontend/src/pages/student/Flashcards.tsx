import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Award, Plus, RotateCcw, ChevronLeft, ChevronRight, Eye, EyeOff } from 'lucide-react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Card, Button, Badge } from '@/components/ui'
import { useFlashcards, useGenerateFlashcards } from '@/api/ai'
import { useMaterials } from '@/api/courses'
import { formatDate } from '@/lib/utils'

export default function FlashcardsPage() {
  const [activeSet, setActiveSet] = useState<any>(null)
  const [currentCard, setCurrentCard] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [showGenerate, setShowGenerate] = useState(false)
  const [genConfig, setGenConfig] = useState({ material_id: '', num_cards: 15 })

  const { data: flashcards } = useFlashcards()
  const { data: materials } = useMaterials()
  const { mutate: generateFlashcards, isPending: generating } = useGenerateFlashcards()

  const startSet = (set: any) => { setActiveSet(set); setCurrentCard(0); setFlipped(false) }
  const nextCard = () => { setCurrentCard((prev) => (prev + 1) % activeSet.cards.length); setFlipped(false) }
  const prevCard = () => { setCurrentCard((prev) => (prev - 1 + activeSet.cards.length) % activeSet.cards.length); setFlipped(false) }

  if (activeSet) {
    const card = activeSet.cards[currentCard]
    return (
      <DashboardLayout title="Flashcards">
        <div className="max-w-lg mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <Button variant="ghost" onClick={() => setActiveSet(null)}>← Back</Button>
            <span className="text-sm text-muted-foreground">{currentCard + 1} / {activeSet.cards.length}</span>
            <Button variant="ghost" size="icon" onClick={() => { setCurrentCard(0); setFlipped(false) }}><RotateCcw className="h-4 w-4" /></Button>
          </div>

          <div className="relative h-64 cursor-pointer" onClick={() => setFlipped(!flipped)}>
            <motion.div className="absolute inset-0 rounded-2xl" style={{ perspective: 1000 }}>
              <motion.div
                className="w-full h-full relative"
                animate={{ rotateY: flipped ? 180 : 0 }}
                transition={{ duration: 0.5 }}
                style={{ transformStyle: 'preserve-3d' }}
              >
                {/* Front */}
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-700 flex flex-col items-center justify-center p-8 text-white" style={{ backfaceVisibility: 'hidden' }}>
                  <p className="text-xs uppercase tracking-widest mb-4 opacity-70">Question</p>
                  <p className="text-xl font-semibold text-center">{card.front}</p>
                  <div className="flex items-center gap-1 mt-6 opacity-60 text-sm"><Eye className="h-4 w-4" /> Click to reveal</div>
                </div>
                {/* Back */}
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-green-600 to-emerald-700 flex flex-col items-center justify-center p-8 text-white" style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}>
                  <p className="text-xs uppercase tracking-widest mb-4 opacity-70">Answer</p>
                  <p className="text-base text-center leading-relaxed">{card.back}</p>
                </div>
              </motion.div>
            </motion.div>
          </div>

          <div className="flex items-center gap-3">
            <Button variant="outline" className="flex-1" onClick={prevCard}><ChevronLeft className="h-4 w-4" /> Prev</Button>
            <Button className="flex-1" onClick={nextCard}>Next <ChevronRight className="h-4 w-4" /></Button>
          </div>

          {/* Progress dots */}
          <div className="flex justify-center gap-1.5 flex-wrap">
            {activeSet.cards.map((_: any, i: number) => (
              <button key={i} onClick={() => { setCurrentCard(i); setFlipped(false) }}
                className={`h-2 w-2 rounded-full transition-all ${i === currentCard ? 'bg-primary w-4' : 'bg-muted-foreground/30'}`} />
            ))}
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout title="Flashcards">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <p className="text-muted-foreground text-sm">{flashcards?.count || 0} flashcard sets</p>
          <Button onClick={() => setShowGenerate(!showGenerate)}><Plus className="h-4 w-4" /> Generate</Button>
        </div>

        <AnimatePresence>
          {showGenerate && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
              <Card className="space-y-4">
                <h3 className="font-semibold">AI Flashcard Generator</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Study Material</label>
                    <select className="w-full h-10 px-3 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                      onChange={(e) => setGenConfig({ ...genConfig, material_id: e.target.value })}>
                      <option value="">Select material...</option>
                      {materials?.results?.filter(m => m.is_processed).map(m => <option key={m.id} value={m.id}>{m.title}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Number of Cards</label>
                    <select className="w-full h-10 px-3 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                      onChange={(e) => setGenConfig({ ...genConfig, num_cards: +e.target.value })}>
                      {[10, 15, 20, 30].map(n => <option key={n} value={n}>{n} cards</option>)}
                    </select>
                  </div>
                </div>
                <Button onClick={() => generateFlashcards(genConfig, { onSuccess: () => setShowGenerate(false) })} loading={generating} disabled={!genConfig.material_id}>
                  <Award className="h-4 w-4" /> Generate with AI
                </Button>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {flashcards?.results?.map((set, i) => (
            <motion.div key={set.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <Card hover className="space-y-3 cursor-pointer" onClick={() => startSet(set)}>
                <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
                  <Award className="h-6 w-6 text-white" />
                </div>
                <h3 className="font-semibold">{set.title}</h3>
                <p className="text-sm text-muted-foreground">{set.cards.length} cards</p>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">{formatDate(set.created_at)}</span>
                  {set.is_ai_generated && <Badge variant="default" className="text-xs">AI</Badge>}
                </div>
              </Card>
            </motion.div>
          ))}
          {!flashcards?.results?.length && (
            <div className="col-span-full text-center py-16 text-muted-foreground">
              <Award className="h-12 w-12 mx-auto mb-4 opacity-30" />
              <p>No flashcard sets yet. Generate one with AI!</p>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}
