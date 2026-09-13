import { useCallback, useState, type ReactElement } from 'react'
import { Modal } from '../../components/ui/Modal'
import { useToast } from '../../components/ui/Toast'
import { formatCurrency } from '../../lib/format'
import { useChallenge } from '../../state/ChallengeContext'

interface UnmarkFlow {
  /** Pede a desmarcação: abre a confirmação. */
  requestUnmark: (houseNumber: number) => void
  /** O diálogo de confirmação — renderize uma vez na árvore. */
  dialog: ReactElement
}

/**
 * Desmarcar sempre passa por confirmação e sempre oferece desfazer.
 * Compartilhado pelo grid e pelo histórico para a regra não divergir.
 */
export function useUnmarkFlow(): UnmarkFlow {
  const { entries, mark, unmark } = useChallenge()
  const showToast = useToast()
  const [target, setTarget] = useState<number | null>(null)

  const close = useCallback(() => setTarget(null), [])

  const confirm = useCallback(() => {
    if (target === null) return

    const houseNumber = target
    const markedAt = entries[houseNumber]
    setTarget(null)
    unmark(houseNumber)

    showToast({
      title: `Casinha ${houseNumber} desmarcada`,
      description: `${formatCurrency(houseNumber)} saíram do seu total.`,
      action: markedAt
        ? { label: 'Desfazer', onClick: () => mark(houseNumber, markedAt) }
        : undefined,
    })
  }, [entries, mark, showToast, target, unmark])

  const dialog = (
    <Modal
      open={target !== null}
      title={`Desmarcar a casinha ${target ?? ''}?`}
      description={
        target !== null
          ? `Isso tira ${formatCurrency(target)} do seu total guardado. Você pode marcar de novo quando quiser.`
          : undefined
      }
      confirmLabel="Desmarcar"
      destructive
      onConfirm={confirm}
      onClose={close}
    />
  )

  return { requestUnmark: setTarget, dialog }
}
