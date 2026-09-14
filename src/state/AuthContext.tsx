import type { Session, User } from '@supabase/supabase-js'
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { aoExpirarSessao, sessaoAindaVale } from '../lib/sessao'
import { supabase } from '../lib/supabase'

export type ErroAuth =
  | 'credenciais_invalidas'
  | 'email_ja_usado'
  | 'senha_fraca'
  | 'email_invalido'
  | 'confirmacao_pendente'
  | 'indisponivel'

export interface ResultadoAuth {
  ok: boolean
  erro?: ErroAuth
}

interface AuthContextValue {
  /** null enquanto a sessão salva ainda não foi lida. */
  carregando: boolean
  usuario: User | null
  sessao: Session | null
  /**
   * true quando foi o SERVIDOR que derrubou a sessão — não quando a pessoa
   * saiu por conta própria. As telas usam isto para dizer "entre de novo" em
   * vez de "crie sua conta", que assusta quem já pagou.
   */
  expirada: boolean
  entrar: (email: string, senha: string) => Promise<ResultadoAuth>
  cadastrar: (email: string, senha: string) => Promise<ResultadoAuth>
  sair: () => Promise<void>
  recuperarSenha: (email: string) => Promise<ResultadoAuth>
}

const AuthContext = createContext<AuthContextValue | null>(null)

/** Traduz o erro do Supabase para algo que a tela saiba explicar. */
function traduzirErro(mensagem: string): ErroAuth {
  const texto = mensagem.toLowerCase()
  if (texto.includes('invalid login credentials')) return 'credenciais_invalidas'
  if (texto.includes('already registered') || texto.includes('already been registered')) {
    return 'email_ja_usado'
  }
  if (texto.includes('password') && texto.includes('least')) return 'senha_fraca'
  if (texto.includes('invalid') && texto.includes('email')) return 'email_invalido'
  if (texto.includes('not confirmed')) return 'confirmacao_pendente'
  return 'indisponivel'
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [sessao, setSessao] = useState<Session | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [expirada, setExpirada] = useState(false)

  // Inscrição num aviso externo: quem chama descartarSessaoLocal() é a camada
  // de rede, que não tem como mexer no estado do React sozinha.
  useEffect(() => aoExpirarSessao(() => setExpirada(true)), [])

  useEffect(() => {
    let ativo = true

    void supabase.auth.getSession().then(async ({ data }) => {
      if (!ativo) return
      setSessao(data.session)
      setCarregando(false)

      // A sessão veio do localStorage, sem ninguém ter perguntado ao servidor
      // se ela ainda vale. Confere agora, uma vez: sem isso o app exibe
      // "logado" para uma conta que não existe mais, e só descobre o contrário
      // no pior momento possível — no checkout.
      if (!data.session) return
      const vale = await sessaoAindaVale()
      if (!ativo || vale) return
      setSessao(null)
    })

    const { data: inscricao } = supabase.auth.onAuthStateChange((_evento, novaSessao) => {
      setSessao(novaSessao)
      // Entrou de novo: o aviso já cumpriu o papel dele.
      if (novaSessao) setExpirada(false)
      setCarregando(false)
    })

    return () => {
      ativo = false
      inscricao.subscription.unsubscribe()
    }
  }, [])

  const entrar = useCallback(async (email: string, senha: string): Promise<ResultadoAuth> => {
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password: senha,
    })
    return error ? { ok: false, erro: traduzirErro(error.message) } : { ok: true }
  }, [])

  const cadastrar = useCallback(async (email: string, senha: string): Promise<ResultadoAuth> => {
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password: senha,
    })
    if (error) return { ok: false, erro: traduzirErro(error.message) }

    // Com confirmação de e-mail ligada o Supabase devolve usuário sem sessão.
    if (data.user && !data.session) return { ok: false, erro: 'confirmacao_pendente' }
    return { ok: true }
  }, [])

  const sair = useCallback(async () => {
    await supabase.auth.signOut()
  }, [])

  const recuperarSenha = useCallback(async (email: string): Promise<ResultadoAuth> => {
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/app`,
    })
    return error ? { ok: false, erro: traduzirErro(error.message) } : { ok: true }
  }, [])

  const valor = useMemo<AuthContextValue>(
    () => ({
      carregando,
      usuario: sessao?.user ?? null,
      sessao,
      expirada,
      entrar,
      cadastrar,
      sair,
      recuperarSenha,
    }),
    [carregando, sessao, expirada, entrar, cadastrar, sair, recuperarSenha],
  )

  return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const contexto = useContext(AuthContext)
  if (!contexto) throw new Error('useAuth precisa estar dentro de <AuthProvider>.')
  return contexto
}
