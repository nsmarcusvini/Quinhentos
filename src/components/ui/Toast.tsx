import { AnimatePresence, motion } from 'framer-motion'
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'

export interface ToastOptions {
  title: string
  description?: string
  /** Ação opcional no rodapé do toast (ex.: "Desfazer"). */
  action?: { label: string; onClick: () => void }
  durationMs?: number
}

interface Toast extends ToastOptions {
  id: number
}

const ToastContext = createContext<((options: ToastOptions) => void) | null>(null)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const nextId = useRef(0)
  const timers = useRef(new Map<number, number>())

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id))
    const timer = timers.current.get(id)
    if (timer) {
      window.clearTimeout(timer)
      timers.current.delete(id)
    }
  }, [])

  const showToast = useCallback(
    (options: ToastOptions) => {
      const id = nextId.current++
      setToasts((current) => [...current.slice(-2), { ...options, id }])
      const timer = window.setTimeout(() => dismiss(id), options.durationMs ?? 4200)
      timers.current.set(id, timer)
    },
    [dismiss],
  )

  useEffect(() => {
    const pending = timers.current
    return () => {
      pending.forEach((timer) => window.clearTimeout(timer))
      pending.clear()
    }
  }, [])

  const value = useMemo(() => showToast, [showToast])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        aria-atomic="false"
        className="pointer-events-none fixed inset-x-0 bottom-0 z-[60] flex flex-col items-center gap-2 px-4 pb-[max(1rem,env(safe-area-inset-bottom))]"
      >
        <AnimatePresence initial={false}>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              layout
              initial={{ opacity: 0, y: 20, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.96 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
              className="pointer-events-auto w-full max-w-sm rounded-2xl border border-brand-500/30 bg-surface/95 p-3.5 shadow-soft backdrop-blur"
            >
              <p className="text-sm font-semibold text-ink">{toast.title}</p>
              {toast.description && (
                <p className="mt-0.5 text-sm leading-snug text-muted">{toast.description}</p>
              )}
              {toast.action && (
                <button
                  type="button"
                  className="mt-2 min-h-[36px] text-sm font-semibold text-accent underline-offset-4 hover:underline"
                  onClick={() => {
                    toast.action?.onClick()
                    dismiss(toast.id)
                  }}
                >
                  {toast.action.label}
                </button>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  )
}

export function useToast(): (options: ToastOptions) => void {
  const context = useContext(ToastContext)
  if (!context) throw new Error('useToast precisa estar dentro de <ToastProvider>.')
  return context
}
