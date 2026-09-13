import { Link } from 'react-router-dom'
import { ArrowRightIcon } from '../../components/ui/icons'
import { cn } from '../../lib/cn'
import { formatCurrencyCompact } from '../../lib/format'

interface CtaButtonProps {
  /** Total já guardado; muda o texto de "começar" para "continuar". */
  saved: number
  size?: 'md' | 'lg'
  fullWidth?: boolean
  className?: string
}

/**
 * Único destino da landing: /app. O texto muda quando já existe progresso
 * salvo no aparelho — quem voltou não quer "começar", quer continuar.
 */
export function CtaButton({ saved, size = 'lg', fullWidth, className }: CtaButtonProps) {
  const started = saved > 0

  return (
    <Link
      to="/app"
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-2xl bg-brand-500 font-semibold text-[#06210F]',
        'shadow-glow transition-[background-color,transform] duration-150 hover:bg-brand-400 active:scale-[0.98]',
        size === 'lg' ? 'min-h-[56px] px-7 text-base' : 'min-h-[48px] px-5 text-sm',
        fullWidth && 'w-full',
        className,
      )}
    >
      {started ? `Continuar meu desafio — ${formatCurrencyCompact(saved)} guardados` : 'Começar meu desafio'}
      <ArrowRightIcon width={18} height={18} />
    </Link>
  )
}
