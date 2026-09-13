import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  type ReactNode,
} from 'react'
import { STORAGE_KEY } from '../lib/constants'
import { challengeReducer } from './reducer'
import { createInitialState, loadState, migrate, saveState } from './storage'
import type { ChallengeState, ThemePreference } from './types'

interface ChallengeContextValue {
  state: ChallengeState
  /** Mapa número → timestamp; use `isMarked` para consultas pontuais. */
  entries: ChallengeState['entries']
  isMarked: (houseNumber: number) => boolean
  mark: (houseNumber: number, at?: number) => void
  unmark: (houseNumber: number) => void
  markMany: (numbers: readonly number[]) => void
  toggle: (houseNumber: number) => void
  rename: (name: string) => void
  setTargetDate: (date: string | null) => void
  setTheme: (theme: ThemePreference) => void
  replaceState: (state: ChallengeState) => void
  reset: () => void
}

const ChallengeContext = createContext<ChallengeContextValue | null>(null)

export function ChallengeProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(challengeReducer, undefined, loadState)

  // Persiste a cada alteração.
  useEffect(() => {
    saveState(state)
  }, [state])

  // Mantém abas/janelas do mesmo navegador em sincronia.
  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key !== STORAGE_KEY) return
      try {
        const next = event.newValue ? migrate(JSON.parse(event.newValue)) : createInitialState()
        dispatch({ type: 'replace', state: next })
      } catch {
        // Valor inválido vindo de outra aba: mantém o estado atual.
      }
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  const entries = state.entries

  const isMarked = useCallback(
    (houseNumber: number) => entries[houseNumber] !== undefined,
    [entries],
  )

  const value = useMemo<ChallengeContextValue>(
    () => ({
      state,
      entries,
      isMarked,
      mark: (houseNumber, at) => dispatch({ type: 'mark', number: houseNumber, at }),
      unmark: (houseNumber) => dispatch({ type: 'unmark', number: houseNumber }),
      markMany: (numbers) => dispatch({ type: 'markMany', numbers }),
      toggle: (houseNumber) =>
        dispatch(
          entries[houseNumber] === undefined
            ? { type: 'mark', number: houseNumber }
            : { type: 'unmark', number: houseNumber },
        ),
      rename: (name) => dispatch({ type: 'rename', name }),
      setTargetDate: (date) => dispatch({ type: 'setTargetDate', date }),
      setTheme: (theme) => dispatch({ type: 'setTheme', theme }),
      replaceState: (next) => dispatch({ type: 'replace', state: next }),
      reset: () => dispatch({ type: 'reset' }),
    }),
    [state, entries, isMarked],
  )

  return <ChallengeContext.Provider value={value}>{children}</ChallengeContext.Provider>
}

export function useChallenge(): ChallengeContextValue {
  const context = useContext(ChallengeContext)
  if (!context) {
    throw new Error('useChallenge precisa estar dentro de <ChallengeProvider>.')
  }
  return context
}
