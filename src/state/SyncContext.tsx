import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { mesclarEstados } from '../lib/merge'
import { supabase } from '../lib/supabase'
import { migrate } from './storage'
import { useAuth } from './AuthContext'
import { useChallenge } from './ChallengeContext'

export type StatusSync = 'desligado' | 'sincronizando' | 'sincronizado' | 'erro'

const ATRASO_ENVIO_MS = 1500

interface SyncContextValue {
  status: StatusSync
  sincronizarAgora: () => Promise<void>
}

const SyncContext = createContext<SyncContextValue | null>(null)

/**
 * Sincroniza o desafio com a nuvem enquanto houver conta logada.
 *
 * O aparelho continua sendo a fonte primária: tudo grava primeiro no
 * localStorage e o envio é um efeito colateral. Sem conta, nada sai daqui.
 *
 * É provider, e não hook solto, porque duas instâncias significariam dois
 * temporizadores de envio disputando — o dobro de escrita para o mesmo dado.
 */
export function SyncProvider({ children }: { children: ReactNode }) {
  const { usuario } = useAuth()
  const { state, replaceState } = useChallenge()

  const [status, setStatus] = useState<StatusSync>('desligado')

  // Guarda o id de quem já teve a mesclagem inicial feita nesta sessão, para a
  // primeira carga não repetir a cada re-render.
  const mescladoPara = useRef<string | null>(null)
  const timer = useRef<number | null>(null)
  const estadoRef = useRef(state)

  // Espelha o estado num ref para o envio atrasado ler o valor mais recente.
  // Escrever em ref durante o render é efeito colateral no meio da renderização;
  // este efeito é declarado ANTES dos outros, então roda antes deles.
  useEffect(() => {
    estadoRef.current = state
  }, [state])

  const enviar = useCallback(async () => {
    if (!usuario) return
    const { error } = await supabase.from('challenges').upsert(
      { user_id: usuario.id, state: estadoRef.current },
      { onConflict: 'user_id' },
    )
    if (error) throw error
  }, [usuario])

  const sincronizarAgora = useCallback(async () => {
    if (!usuario) return
    setStatus('sincronizando')
    try {
      const { data, error } = await supabase
        .from('challenges')
        .select('state')
        .eq('user_id', usuario.id)
        .maybeSingle()

      if (error) throw error

      if (data?.state) {
        // migrate() aqui não é paranoia: o registro pode ter sido gravado por
        // uma versão anterior do app, em outro aparelho.
        const remoto = migrate(data.state)
        const mesclado = mesclarEstados(estadoRef.current, remoto)
        estadoRef.current = mesclado
        replaceState(mesclado)
      }

      await enviar()
      setStatus('sincronizado')
    } catch (erro) {
      console.warn('[Norte Financeiro] Falha ao sincronizar.', erro)
      setStatus('erro')
    }
  }, [enviar, replaceState, usuario])

  // Primeira sincronia ao entrar na conta.
  useEffect(() => {
    if (!usuario) {
      mescladoPara.current = null
      return
    }
    if (mescladoPara.current === usuario.id) return

    mescladoPara.current = usuario.id
    void sincronizarAgora()
  }, [sincronizarAgora, usuario])

  // Depois da primeira, cada alteração local sobe com um respiro — marcar dez
  // casinhas seguidas vira um envio, não dez.
  useEffect(() => {
    if (!usuario || mescladoPara.current !== usuario.id) return

    if (timer.current !== null) window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => {
      setStatus('sincronizando')
      enviar()
        .then(() => setStatus('sincronizado'))
        .catch((erro) => {
          console.warn('[Norte Financeiro] Falha ao enviar o progresso.', erro)
          setStatus('erro')
        })
    }, ATRASO_ENVIO_MS)

    return () => {
      if (timer.current !== null) window.clearTimeout(timer.current)
    }
  }, [enviar, state, usuario])

  const valor = useMemo<SyncContextValue>(
    // Sem conta o status é sempre 'desligado' — derivar evita um setState de
    // efeito só para voltar ao valor inicial ao sair da conta.
    () => ({ status: usuario ? status : 'desligado', sincronizarAgora }),
    [status, sincronizarAgora, usuario],
  )

  return <SyncContext.Provider value={valor}>{children}</SyncContext.Provider>
}

export function useSync(): SyncContextValue {
  const contexto = useContext(SyncContext)
  if (!contexto) throw new Error('useSync precisa estar dentro de <SyncProvider>.')
  return contexto
}
