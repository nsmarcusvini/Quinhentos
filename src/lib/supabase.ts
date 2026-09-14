import { createClient } from '@supabase/supabase-js'

/**
 * Cliente único do Supabase.
 *
 * A anon key é pública por definição — o que protege os dados é a RLS:
 * `challenges` só devolve a linha de quem está logado, e `licenses` só deixa
 * ler a própria licença. Escrita em `licenses` continua exclusiva das Edge
 * Functions.
 */
export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      // O app é offline-first: a sessão sobrevive ao fechar o navegador.
      storageKey: 'desafio500:auth',
    },
  },
)
