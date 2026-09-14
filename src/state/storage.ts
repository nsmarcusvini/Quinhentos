import {
  DEFAULT_CHALLENGE_NAME,
  HOUSE_COUNT,
  STATE_VERSION,
  STORAGE_KEY,
  STORAGE_KEY_ANTIGA,
} from '../lib/constants'
import type { ChallengeState, Entries, ThemePreference } from './types'

export function createInitialState(): ChallengeState {
  return {
    version: STATE_VERSION,
    challengeName: DEFAULT_CHALLENGE_NAME,
    targetDate: null,
    entries: {},
    removed: {},
    theme: 'system',
  }
}

const THEMES: readonly ThemePreference[] = ['light', 'dark', 'system']

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

/** Mantém apenas pares número(1..500) → timestamp plausível. */
function sanitizeEntries(value: unknown): Entries {
  if (!isRecord(value)) return {}

  const entries: Entries = {}
  for (const [rawKey, rawValue] of Object.entries(value)) {
    const houseNumber = Number(rawKey)
    if (!Number.isInteger(houseNumber) || houseNumber < 1 || houseNumber > HOUSE_COUNT) continue

    const timestamp = Number(rawValue)
    if (!Number.isFinite(timestamp) || timestamp <= 0) continue

    entries[houseNumber] = timestamp
  }
  return entries
}

function sanitizeTargetDate(value: unknown): string | null {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null
  return value
}

function sanitizeName(value: unknown): string {
  if (typeof value !== 'string') return DEFAULT_CHALLENGE_NAME
  const trimmed = value.trim().slice(0, 60)
  return trimmed.length > 0 ? trimmed : DEFAULT_CHALLENGE_NAME
}

function sanitizeTheme(value: unknown): ThemePreference {
  return THEMES.includes(value as ThemePreference) ? (value as ThemePreference) : 'system'
}

/**
 * Normaliza qualquer coisa vinda do storage (ou de um arquivo importado) para o
 * formato da versão atual. Versões futuras entram aqui como novos passos.
 */
export function migrate(raw: unknown): ChallengeState {
  if (!isRecord(raw)) return createInitialState()

  // v1 não tinha `removed`; sanitizeEntries devolve {} para o campo ausente,
  // que é exatamente o estado correto de "nada foi desmarcado ainda".
  return {
    version: STATE_VERSION,
    challengeName: sanitizeName(raw.challengeName),
    targetDate: sanitizeTargetDate(raw.targetDate),
    entries: sanitizeEntries(raw.entries),
    removed: sanitizeEntries(raw.removed),
    theme: sanitizeTheme(raw.theme),
  }
}

/** Lê o estado do localStorage. Nunca lança: JSON corrompido cai no estado inicial. */
/**
 * Move o progresso da chave antiga para a nova, uma vez.
 *
 * O app se chamava Desafio 500 e guardava em `desafio500:state`. Trocar a
 * chave junto com o nome, sem mover o valor, apagaria o desafio de todo mundo
 * que já usava — do ponto de vista da pessoa, o app teria zerado sozinho.
 *
 * Devolve o JSON bruto para o chamador seguir o caminho normal de validação.
 */
function migrarDaChaveAntiga(): string | null {
  try {
    const antigo = window.localStorage.getItem(STORAGE_KEY_ANTIGA)
    if (!antigo) return null

    window.localStorage.setItem(STORAGE_KEY, antigo)
    window.localStorage.removeItem(STORAGE_KEY_ANTIGA)
    return antigo
  } catch {
    return null
  }
}

export function loadState(): ChallengeState {
  if (typeof window === 'undefined') return createInitialState()

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY) ?? migrarDaChaveAntiga()
    if (!raw) return createInitialState()
    return migrate(JSON.parse(raw))
  } catch (error) {
    console.warn('[Norte Financeiro] Estado salvo inválido, recomeçando do zero.', error)
    return createInitialState()
  }
}

/** Grava o estado. Falhas (modo privado, cota cheia) são registradas e ignoradas. */
export function saveState(state: ChallengeState): void {
  if (typeof window === 'undefined') return

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch (error) {
    console.warn('[Norte Financeiro] Não foi possível salvar o progresso.', error)
  }
}

export function clearState(): void {
  try {
    window.localStorage.removeItem(STORAGE_KEY)
  } catch (error) {
    console.warn('[Norte Financeiro] Não foi possível limpar o progresso.', error)
  }
}

/** Valida o conteúdo de um backup .json antes de aplicar. */
export function parseBackup(text: string): ChallengeState {
  const parsed: unknown = JSON.parse(text)
  if (!isRecord(parsed) || !isRecord(parsed.entries)) {
    throw new Error('Arquivo fora do formato esperado do Norte Financeiro.')
  }
  return migrate(parsed)
}
