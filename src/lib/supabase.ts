import { STORAGE_PREFIX } from './brand'
import { createClient } from '@supabase/supabase-js'

/**
 * Cliente único do Supabase.
 *
 * A anon key é pública por definição — o que protege os dados é a RLS:
 * `challenges` só devolve a linha de quem está logado, e `licenses` só deixa
 * ler a própria licença. Escrita em `licenses` continua exclusiva das Edge
 * Functions.
 */
const CHAVE_SESSAO = `${STORAGE_PREFIX}:auth`
const CHAVE_SESSAO_ANTIGA = 'desafio500:auth'

/**
 * Move a sessão para a chave nova ANTES de criar o cliente.
 *
 * O supabase-js lê o storage na construção. Se a chave mudasse de nome sem o
 * valor ir junto, todo mundo que já estava logado seria deslogado por causa de
 * uma troca de marca — e, como o acesso hoje depende da conta, isso trancaria
 * pessoas para fora do app que elas pagaram.
 */
function migrarSessao(): void {
  if (typeof window === 'undefined') return
  try {
    if (window.localStorage.getItem(CHAVE_SESSAO)) return
    const antiga = window.localStorage.getItem(CHAVE_SESSAO_ANTIGA)
    if (!antiga) return
    window.localStorage.setItem(CHAVE_SESSAO, antiga)
    window.localStorage.removeItem(CHAVE_SESSAO_ANTIGA)
  } catch {
    // Modo privado: segue com sessão nova, que é o comportamento de sempre.
  }
}

migrarSessao()

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      // O app é offline-first: a sessão sobrevive ao fechar o navegador.
      storageKey: CHAVE_SESSAO,
    },
  },
)
