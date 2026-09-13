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
      return {
        ...state,
        entries: { ...state.entries, [action.number]: action.at ?? Date.now() },
      }
    }

    case 'markMany': {
      const pending = action.numbers.filter(
        (value) => isValidHouse(value) && !state.entries[value],
      )
      if (pending.length === 0) return state

      const at = action.at ?? Date.now()
      const entries = { ...state.entries }
      for (const value of pending) entries[value] = at
      return { ...state, entries }
    }

    case 'unmark': {
      if (!state.entries[action.number]) return state
      const entries = { ...state.entries }
      delete entries[action.number]
      return { ...state, entries }
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
