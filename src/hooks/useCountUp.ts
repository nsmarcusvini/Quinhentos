import { useEffect, useRef, useState } from 'react'
import { prefersReducedMotion } from '../lib/motion'

const easeOut = (t: number): number => 1 - Math.pow(1 - t, 3)

/**
 * Anima um número do valor anterior até o novo valor.
 * Com `prefers-reduced-motion` o valor salta direto, sem animação.
 */
export function useCountUp(target: number, durationMs = 600): number {
  const [value, setValue] = useState(target)
  const fromRef = useRef(target)
  const frameRef = useRef<number | null>(null)

  /**
   * Espelha o valor exibido.
   *
   * O cleanup precisa do valor ATUAL. Ler `value` do closure trazia o valor do
   * render em que o efeito nasceu — depois de uma animação completa, um valor
   * velho. Gravá-lo em `fromRef` fazia a mudança seguinte começar do lugar
   * errado e, quando o valor velho por acaso era igual ao novo alvo, o efeito
   * saía pelo atalho `from === target` e o número congelava na tela.
   */
  const valueRef = useRef(target)

  useEffect(() => {
    // Sem animação não há o que animar: mantém as referências em dia e sai.
    // O valor exibido vem direto do alvo lá embaixo, sem passar pelo estado.
    if (prefersReducedMotion()) {
      fromRef.current = target
      valueRef.current = target
      return
    }

    const from = fromRef.current
    if (from === target) return

    const start = performance.now()

    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / durationMs)
      const current = from + (target - from) * easeOut(progress)
      valueRef.current = current
      setValue(current)

      if (progress < 1) {
        frameRef.current = requestAnimationFrame(tick)
      } else {
        fromRef.current = target
        valueRef.current = target
        frameRef.current = null
      }
    }

    frameRef.current = requestAnimationFrame(tick)

    return () => {
      // Só mexe em `fromRef` quando a animação foi cortada no meio: aí a
      // próxima retoma de onde esta parou. Se ela terminou, `fromRef` já
      // guarda o alvo certo e tocar nele seria justamente o bug acima.
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current)
        frameRef.current = null
        fromRef.current = valueRef.current
      }
    }
  }, [target, durationMs])

  return prefersReducedMotion() ? target : value
}
