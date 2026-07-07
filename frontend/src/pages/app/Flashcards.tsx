import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, ChevronRight, ThumbsUp, ThumbsDown, Layers, Plus, BookOpen, X, PenLine, Sparkles, Trash2 } from 'lucide-react'
import { Card, Badge, Button, ProgressRing, Skeleton } from '../../components/ui'
import { api } from '../../lib/api'
import { cn } from '../../lib/utils'

const ringColors  = ['oklch(55% 0.26 290)', 'oklch(70% 0.20 162)', 'oklch(72% 0.18 210)', 'oklch(75% 0.20 80)', 'oklch(64% 0.22 15)']
const badgeColors = ['primary', 'emerald', 'cyan', 'amber', 'rose']

type ModalMode = 'ai' | 'manual' | null

export default function Flashcards() {
  const [decks,      setDecks]      = useState<any[]>([])
  const [loading,    setLoading]    = useState(true)
  const [activeDeck, setActiveDeck] = useState<any>(null)
  const [cardIndex,  setCardIndex]  = useState(0)
  const [flipped,    setFlipped]    = useState(false)
  const [mastered,   setMastered]   = useState<Set<string>>(new Set())
  const [modal,      setModal]      = useState<ModalMode>(null)
  const [materials,  setMaterials]  = useState<any[]>([])

  // AI gen form
  const [genForm,    setGenForm]    = useState({ material_id: '', num_cards: '10', title: '' })
  const [generating, setGenerating] = useState(false)
  const [genError,   setGenError]   = useState('')

  // Manual form
  const [manualTitle, setManualTitle] = useState('')
  const [manualCards, setManualCards] = useState([{ front: '', back: '' }])
  const [saving,      setSaving]      = useState(false)
  const [manualError, setManualError] = useState('')

  useEffect(() => {
    api.get('/api/ai/flashcards/')
      .then(r => setDecks(Array.isArray(r.data) ? r.data : r.data?.results ?? []))
      .catch(() => setDecks([]))
      .finally(() => setLoading(false))
    api.get('/api/courses/materials/')
      .then(r => setMaterials(Array.isArray(r.data) ? r.data : r.data?.results ?? []))
      .catch(() => {})
  }, [])

  async function generateDeck() {
    if (!genForm.material_id) { setGenError('Select a document'); return }
    setGenerating(true); setGenError('')
    try {
      const r = await api.post('/api/ai/flashcards/generate/', {
        material_id: genForm.material_id,
        num_cards:   parseInt(genForm.num_cards) || 10,
        title:       genForm.title || undefined,
      })
      setDecks(d => [r.data, ...d])
      setModal(null)
      setGenForm({ material_id: '', num_cards: '10', title: '' })
    } catch (e: any) {
      setGenError(e?.response?.data?.error ?? 'Generation failed')
    } finally {
      setGenerating(false)
    }
  }

  async function saveManualDeck() {
    const validCards = manualCards.filter(c => c.front.trim() && c.back.trim())
    if (!manualTitle.trim()) { setManualError('Enter a deck title'); return }
    if (validCards.length === 0) { setManualError('Add at least one card'); return }
    setSaving(true); setManualError('')
    try {
      // POST to create deck with manual cards
      const r = await api.post('/api/ai/flashcards/manual/', {
        title: manualTitle,
        cards: validCards,
      })
      setDecks(d => [r.data, ...d])
      setModal(null)
      setManualTitle('')
      setManualCards([{ front: '', back: '' }])
    } catch (e: any) {
      // Fallback: create local deck if endpoint doesn't exist yet
      const localDeck = {
        id: `local-${Date.now()}`,
        title: manualTitle,
        cards: validCards.map((c, i) => ({ id: `c-${i}`, front: c.front, back: c.back })),
        mastered_count: 0,
        subject_name: 'Manual',
      }
      setDecks(d => [localDeck, ...d])
      setModal(null)
      setManualTitle('')
      setManualCards([{ front: '', back: '' }])
    } finally {
      setSaving(false)
    }
  }

  function startDeck(deck: any) {
    setActiveDeck(deck); setCardIndex(0); setFlipped(false); setMastered(new Set())
  }

  function next() { setFlipped(false); setTimeout(() => setCardIndex(i => (i + 1) % activeDeck.cards.length), 150) }
  function prev() { setFlipped(false); setTimeout(() => setCardIndex(i => (i - 1 + activeDeck.cards.length) % activeDeck.cards.length), 150) }

  // ── Study view ──────────────────────────────────────────────────────────────
  if (activeDeck) {
    const card = activeDeck.cards?.[cardIndex]
    if (!card) return null
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => setActiveDeck(null)}>
            <ChevronLeft size={16} /> Back to Decks
          </Button>
          <div className="flex items-center gap-3">
            <span className="text-sm text-[var(--text-2)]">{cardIndex + 1} / {activeDeck.cards.length}</span>
            <Badge color="emerald">{mastered.size} mastered</Badge>
          </div>
        </div>

        <div className="h-1.5 bg-[var(--surface-2)] rounded-full overflow-hidden">
          <motion.div
            animate={{ width: `${((cardIndex + 1) / activeDeck.cards.length) * 100}%` }}
            className="h-full bg-gradient-primary rounded-full"
          />
        </div>

        <div className="flip-card h-64 cursor-pointer" onClick={() => setFlipped(f => !f)}>
          <div className={cn('flip-card-inner w-full h-full', flipped && 'flipped')}>
            <div className="flip-card-front absolute inset-0">
              <Card className="w-full h-full flex flex-col items-center justify-center p-8 text-center">
                <span className="text-xs font-semibold text-[var(--text-3)] uppercase tracking-wider mb-4">Question</span>
                <p className="font-display text-lg font-semibold text-[var(--text-1)] leading-relaxed">{card.front}</p>
                <p className="text-xs text-[var(--text-3)] mt-6">Tap to reveal answer</p>
              </Card>
            </div>
            <div className="flip-card-back absolute inset-0">
              <Card className="w-full h-full flex flex-col items-center justify-center p-8 text-center bg-gradient-to-br from-primary-50 to-primary-100 dark:from-primary-900/30 dark:to-primary-800/20 border-primary-200 dark:border-primary-700">
                <span className="text-xs font-semibold text-primary-500 uppercase tracking-wider mb-4">Answer</span>
                <p className="text-sm text-[var(--text-1)] leading-relaxed">{card.back}</p>
              </Card>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <button onClick={prev} className="w-10 h-10 rounded-xl bg-[var(--surface)] border border-[var(--border)] flex items-center justify-center hover:bg-[var(--surface-2)] transition-colors">
            <ChevronLeft size={18} className="text-[var(--text-2)]" />
          </button>
          {flipped ? (
            <div className="flex gap-3">
              <Button variant="secondary" onClick={() => { setMastered(m => { const n = new Set(m); n.delete(card.id); return n }); next() }} className="gap-2">
                <ThumbsDown size={16} className="text-rose-500" /> Still Learning
              </Button>
              <Button variant="gradient" onClick={() => { setMastered(m => new Set([...m, card.id])); next() }} className="gap-2">
                <ThumbsUp size={16} /> Got It!
              </Button>
            </div>
          ) : (
            <Button variant="secondary" onClick={() => setFlipped(true)}>Reveal Answer</Button>
          )}
          <button onClick={next} className="w-10 h-10 rounded-xl bg-[var(--surface)] border border-[var(--border)] flex items-center justify-center hover:bg-[var(--surface-2)] transition-colors">
            <ChevronRight size={18} className="text-[var(--text-2)]" />
          </button>
        </div>
      </div>
    )
  }

  // ── Deck list ────────────────────────────────────────────────────────────────
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-xl font-bold text-[var(--text-1)]">Flashcard Decks</h2>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" className="gap-2" onClick={() => { setModal('manual'); setManualError('') }}>
            <PenLine size={14} /> Create Manually
          </Button>
          <Button variant="gradient" size="sm" className="gap-2" onClick={() => { setModal('ai'); setGenError('') }}>
            <Sparkles size={14} /> AI Generate
          </Button>
        </div>
      </div>

      {/* ── AI Generate Modal ── */}
      <AnimatePresence>
        {modal === 'ai' && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md glass rounded-2xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-display font-semibold text-[var(--text-1)]">Generate Flashcards with AI</h3>
                <button onClick={() => setModal(null)} className="p-1 rounded-lg hover:bg-[var(--surface-2)] text-[var(--text-2)]"><X size={16} /></button>
              </div>
              {genError && <p className="text-xs text-rose-500 bg-rose-500/10 border border-rose-500/20 rounded-lg px-3 py-2">{genError}</p>}
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-[var(--text-3)] mb-1 block">Document</label>
                  <select value={genForm.material_id} onChange={e => setGenForm(f => ({ ...f, material_id: e.target.value }))}
                    className="w-full px-3 py-2.5 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] text-sm text-[var(--text-1)] focus:outline-none focus:border-[var(--primary)] transition-colors">
                    <option value="">Select a document…</option>
                    {materials.filter(m => m.is_processed).map((m: any) => (
                      <option key={m.id} value={m.id}>{m.title}</option>
                    ))}
                  </select>
                </div>
                <input value={genForm.title} onChange={e => setGenForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="Deck title (optional)"
                  className="w-full px-3 py-2.5 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] text-sm text-[var(--text-1)] placeholder:text-[var(--text-3)] focus:outline-none focus:border-[var(--primary)] transition-colors"
                />
                <div>
                  <label className="text-xs text-[var(--text-3)] mb-1 block">Number of cards</label>
                  <select value={genForm.num_cards} onChange={e => setGenForm(f => ({ ...f, num_cards: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] text-sm text-[var(--text-1)] focus:outline-none focus:border-[var(--primary)] transition-colors">
                    {[5, 10, 15, 20, 30].map(n => <option key={n} value={n}>{n} cards</option>)}
                  </select>
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="secondary" size="sm" onClick={() => setModal(null)}>Cancel</Button>
                <Button variant="gradient" size="sm" onClick={generateDeck} disabled={generating || !genForm.material_id}>
                  {generating ? 'Generating…' : 'Generate'}
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Manual Create Modal ── */}
      <AnimatePresence>
        {modal === 'manual' && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-lg glass rounded-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between">
                <h3 className="font-display font-semibold text-[var(--text-1)]">Create Flashcard Deck</h3>
                <button onClick={() => setModal(null)} className="p-1 rounded-lg hover:bg-[var(--surface-2)] text-[var(--text-2)]"><X size={16} /></button>
              </div>
              {manualError && <p className="text-xs text-rose-500 bg-rose-500/10 border border-rose-500/20 rounded-lg px-3 py-2">{manualError}</p>}

              <input
                value={manualTitle} onChange={e => setManualTitle(e.target.value)}
                placeholder="Deck title (e.g. Chapter 3 — Cell Biology)"
                className="w-full px-3 py-2.5 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] text-sm text-[var(--text-1)] placeholder:text-[var(--text-3)] focus:outline-none focus:border-[var(--primary)] transition-colors"
              />

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-[var(--text-3)] uppercase tracking-wider">Cards ({manualCards.length})</label>
                  <button onClick={() => setManualCards(c => [...c, { front: '', back: '' }])}
                    className="flex items-center gap-1 text-xs text-primary-500 hover:text-primary-600 font-medium">
                    <Plus size={12} /> Add card
                  </button>
                </div>
                {manualCards.map((card, i) => (
                  <div key={i} className="grid grid-cols-2 gap-2 p-3 rounded-xl bg-[var(--surface-2)] border border-[var(--border)]">
                    <div>
                      <label className="text-[10px] text-[var(--text-3)] mb-1 block">Front (Question)</label>
                      <textarea
                        value={card.front}
                        onChange={e => setManualCards(c => c.map((x, j) => j === i ? { ...x, front: e.target.value } : x))}
                        placeholder="Question or term…"
                        rows={2}
                        className="w-full px-2 py-1.5 rounded-lg bg-[var(--surface)] border border-[var(--border)] text-xs text-[var(--text-1)] placeholder:text-[var(--text-3)] focus:outline-none focus:border-[var(--primary)] resize-none transition-colors"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-[var(--text-3)] mb-1 block">Back (Answer)</label>
                      <textarea
                        value={card.back}
                        onChange={e => setManualCards(c => c.map((x, j) => j === i ? { ...x, back: e.target.value } : x))}
                        placeholder="Answer or definition…"
                        rows={2}
                        className="w-full px-2 py-1.5 rounded-lg bg-[var(--surface)] border border-[var(--border)] text-xs text-[var(--text-1)] placeholder:text-[var(--text-3)] focus:outline-none focus:border-[var(--primary)] resize-none transition-colors"
                      />
                    </div>
                    {manualCards.length > 1 && (
                      <button onClick={() => setManualCards(c => c.filter((_, j) => j !== i))}
                        className="col-span-2 flex items-center gap-1 text-xs text-rose-500 hover:text-rose-600 justify-end">
                        <Trash2 size={11} /> Remove
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <div className="flex gap-2 justify-end">
                <Button variant="secondary" size="sm" onClick={() => setModal(null)}>Cancel</Button>
                <Button variant="gradient" size="sm" onClick={saveManualDeck} disabled={saving}>
                  {saving ? 'Saving…' : `Save Deck (${manualCards.filter(c => c.front && c.back).length} cards)`}
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[0,1,2].map(i => <Skeleton key={i} className="h-48 rounded-2xl" />)}
        </div>
      ) : decks.length === 0 ? (
        <Card className="p-12 text-center">
          <BookOpen size={32} className="mx-auto text-[var(--text-3)] mb-3" />
          <p className="text-sm font-medium text-[var(--text-2)]">No flashcard decks yet</p>
          <p className="text-xs text-[var(--text-3)] mt-1">Create manually or generate from a document</p>
          <div className="flex gap-2 justify-center mt-4">
            <Button variant="secondary" size="sm" className="gap-1.5" onClick={() => setModal('manual')}><PenLine size={13} /> Create Manually</Button>
            <Button variant="gradient" size="sm" className="gap-1.5" onClick={() => setModal('ai')}><Sparkles size={13} /> AI Generate</Button>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {decks.map((deck, idx) => {
            const cards      = deck.cards ?? []
            const color      = badgeColors[idx % badgeColors.length]
            const ringColor  = ringColors[idx % ringColors.length]
            const masteryPct = cards.length > 0 ? Math.round((deck.mastered_count ?? 0) / cards.length * 100) : 0
            return (
              <Card key={deck.id} hover className="p-5 space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <Badge color={color}>{deck.subject_name ?? 'General'}</Badge>
                    <h3 className="font-display font-semibold text-[var(--text-1)] mt-2 text-sm">{deck.title}</h3>
                  </div>
                  <ProgressRing value={masteryPct} size={48} stroke={4} color={ringColor}>
                    <span className="text-[9px] font-bold text-[var(--text-1)]">{masteryPct}%</span>
                  </ProgressRing>
                </div>
                <div className="grid grid-cols-2 gap-2 text-center">
                  <div className="p-2 rounded-lg bg-[var(--surface-2)]">
                    <p className="text-sm font-bold text-[var(--text-1)]">{cards.length}</p>
                    <p className="text-xs text-[var(--text-3)]">Cards</p>
                  </div>
                  <div className="p-2 rounded-lg bg-emerald-400/10">
                    <p className="text-sm font-bold text-emerald-500">{deck.mastered_count ?? 0}</p>
                    <p className="text-xs text-[var(--text-3)]">Mastered</p>
                  </div>
                </div>
                <Button
                  variant={cards.length > 0 ? 'gradient' : 'secondary'}
                  size="sm" className="w-full"
                  onClick={() => startDeck(deck)}
                  disabled={cards.length === 0}
                >
                  {cards.length === 0 ? 'No cards' : 'Study Now'}
                </Button>
              </Card>
            )
          })}
        </div>
      )}
    </motion.div>
  )
}
