import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  type ReactNode,
} from 'react'
import { prefersReducedMotion } from '../lib/motion'

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  size: number
  rotation: number
  spin: number
  color: string
  life: number
}

const COLORS = ['#22C55E', '#4ADE80', '#86EFAC', '#FACC15', '#E8ECF3']
const GRAVITY = 0.18
const DRAG = 0.992

type FireConfetti = (amount?: number) => void

const ConfettiContext = createContext<FireConfetti | null>(null)

/**
 * Canvas único em overlay para todo o app. Nada é re-renderizado pelo React:
 * as partículas vivem em um ref e desenham direto no contexto 2D.
 */
export function ConfettiProvider({ children }: { children: ReactNode }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const particles = useRef<Particle[]>([])
  const frame = useRef<number | null>(null)

  const draw = useCallback(function drawFrame() {
    const canvas = canvasRef.current
    const context = canvas?.getContext('2d')
    if (!canvas || !context) return

    context.clearRect(0, 0, canvas.width, canvas.height)

    const ratio = window.devicePixelRatio || 1
    const alive: Particle[] = []

    for (const particle of particles.current) {
      particle.vy += GRAVITY
      particle.vx *= DRAG
      particle.x += particle.vx
      particle.y += particle.vy
      particle.rotation += particle.spin
      particle.life -= 1

      if (particle.life <= 0 || particle.y > canvas.height / ratio + 40) continue
      alive.push(particle)

      context.save()
      context.translate(particle.x * ratio, particle.y * ratio)
      context.rotate(particle.rotation)
      context.fillStyle = particle.color
      context.globalAlpha = Math.min(1, particle.life / 30)
      context.fillRect(
        (-particle.size / 2) * ratio,
        (-particle.size / 2) * ratio,
        particle.size * ratio,
        particle.size * 0.6 * ratio,
      )
      context.restore()
    }

    particles.current = alive

    if (alive.length > 0) {
      frame.current = requestAnimationFrame(drawFrame)
    } else {
      frame.current = null
    }
  }, [])

  const fire = useCallback<FireConfetti>(
    (amount = 90) => {
      if (prefersReducedMotion()) return

      const canvas = canvasRef.current
      if (!canvas) return

      const ratio = window.devicePixelRatio || 1
      canvas.width = window.innerWidth * ratio
      canvas.height = window.innerHeight * ratio

      const originX = window.innerWidth / 2
      const originY = window.innerHeight * 0.42

      for (let index = 0; index < amount; index++) {
        const angle = (Math.PI * 2 * index) / amount + Math.random() * 0.4
        const speed = 4 + Math.random() * 7
        particles.current.push({
          x: originX,
          y: originY,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 4,
          size: 6 + Math.random() * 6,
          rotation: Math.random() * Math.PI,
          spin: (Math.random() - 0.5) * 0.3,
          color: COLORS[Math.floor(Math.random() * COLORS.length)] as string,
          life: 80 + Math.random() * 50,
        })
      }

      if (frame.current === null) frame.current = requestAnimationFrame(draw)
    },
    [draw],
  )

  useEffect(() => {
    return () => {
      if (frame.current !== null) cancelAnimationFrame(frame.current)
    }
  }, [])

  return (
    <ConfettiContext.Provider value={fire}>
      {children}
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-[70] h-full w-full"
      />
    </ConfettiContext.Provider>
  )
}

export function useConfetti(): FireConfetti {
  const context = useContext(ConfettiContext)
  if (!context) throw new Error('useConfetti precisa estar dentro de <ConfettiProvider>.')
  return context
}
