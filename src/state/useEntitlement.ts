import { useCallback, useEffect, useState } from 'react'
import { validarLicencaNoServidor, type MotivoRecusa } from '../lib/api'

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
 * O formato é só um pré-filtro barato para não gastar uma chamada de rede com
 * texto claramente inválido. Quem decide é a Edge Function `validar-licenca`,
 * que consulta a tabela `licenses` — sem isso qualquer um inventaria uma chave
 * no formato certo e entraria sem pagar.
 */
export async function validateLicense(
  raw: string,
): Promise<{ valida: boolean; motivo?: MotivoRecusa }> {
  if (!isWellFormedKey(raw)) return { valida: false, motivo: 'formato' }

  try {
    return await validarLicencaNoServidor(normalizeLicenseKey(raw))
  } catch (erro) {
    console.warn('[Desafio 500] Não foi possível validar a licença agora.', erro)
    return { valida: false, motivo: 'indisponivel' }
  }
}

interface Entitlement {
  status: EntitlementStatus
  license: License | null
  /** Valida e, se passar, grava. Devolve se liberou e por que não. */
  unlock: (rawKey: string) => Promise<{ valida: boolean; motivo?: MotivoRecusa }>
  /** Remove a licença deste aparelho. */
  lock: () => void
  /** true quando o acesso caiu por reembolso ou contestação. */
  revogada: boolean
}

export function useEntitlement(): Entitlement {
  // Inicialização preguiçosa, como o ChallengeProvider faz com loadState: lê o
  // storage antes do primeiro render em vez de num efeito. Sem isso o app
  // pisca uma tela vazia e re-renderiza à toa a cada montagem.
  const [license, setLicense] = useState<License | null>(readLicense)

  const [revogada, setRevogada] = useState(false)

  const unlock = useCallback(async (rawKey: string) => {
    const key = normalizeLicenseKey(rawKey)
    const resultado = await validateLicense(key)
    if (!resultado.valida) return resultado

    setRevogada(false)
    const next: License = { key, unlockedAt: Date.now() }
    try {
      window.localStorage.setItem(LICENSE_KEY, JSON.stringify(next))
    } catch {
      // Modo privado ou cota cheia: libera a sessão atual mesmo sem persistir.
    }
    setLicense(next)
    return resultado
  }, [])

  const lock = useCallback(() => {
    try {
      window.localStorage.removeItem(LICENSE_KEY)
    } catch {
      // Ignorado: o estado em memória abaixo já bloqueia.
    }
    setLicense(null)
  }, [])

  /**
   * Reconfere a licença ao abrir o app — é o que faz o reembolso valer para
   * quem já tinha destravado.
   *
   * Só tranca quando o servidor diz explicitamente "revogada". Erro de rede,
   * servidor fora do ar ou aparelho offline mantêm o acesso: o app promete
   * funcionar sem internet, e perder o desafio por causa de um túnel seria
   * pior do que um reembolsado usar mais um tempo.
   */
  useEffect(() => {
    if (!license) return
    if (typeof navigator !== 'undefined' && navigator.onLine === false) return

    let cancelado = false
    void (async () => {
      const resultado = await validateLicense(license.key)
      if (cancelado) return
      if (!resultado.valida && resultado.motivo === 'revogada') {
        setRevogada(true)
        lock()
      }
    })()

    return () => {
      cancelado = true
    }
  }, [license, lock])

  return { status: license ? 'liberado' : 'bloqueado', license, unlock, lock, revogada }
}
