import { DownloadIcon, ShareIcon, WifiOffIcon } from '../../components/ui/icons'
import { Button } from '../../components/ui/Button'
import { useInstallPrompt } from '../../hooks/useInstallPrompt'
import { HOUSE_COUNT, TOTAL_AMOUNT } from '../../lib/constants'
import { formatCurrencyCompact } from '../../lib/format'
import { GUARANTEE_DAYS } from '../../lib/pricing'
import type { ChallengeStats } from '../../state/useStats'
import { CtaButton } from './CtaButton'

const INSTRUCTIONS: Record<'ios' | 'android' | 'desktop', string> = {
  ios: 'No Safari: toque em Compartilhar e depois em "Adicionar à Tela de Início".',
  android: 'No Chrome: toque no menu ⋮ e depois em "Instalar app".',
  desktop: 'No navegador: clique no ícone de instalar na barra de endereço.',
}

export function FinalCta({ stats }: { stats: ChallengeStats }) {
  const { canInstall, isInstalled, platform, promptInstall } = useInstallPrompt()

  return (
    <section className="px-4 pb-16 pt-12 sm:pt-16">
      <div className="mx-auto w-full max-w-3xl text-center">
        <h2 className="text-2xl font-bold leading-tight tracking-tight text-ink sm:text-4xl">
          {stats.saved > 0
            ? 'Você já riscou as primeiras. Leve o resto com você.'
            : 'A casinha 1 custa R$ 1. O resto vem sozinho.'}
        </h2>

        <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-muted sm:text-base">
          {HOUSE_COUNT} casinhas, {formatCurrencyCompact(TOTAL_AMOUNT)} no fim da linha e{' '}
          No mensal, cancele quando quiser. No vitalício, {GUARANTEE_DAYS} dias para desistir
          sem perder nada.
        </p>

        <div className="mt-7 flex justify-center">
          <CtaButton position="final" saved={stats.saved} reassurance />
        </div>

        <div className="mx-auto mt-10 max-w-md rounded-2xl border border-line bg-surface/70 p-4 text-left">
          <p className="flex items-center gap-2 text-sm font-semibold text-ink">
            <WifiOffIcon width={18} height={18} className="text-accent" />
            Depois da compra, instale e use offline
          </p>

          {isInstalled ? (
            <p className="mt-2 text-sm text-muted">
              O app já está instalado neste aparelho. Bom desafio!
            </p>
          ) : (
            <>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                {INSTRUCTIONS[platform]} Ele abre como aplicativo, direto da tela inicial, sem
                precisar de internet.
              </p>
              {canInstall && (
                <Button variant="secondary" className="mt-3" onClick={() => void promptInstall()}>
                  <DownloadIcon width={18} height={18} />
                  Instalar agora
                </Button>
              )}
              {!canInstall && platform === 'ios' && (
                <p className="mt-2 flex items-center gap-1.5 text-xs text-muted">
                  <ShareIcon width={14} height={14} />
                  O botão Compartilhar fica na barra inferior do Safari.
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </section>
  )
}
