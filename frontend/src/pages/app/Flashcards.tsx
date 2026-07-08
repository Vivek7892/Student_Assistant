import { useEffect, useMemo, useState } from 'react'
import { Layers, Sparkles, Trash2 } from 'lucide-react'
import { Badge, Button, Card } from '../../components/ui'
import { api } from '../../lib/api'

interface Material { id: string; title: string; file_name: string }
interface CardItem { front?: string; back?: string; question?: string; answer?: string }
interface Deck { id: string; title: string; cards: CardItem[]; created_at: string }

export default function Flashcards() {
  const [materials, setMaterials] = useState<Material[]>([])
  const [decks, setDecks] = useState<Deck[]>([])
  const [materialId, setMaterialId] = useState('')
  const [count, setCount] = useState(15)
  const [active, setActive] = useState<Deck | null>(null)
  const [index, setIndex] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [generating, setGenerating] = useState(false)

  async function load() {
    const [matRes, deckRes] = await Promise.all([
      api.get('/api/courses/materials/'),
      api.get('/api/ai/flashcards/'),
    ])
    const mats = Array.isArray(matRes.data) ? matRes.data : matRes.data.results ?? []
    setMaterials(mats)
    setMaterialId(current => current || mats[0]?.id || '')
    setDecks(Array.isArray(deckRes.data) ? deckRes.data : deckRes.data.results ?? [])
  }

  useEffect(() => { load() }, [])

  const card = useMemo(() => active?.cards?.[index], [active, index])

  async function generate() {
    if (!materialId) return
    setGenerating(true)
    try {
      const res = await api.post('/api/ai/flashcards/generate/', { material_id: materialId, num_cards: count })
      setDecks(current => [res.data, ...current])
      setActive(res.data)
      setIndex(0)
      setFlipped(false)
    } finally {
      setGenerating(false)
    }
  }

  async function remove(id: string) {
    await api.delete(`/api/ai/flashcards/${id}/`)
    setDecks(current => current.filter(deck => deck.id !== id))
    if (active?.id === id) setActive(null)
  }

  function next() {
    if (!active?.cards?.length) return
    setIndex(i => (i + 1) % active.cards.length)
    setFlipped(false)
  }

  return (
    <div className="space-y-5 pb-20 md:pb-0">
      <div>
        <h2 className="font-display text-xl font-bold">Flashcards</h2>
        <p className="text-sm text-[var(--text-2)]">Generate decks from your uploaded documents and save them to your account.</p>
      </div>

      <Card className="grid gap-3 p-4 md:grid-cols-4">
        <select value={materialId} onChange={e => setMaterialId(e.target.value)} className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm md:col-span-2">
          {materials.map(material => <option key={material.id} value={material.id}>{material.title || material.file_name}</option>)}
        </select>
        <input type="number" min={5} max={50} value={count} onChange={e => setCount(Number(e.target.value))} className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm" />
        <Button variant="gradient" disabled={!materialId || generating} onClick={generate}><Sparkles size={15} /> {generating ? 'Generating...' : 'Generate'}</Button>
      </Card>

      <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
        <div className="space-y-3">
          {decks.map(deck => (
            <Card key={deck.id} hover className="p-3" onClick={() => { setActive(deck); setIndex(0); setFlipped(false) }}>
              <div className="flex items-center gap-2">
                <Layers size={16} className="text-primary-500" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{deck.title}</p>
                  <p className="text-xs text-[var(--text-3)]">{deck.cards?.length || 0} cards</p>
                </div>
                <button onClick={e => { e.stopPropagation(); remove(deck.id) }} className="text-[var(--text-3)] hover:text-rose-500"><Trash2 size={14} /></button>
              </div>
            </Card>
          ))}
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-[var(--surface-2)]">
              <div className="h-full bg-gradient-primary" style={{ width: `${active?.cards?.length ? ((index + 1) / active.cards.length) * 100 : 0}%` }} />
            </div>
            <Badge>{active?.cards?.length ? `${index + 1}/${active.cards.length}` : '0/0'}</Badge>
          </div>
          {card ? (
            <>
              <Card hover className="flex min-h-72 cursor-pointer items-center justify-center p-8 text-center" onClick={() => setFlipped(value => !value)}>
                <div>
                  <p className="text-xs uppercase text-[var(--text-3)]">{flipped ? 'Answer' : 'Question'}</p>
                  <h3 className="mt-4 font-display text-xl font-semibold">{flipped ? (card.back || card.answer) : (card.front || card.question)}</h3>
                </div>
              </Card>
              <Button variant="gradient" className="w-full" onClick={next}>Next Card</Button>
            </>
          ) : (
            <Card className="p-10 text-center text-sm text-[var(--text-2)]">Choose or generate a deck.</Card>
          )}
        </div>
      </div>
    </div>
  )
}
