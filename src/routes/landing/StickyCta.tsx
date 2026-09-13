import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import type { ChallengeStats } from '../../state/useStats'
import { CtaButton } from './CtaButton'

const SHOW_AFTER_PX = 420

/** Barra fixa no rodapé do mobile, a partir do primeiro scroll. */
export function StickyCta({ stats }: { stats: ChallengeStats }) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > SHOW_AFTER_PX)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: 90 }}
          animate={{ y: 0 }}
          exit={{ y: 90 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-bg/95 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur-md sm:hidden"
        >
          <CtaButton saved={stats.saved} size="md" fullWidth />
        </motion.div>
      )}
    </AnimatePresence>
  )
}
