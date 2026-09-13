import { useEffect } from 'react'
import { useChallenge } from './ChallengeContext'
import type { ThemePreference } from './types'

const DARK_QUERY = '(prefers-color-scheme: dark)'

function applyTheme(preference: ThemePreference): void {
  const prefersDark = window.matchMedia(DARK_QUERY).matches
  const isDark = preference === 'dark' || (preference === 'system' && prefersDark)

  document.documentElement.classList.toggle('dark', isDark)
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute('content', isDark ? '#0A0C10' : '#F6F8FB')
}

/** Aplica o tema escolhido e acompanha a preferência do sistema no modo automático. */
export function useThemeEffect(): void {
  const { state } = useChallenge()
  const preference = state.theme

  useEffect(() => {
    applyTheme(preference)
    if (preference !== 'system') return

    const media = window.matchMedia(DARK_QUERY)
    const onChange = () => applyTheme('system')
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [preference])
}
