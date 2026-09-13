import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { HouseGrid } from '../../components/HouseGrid'
import { useToast } from '../../components/ui/Toast'
import { useCelebration } from '../../hooks/useCelebration'
import { HOUSE_COUNT, HOUSE_NUMBERS } from '../../lib/constants'
import { formatCurrency } from '../../lib/format'
import { scrollBehavior } from '../../lib/motion'
import { useChallenge } from '../../state/ChallengeContext'
import { useStats } from '../../state/useStats'
import { AppHeader } from './AppHeader'
import { AppPanels } from './AppPanels'
import { MilestoneStrip } from './MilestoneStrip'
import { Toolbar, type HouseFilter } from './Toolbar'
import { useUnmarkFlow } from './useUnmarkFlow'
import type { PanelId } from './panels'

const HIGHLIGHT_MS = 2600

export default function AppPage() {
  const { state, entries, mark } = useChallenge()
  const stats = useStats()
  const showToast = useToast()
  const { requestUnmark, dialog: unmarkDialog } = useUnmarkFlow()

  useCelebration(stats)

  const [filter, setFilter] = useState<HouseFilter>('todas')
  const [search, setSearch] = useState('')
  const [highlighted, setHighlighted] = useState<number | null>(null)
  const [panel, setPanel] = useState<PanelId | null>(null)

  const visibleNumbers = useMemo(() => {
    if (filter === 'guardadas') return stats.markedNumbers
    if (filter === 'pendentes') return stats.pendingNumbers
    return HOUSE_NUMBERS
  }, [filter, stats.markedNumbers, stats.pendingNumbers])

  // O destaque do sorteio/busca se apaga sozinho.
  useEffect(() => {
    if (highlighted === null) return
    const timer = window.setTimeout(() => setHighlighted(null), HIGHLIGHT_MS)
    return () => window.clearTimeout(timer)
  }, [highlighted])

  const spotlight = useCallback((houseNumber: number) => {
    setHighlighted(houseNumber)
    // Espera o próximo frame: o filtro pode ter acabado de mudar.
    requestAnimationFrame(() => {
      document
        .getElementById(`casa-${houseNumber}`)
        ?.scrollIntoView({ block: 'center', behavior: scrollBehavior() })
    })
  }, [])

  const ensureVisible = useCallback(
    (houseNumber: number) => {
      const marked = entries[houseNumber] !== undefined
      if ((filter === 'guardadas' && !marked) || (filter === 'pendentes' && marked)) {
        setFilter('todas')
      }
    },
    [entries, filter],
  )

  const handleSearchChange = useCallback(
    (raw: string) => {
      const digits = raw.replace(/\D/g, '').slice(0, 3)
      setSearch(digits)

      const houseNumber = Number(digits)
      if (!digits || houseNumber < 1 || houseNumber > HOUSE_COUNT) return

      ensureVisible(houseNumber)
      spotlight(houseNumber)
    },
    [ensureVisible, spotlight],
  )

  const handleDraw = useCallback(() => {
    const pending = stats.pendingNumbers
    if (pending.length === 0) return

    const drawn = pending[Math.floor(Math.random() * pending.length)] as number
    if (filter === 'guardadas') setFilter('todas')
    spotlight(drawn)
    showToast({
      title: `Sorteamos a casinha ${drawn}`,
      description: `Guarde ${formatCurrency(drawn)} e toque na casinha para marcar.`,
    })
  }, [filter, showToast, spotlight, stats.pendingNumbers])

  // Handler estável: o grid nunca recebe um callback novo, então marcar uma
  // casinha re-renderiza só ela (as outras 499 ficam paradas pelo memo).
  const activate = (houseNumber: number) => {
    if (entries[houseNumber] === undefined) mark(houseNumber)
    else requestUnmark(houseNumber)
  }
  const activateRef = useRef(activate)
  useEffect(() => {
    activateRef.current = activate
  })
  const handleActivate = useCallback((houseNumber: number) => activateRef.current(houseNumber), [])

  return (
    <div className="min-h-dvh bg-bg">
      <AppHeader challengeName={state.challengeName} stats={stats} onOpenPanel={setPanel} />

      <main id="conteudo" className="mx-auto w-full max-w-5xl px-4 pb-16 pt-4">
        {stats.markedCount > 0 && (
          <div className="mb-4">
            <MilestoneStrip stats={stats} />
          </div>
        )}

        <Toolbar
          filter={filter}
          onFilterChange={setFilter}
          search={search}
          onSearchChange={handleSearchChange}
          onDraw={handleDraw}
          drawDisabled={stats.pendingCount === 0}
          counts={{
            todas: HOUSE_COUNT,
            guardadas: stats.markedCount,
            pendentes: stats.pendingCount,
          }}
        />

        {stats.markedCount === 0 && (
          <p className="mt-4 rounded-2xl border border-brand-500/25 bg-brand-500/5 px-4 py-3 text-sm text-muted">
            Guarde o valor de verdade e toque na casinha correspondente. A ordem é livre — pode
            começar pela 500 ou pela 1.
          </p>
        )}

        <div className="mt-4">
          <HouseGrid
            numbers={visibleNumbers}
            entries={entries}
            highlighted={highlighted}
            onActivate={handleActivate}
          />
        </div>
      </main>

      {unmarkDialog}

      <AppPanels
        panel={panel}
        stats={stats}
        onClose={() => setPanel(null)}
        onUndo={requestUnmark}
      />
    </div>
  )
}
