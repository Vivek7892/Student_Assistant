import { useState } from 'react'
import { motion } from 'framer-motion'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Card } from '../../components/ui'
import { cn } from '../../lib/utils'

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']

export default function Calendar() {
  const today = new Date()
  const [year,  setYear]  = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())

  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const firstDay    = new Date(year, month, 1).getDay()
  const cells       = Array.from({ length: firstDay + daysInMonth }, (_, i) => i < firstDay ? null : i - firstDay + 1)

  function prev() { if (month === 0) { setMonth(11); setYear(y => y - 1) } else setMonth(m => m - 1) }
  function next() { if (month === 11) { setMonth(0); setYear(y => y + 1) } else setMonth(m => m + 1) }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4 max-w-4xl">
      <Card className="p-4 sm:p-6">
        <div className="flex items-center justify-between mb-4 sm:mb-6">
          <h2 className="font-display text-lg sm:text-xl font-bold text-[var(--text-1)]">{MONTHS[month]} {year}</h2>
          <div className="flex gap-2">
            <button onClick={prev} className="w-8 h-8 rounded-lg border border-[var(--border)] flex items-center justify-center hover:bg-[var(--surface-2)] transition-colors">
              <ChevronLeft size={16} className="text-[var(--text-2)]" />
            </button>
            <button onClick={next} className="w-8 h-8 rounded-lg border border-[var(--border)] flex items-center justify-center hover:bg-[var(--surface-2)] transition-colors">
              <ChevronRight size={16} className="text-[var(--text-2)]" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-7 mb-2">
          {DAYS_OF_WEEK.map(d => (
            <div key={d} className="text-center text-[10px] sm:text-xs font-semibold text-[var(--text-3)] py-2">{d}</div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-0.5 sm:gap-1">
          {cells.map((day, i) => {
            if (!day) return <div key={i} />
            const isToday = day === today.getDate() && month === today.getMonth() && year === today.getFullYear()
            return (
              <motion.div key={i} whileHover={{ scale: 1.05 }}
                className={cn(
                  'aspect-square rounded-lg sm:rounded-xl flex items-center justify-center cursor-pointer transition-colors',
                  isToday ? 'bg-gradient-primary text-white shadow-glass' : 'hover:bg-[var(--surface-2)]'
                )}
              >
                <span className={cn('text-xs sm:text-sm font-medium', isToday ? 'text-white' : 'text-[var(--text-1)]')}>{day}</span>
              </motion.div>
            )
          })}
        </div>
      </Card>

      <Card className="p-4 sm:p-5">
        <h3 className="font-display font-semibold text-[var(--text-1)] mb-3">Upcoming Deadlines</h3>
        <p className="text-sm text-[var(--text-3)] text-center py-6">No deadlines scheduled. Add assignments to see them here.</p>
      </Card>
    </motion.div>
  )
}
