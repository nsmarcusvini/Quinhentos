import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { validarLicencaNoServidor, type MotivoRecusa } from '../lib/api'
import type { PlanoId } from '../lib/pricing'
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
  /**
   * Dono da licença. Sem isto o cache do localStorage valia para qualquer
   * conta: bastava colar uma chave válida no navegador, criar uma conta
   * gratuita e entrar — o portão de sessão não adiantava nada.
   */
  userId?: string
  plan?: PlanoId
  /**
   * Quando o acesso termina, em ISO. Nulo no vitalício: não termina.
   *
   * Guardado junto com a licença porque é o que permite trancar o mensal
   * vencido sem internet — do contrário, quem assinasse e ficasse offline
   * teria acesso para sempre.
   */
  expiresAt?: string | null
}

export type EntitlementStatus = 'liberado' | 'bloqueado'

function readLicense(): License | null {
  if (typeof window === 'undefined') return null

  try {
    const raw = window.localStorage.getItem(LICENSE_KEY)
    if (!raw) return null

    const parsed: unknown = JSON.parse(raw)
    if (typeof parsed !== 'object' || parsed === null) return null

    const { key, unlockedAt, userId, plan, expiresAt } = parsed as Partial<License>
    if (typeof key !== 'string' || !LICENSE_PATTERN.test(key)) return null
    if (typeof unlockedAt !== 'number' || !Number.isFinite(unlockedAt)) return null

    return {
      key,
      unlockedAt,
      userId: typeof userId === 'string' ? userId : undefined,
      plan: plan === 'mensal' || plan === 'vitalicio' ? plan : undefined,
      expiresAt: typeof expiresAt === 'string' ? expiresAt : null,
    }
  } catch {
    return null
  }
}

/**
 * Venceu?
 *
 * Sem data é o vitalício, que nunca vence. Esta checagem roda no navegador e é
 * o que faz o mensal parar de funcionar offline quando o período acaba — o
 * servidor confirma depois, mas não dá para depender dele estar alcançável.
 */
const venceu = (licenca: License | null): boolean =>
  licenca?.expiresAt != null && new Date(licenca.expiresAt).getTime() <= Date.now()

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
  /** true quando a assinatura mensal terminou sem renovar. */
  expirada: boolean
  /** Reconsulta a licença da conta. Use depois de um pagamento. */
  recarregar: () => Promise<void>
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
  const [expirada, setExpirada] = useState(false)

  const unlock = useCallback(async (rawKey: string) => {
    const key = normalizeLicenseKey(rawKey)
    const resultado = await validateLicense(key)
    if (!resultado.valida) return resultado

    setRevogada(false)
    setExpirada(false)
    const next: License = { key, unlockedAt: Date.now(), userId: usuario?.id }
    try {
      window.localStorage.setItem(LICENSE_KEY, JSON.stringify(next))
    } catch {
      // Modo privado ou cota cheia: libera a sessão atual mesmo sem persistir.
    }
    setLicense(next)
    return resultado
  }, [usuario?.id])

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
      if (resultado.valida) return
      if (resultado.motivo === 'revogada') {
        setRevogada(true)
        lock()
      } else if (resultado.motivo === 'expirada') {
        setExpirada(true)
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
   * Consulta a licença da conta — é o que destrava o app ao entrar, e de novo
   * logo depois de um pagamento, sem precisar recarregar a página.
   *
   * A leitura é permitida pela RLS: a policy de `licenses` só devolve a linha
   * de quem está logado.
   */
  const recarregar = useCallback(async () => {
    if (!usuario) return

    const agora = new Date().toISOString()
    const { data, error } = await supabase
      .from('licenses')
      .select('key, revoked_at, plan, current_period_end')
      .eq('user_id', usuario.id)
      .is('revoked_at', null)
      // Vitalício (data nula) ou mensal ainda dentro do período. Filtrar aqui,
      // e não depois, evita destravar por um instante antes de perceber que a
      // assinatura venceu.
      .or(`current_period_end.is.null,current_period_end.gt.${agora}`)
      .maybeSingle()

    // Erro aqui é rede, não veredito: mantém o que já estava liberado. O app
    // promete funcionar offline, e trancar alguém por causa de um túnel seria
    // pior do que confiar no cache por mais um tempo.
    if (error) return

    // O servidor respondeu e esta conta não tem licença. Isso é autoritativo:
    // a RLS devolve a linha de quem está logado, então "nada" significa nada
    // mesmo — inclusive quando o localStorage insiste no contrário.
    if (!data?.key) {
      lock()
      return
    }

    const proxima: License = {
      key: data.key,
      unlockedAt: Date.now(),
      userId: usuario.id,
      plan: data.plan === 'mensal' ? 'mensal' : 'vitalicio',
      expiresAt: data.current_period_end ?? null,
    }
    try {
      window.localStorage.setItem(LICENSE_KEY, JSON.stringify(proxima))
    } catch {
      // Modo privado: vale só para esta sessão.
    }
    setLicense(proxima)
    setRevogada(false)
    setExpirada(false)
  }, [usuario, lock])

  useEffect(() => {
    void recarregar()
  }, [recarregar])

  // Uma licença com dono declarado só vale para esse dono. A sem dono é cache
  // de versão antiga: vale até o recarregar() confirmar ou derrubar.
  const daConta =
    license !== null &&
    (license.userId === undefined || license.userId === usuario?.id) &&
    !venceu(license)

  const valor = useMemo<Entitlement>(
    () => ({
      status: daConta ? 'liberado' : 'bloqueado',
      license,
      unlock,
      lock,
      revogada,
      expirada: expirada || venceu(license),
      recarregar,
    }),
    [license, daConta, unlock, lock, revogada, expirada, recarregar],
  )

  return <EntitlementContext.Provider value={valor}>{children}</EntitlementContext.Provider>
}

export function useEntitlement(): Entitlement {
  const contexto = useContext(EntitlementContext)
  if (!contexto) throw new Error('useEntitlement precisa estar dentro de <EntitlementProvider>.')
  return contexto
}
