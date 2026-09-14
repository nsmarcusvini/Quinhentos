import { useCallback, useState } from 'react'

/**
 * Licença de acesso vitalício.
 *
 * Guardada em chave PRÓPRIA do localStorage, separada de `desafio500:state`.
 * Isso é deliberado: o estado do desafio tem migração versionada e é exportado
 * em backup pelo usuário — misturar a licença ali faria a chave vazar em todo
 * JSON compartilhado e complicaria a `migrate()`.
 */
const LICENSE_KEY = 'desafio500:license'

/** Formato emitido no checkout: D500-XXXX-XXXX-XXXX */
const LICENSE_PATTERN = /^D500-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/

export interface License {
  key: string
  unlockedAt: number
}

export type EntitlementStatus = 'liberado' | 'bloqueado'

function readLicense(): License | null {
  if (typeof window === 'undefined') return null

  try {
    const raw = window.localStorage.getItem(LICENSE_KEY)
    if (!raw) return null

    const parsed: unknown = JSON.parse(raw)
    if (typeof parsed !== 'object' || parsed === null) return null

    const { key, unlockedAt } = parsed as Partial<License>
    if (typeof key !== 'string' || !LICENSE_PATTERN.test(key)) return null
    if (typeof unlockedAt !== 'number' || !Number.isFinite(unlockedAt)) return null

    return { key, unlockedAt }
  } catch {
    return null
  }
}

export const normalizeLicenseKey = (raw: string): string =>
  raw.trim().toUpperCase().replace(/\s+/g, '')

export const isWellFormedKey = (raw: string): boolean =>
  LICENSE_PATTERN.test(normalizeLicenseKey(raw))

/**
 * Valida a chave contra o servidor.
 *
 * FASE 4: substituir o corpo por uma chamada à Edge Function do Supabase
 * (projeto utjxgqwsrehqxwrvkqbb), que consulta a tabela `licenses`. Hoje só
 * confere o formato — não há pagamento ativo, então não existe nada a proteger
 * ainda, e isso deixa o fluxo inteiro testável de ponta a ponta desde já.
 */
export async function validateLicense(raw: string): Promise<boolean> {
  return Promise.resolve(isWellFormedKey(raw))
}

interface Entitlement {
  status: EntitlementStatus
  license: License | null
  /** Valida e, se passar, grava. Devolve se liberou. */
  unlock: (rawKey: string) => Promise<boolean>
  /** Remove a licença deste aparelho. */
  lock: () => void
}

export function useEntitlement(): Entitlement {
  // Inicialização preguiçosa, como o ChallengeProvider faz com loadState: lê o
  // storage antes do primeiro render em vez de num efeito. Sem isso o app
  // pisca uma tela vazia e re-renderiza à toa a cada montagem.
  const [license, setLicense] = useState<License | null>(readLicense)

  const unlock = useCallback(async (rawKey: string) => {
    const key = normalizeLicenseKey(rawKey)
    const valid = await validateLicense(key)
    if (!valid) return false

    const next: License = { key, unlockedAt: Date.now() }
    try {
      window.localStorage.setItem(LICENSE_KEY, JSON.stringify(next))
    } catch {
      // Modo privado ou cota cheia: libera a sessão atual mesmo sem persistir.
    }
    setLicense(next)
    return true
  }, [])

  const lock = useCallback(() => {
    try {
      window.localStorage.removeItem(LICENSE_KEY)
    } catch {
      // Ignorado: o estado em memória abaixo já bloqueia.
    }
    setLicense(null)
  }, [])

  return { status: license ? 'liberado' : 'bloqueado', license, unlock, lock }
}
