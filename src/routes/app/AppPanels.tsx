import { Sheet } from '../../components/ui/Sheet'
import type { PanelId } from './panels'

interface AppPanelsProps {
  panel: PanelId | null
  onClose: () => void
}

const TITLES: Record<PanelId, string> = {
  stats: 'Estatísticas',
  history: 'Histórico',
  settings: 'Configurações',
}

export function AppPanels({ panel, onClose }: AppPanelsProps) {
  return (
    <Sheet open={panel !== null} title={panel ? TITLES[panel] : ''} onClose={onClose}>
      <p className="text-sm text-muted">Em construção.</p>
    </Sheet>
  )
}
