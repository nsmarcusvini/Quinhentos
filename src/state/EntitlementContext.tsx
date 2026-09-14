import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { validarLicencaNoServidor, vincularLicenca, type MotivoRecusa } from '../lib/api'
import { supabase } from '../lib/supabase'
import { useAuth } from './AuthContext'

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
  /** true enquanto a licença da conta ainda está sendo consultada. */
  consultandoConta: boolean
}

const EntitlementContext = createContext<Entitlement | null>(null)

/**
 * Provider, e não hook solto: AppPage, Acesso e SettingsPanel consomem isto.
 * Como hook, cada um rodava a própria re-checagem de licença — o log mostrou
 * `validar-licenca` sendo chamada 8 vezes numa única sessão, onde 1 basta.
 */
export function EntitlementProvider({ children }: { children: ReactNode }) {
  const { usuario } = useAuth()
  // Inicialização preguiçosa, como o ChallengeProvider faz com loadState: lê o
  // storage antes do primeiro render em vez de num efeito. Sem isso o app
  // pisca uma tela vazia e re-renderiza à toa a cada montagem.
  const [license, setLicense] = useState<License | null>(readLicense)

  const [revogada, setRevogada] = useState(false)
  const [consultandoConta, setConsultandoConta] = useState(false)

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
  const chave = license?.key ?? null

  useEffect(() => {
    if (!chave) return
    if (typeof navigator !== 'undefined' && navigator.onLine === false) return

    let cancelado = false
    void (async () => {
      const resultado = await validateLicense(chave)
      if (cancelado) return
      if (!resultado.valida && resultado.motivo === 'revogada') {
        setRevogada(true)
        lock()
      }
    })()

    return () => {
      cancelado = true
    }
    // Depende da CHAVE, não do objeto `license`: o objeto ganha identidade nova
    // a cada setLicense e faria a checagem repetir sem a chave ter mudado.
  }, [chave, lock])

  /**
   * Entrar na conta destrava o app sem precisar da chave — é o principal
   * motivo de existir conta. A leitura é permitida pela RLS: a policy de
   * `licenses` só devolve a linha de quem está logado.
   *
   * O caminho inverso também vale: se o aparelho já tem chave e a conta ainda
   * não tem licença, a chave é vinculada aqui.
   */
  useEffect(() => {
    if (!usuario) return

    let cancelado = false
    setConsultandoConta(true)

    void (async () => {
      try {
        const { data } = await supabase
          .from('licenses')
          .select('key, revoked_at')
          .eq('user_id', usuario.id)
          .is('revoked_at', null)
          .maybeSingle()

        if (cancelado) return

        if (data?.key) {
          // A conta tem licença: grava no aparelho e pronto.
          const proxima: License = { key: data.key, unlockedAt: Date.now() }
          try {
            window.localStorage.setItem(LICENSE_KEY, JSON.stringify(proxima))
          } catch {
            // Modo privado: vale só para esta sessão.
          }
          setLicense(proxima)
          setRevogada(false)
        } else if (license) {
          // A conta ainda não tem licença, mas este aparelho tem: vincula.
          await vincularLicenca(license.key).catch((erro) => {
            console.warn('[Desafio 500] Não consegui vincular a chave à conta.', erro)
          })
        }
      } finally {
        if (!cancelado) setConsultandoConta(false)
      }
    })()

    return () => {
      cancelado = true
    }
    // `license` fica de fora de propósito: só interessa o valor no momento em
    // que a conta entra, e incluí-lo criaria um laço com o setLicense acima.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usuario])

  const valor = useMemo<Entitlement>(
    () => ({
      status: license ? 'liberado' : 'bloqueado',
      license,
      unlock,
      lock,
      revogada,
      consultandoConta,
    }),
    [license, unlock, lock, revogada, consultandoConta],
  )

  return <EntitlementContext.Provider value={valor}>{children}</EntitlementContext.Provider>
}

export function useEntitlement(): Entitlement {
  const contexto = useContext(EntitlementContext)
  if (!contexto) throw new Error('useEntitlement precisa estar dentro de <EntitlementProvider>.')
  return contexto
}
