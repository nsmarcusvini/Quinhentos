import { HOUSE_COUNT } from '../lib/constants'
import { createInitialState } from './storage'
import type { ChallengeAction, ChallengeState } from './types'

const isValidHouse = (value: number): boolean =>
  Number.isInteger(value) && value >= 1 && value <= HOUSE_COUNT

export function challengeReducer(
  state: ChallengeState,
  action: ChallengeAction,
): ChallengeState {
  switch (action.type) {
    case 'mark': {
      if (!isValidHouse(action.number) || state.entries[action.number]) return state
      const removed = { ...state.removed }
      delete removed[action.number]
      return {
        ...state,
        entries: { ...state.entries, [action.number]: action.at ?? Date.now() },
        removed,
      }
    }

    case 'markMany': {
      const pending = action.numbers.filter(
        (value) => isValidHouse(value) && !state.entries[value],
      )
      if (pending.length === 0) return state

      const at = action.at ?? Date.now()
      const entries = { ...state.entries }
      const removed = { ...state.removed }
      for (const value of pending) {
        entries[value] = at
        delete removed[value]
      }
      return { ...state, entries, removed }
    }

    case 'unmark': {
      if (!state.entries[action.number]) return state
      const entries = { ...state.entries }
      delete entries[action.number]
      // A lápide é o que faz a desmarcação sobreviver à sincronia.
      return {
        ...state,
        entries,
        removed: { ...state.removed, [action.number]: Date.now() },
      }
    }

    case 'rename': {
      const name = action.name.trim().slice(0, 60)
      return { ...state, challengeName: name.length > 0 ? name : state.challengeName }
    }

    case 'setTargetDate':
      return { ...state, targetDate: action.date }

    case 'setTheme':
      return state.theme === action.theme ? state : { ...state, theme: action.theme }

    case 'replace':
      return action.state

    case 'reset':
      // Preferências visuais sobrevivem a um reset do progresso.
      return { ...createInitialState(), theme: state.theme }
  }
}
