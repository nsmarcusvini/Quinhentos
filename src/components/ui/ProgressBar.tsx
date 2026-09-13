import { cn } from '../../lib/cn'

interface ProgressBarProps {
  /** Fração de 0 a 1. */
  value: number
  className?: string
  /** Rótulo acessível descrevendo o que a barra representa. */
  label: string
  size?: 'sm' | 'md'
}

export function ProgressBar({ value, className, label, size = 'md' }: ProgressBarProps) {
  const percent = Math.min(100, Math.max(0, value * 100))

  return (
    <div
      role="progressbar"
      aria-valuenow={Number(percent.toFixed(1))}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
      className={cn(
        'w-full overflow-hidden rounded-full bg-surface-2',
        size === 'sm' ? 'h-1.5' : 'h-2.5',
        className,
      )}
    >
      <div
        className="h-full rounded-full bg-gradient-to-r from-brand-600 via-brand-500 to-brand-400 transition-[width] duration-500 ease-out"
        style={{ width: `${percent}%` }}
      />
    </div>
  )
}
