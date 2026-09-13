import { Sheet } from '../../components/ui/Sheet'
import type { ChallengeStats } from '../../state/useStats'
import { HistoryPanel } from './HistoryPanel'
import { StatsPanel } from './StatsPanel'
import type { PanelId } from './panels'

interface AppPanelsProps {
  panel: PanelId | null
  stats: ChallengeStats
  onClose: () => void
  onUndo: (houseNumber: number) => void
}

const TITLES: Record<PanelId, string> = {
  stats: 'Estatísticas',
  history: 'Histórico',
  settings: 'Configurações',
}

export function AppPanels({ panel, stats, onClose, onUndo }: AppPanelsProps) {
  return (
    <Sheet open={panel !== null} title={panel ? TITLES[panel] : ''} onClose={onClose}>
      {panel === 'stats' && <StatsPanel stats={stats} />}
      {panel === 'history' && <HistoryPanel stats={stats} onUndo={onUndo} />}
      {panel === 'settings' && <p className="text-sm text-muted">Em construção.</p>}
    </Sheet>
  )
}
