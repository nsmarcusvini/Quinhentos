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
import { LEGACY_LICENSE_PREFIX, LICENSE_PREFIX, STORAGE_PREFIX } from '../lib/brand'
import type { PlanoId } from '../lib/pricing'
import { supabase } from '../lib/supabase'
import { useAuth } from './AuthContext'

/**
 * Licença de acesso vitalício.
 *
 * Guardada em chave PRÓPRIA do localStorage, separada de `norte:state`.
 * Isso é deliberado: o estado do desafio tem migração versionada e é exportado
 * em backup pelo usuário — misturar a licença ali faria a chave vazar em todo
 * JSON compartilhado e complicaria a `migrate()`.
 */
const LICENSE_KEY = `${STORAGE_PREFIX}:license`
const LICENSE_KEY_ANTIGA = 'desafio500:license'

/**
 * Formato emitido no checkout: NF-XXXX-XXXX-XXXX.
 *
 * O prefixo antigo continua aceito para sempre. Invalidar a chave de quem já
 * pagou por causa de uma troca de nome seria inaceitável, e o custo de manter
 * a alternativa é uma palavra nesta expressão.
 */
const LICENSE_PATTERN = new RegExp(
  '^(' + LICENSE_PREFIX + '|' + LEGACY_LICENSE_PREFIX + ')-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$',
)

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
    // Sem o fallback, a troca de nome apagaria o acesso de quem já tinha
    // destravado: a chave nova nasceria vazia e o app pediria pagamento de
    // novo a quem já pagou.
    let raw = window.localStorage.getItem(LICENSE_KEY)

    if (raw === null) {
      // Instalacao da epoca do nome antigo: move o valor e APAGA a origem.
      // Deixar a copia velha para tras faria uma licenca revogada ressuscitar
      // dela no proximo carregamento, porque lock() so apaga a chave atual.
      raw = window.localStorage.getItem(LICENSE_KEY_ANTIGA)
      if (raw !== null) {
        window.localStorage.setItem(LICENSE_KEY, raw)
        window.localStorage.removeItem(LICENSE_KEY_ANTIGA)
      }
    }

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
    console.warn('[Norte Financeiro] Não foi possível validar a licença agora.', erro)
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
      window.localStorage.removeItem(LICENSE_KEY_ANTIGA)
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

    // Traz as licenças da conta em vez de filtrar no SQL. Filtrar lá devolvia
    // "nada" tanto para quem nunca comprou quanto para quem teve a assinatura
    // vencida, e o app trancava as duas sem saber dizer por quê — a segunda
    // via a página de vendas comum e concluía que a conta tinha sumido.
    //
    // Buscar a lista também evita o `maybeSingle` estourar em quem tem mais de
    // uma linha, o caso de quem assinou, deixou vencer e depois comprou o
    // vitalício.
    const { data, error } = await supabase
      .from('licenses')
      .select('key, revoked_at, plan, current_period_end, created_at')
      .eq('user_id', usuario.id)
      .order('created_at', { ascending: false })
      .limit(5)

    // Erro aqui é rede, não veredito: mantém o que já estava liberado. O app
    // promete funcionar offline, e trancar alguém por causa de um túnel seria
    // pior do que confiar no cache por mais um tempo.
    if (error) return

    const utilizavel = (linha: {
      revoked_at: string | null
      current_period_end: string | null
    }) =>
      !linha.revoked_at &&
      (linha.current_period_end === null ||
        new Date(linha.current_period_end).getTime() > Date.now())

    const boa = data?.find(utilizavel)

    if (!boa) {
      // O servidor respondeu e esta conta não tem acesso. É autoritativo: a
      // RLS devolve as linhas de quem está logado, então vazio é vazio mesmo,
      // inclusive quando o localStorage insiste no contrário.
      const recente = data?.[0]
      if (recente?.revoked_at) setRevogada(true)
      else if (recente) setExpirada(true)
      lock()
      return
    }

    const proxima: License = {
      key: boa.key,
      unlockedAt: Date.now(),
      userId: usuario.id,
      plan: boa.plan === 'mensal' ? 'mensal' : 'vitalicio',
      expiresAt: boa.current_period_end ?? null,
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
