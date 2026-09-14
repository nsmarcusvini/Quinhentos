import { Link } from 'react-router-dom'
import { ArrowRightIcon } from '../../components/ui/icons'
import { cn } from '../../lib/cn'
import { formatCurrency } from '../../lib/format'
import { CHECKOUT_HREF, PLANO_MENSAL, PLANO_VITALICIO } from '../../lib/pricing'
import { trackEvent } from '../../lib/analytics'

interface CtaButtonProps {
  /** Onde na página este botão está — entra no evento de analytics. */
  position: string
  /** Total já riscado na demo; muda "quero" para "destravar". */
  saved?: number
  size?: 'md' | 'lg'
  fullWidth?: boolean
  /** Mostra a linha de reasseguramento embaixo do botão. */
  reassurance?: boolean
  className?: string
}

/**
 * Único destino da landing.
 *
 * O preço continua visível no botão, porque esconder o valor até o checkout
 * aumenta o clique e derruba a conversão final. Com duas ofertas ele vira "a
 * partir de" — e a linha logo abaixo diz as duas por extenso, para o "a partir
 * de" não virar a meia-verdade de sempre.
 */
export function CtaButton({
  position,
  saved = 0,
  size = 'lg',
  fullWidth,
  reassurance,
  className,
}: CtaButtonProps) {
  const started = saved > 0

  return (
    <div className={cn(fullWidth && 'w-full', className)}>
      <Link
        to={CHECKOUT_HREF}
        onClick={() => trackEvent('cta_click', { position, demo_saved: saved })}
        className={cn(
          'inline-flex items-center justify-center gap-2 rounded-2xl bg-brand-500 text-center font-semibold text-[#06210F]',
          'shadow-glow transition-[background-color,transform] duration-150 hover:bg-brand-400 active:scale-[0.98]',
          size === 'lg' ? 'min-h-[56px] px-7 text-base' : 'min-h-[48px] px-5 text-sm',
          fullWidth && 'w-full',
        )}
      >
        {started ? 'Destravar meu desafio' : 'Quero meu acesso'} — a partir de{' '}
        {formatCurrency(PLANO_MENSAL.preco)}
        <ArrowRightIcon width={18} height={18} />
      </Link>

      {reassurance && (
        <p className={cn('mt-2 text-xs text-muted', fullWidth && 'text-center')}>
          {formatCurrency(PLANO_MENSAL.preco)} por mês, cancele quando quiser · ou{' '}
          {formatCurrency(PLANO_VITALICIO.preco)} uma vez e é seu para sempre
        </p>
      )}
    </div>
  )
}
