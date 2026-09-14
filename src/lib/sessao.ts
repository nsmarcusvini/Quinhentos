/**
 * Saúde da sessão guardada.
 *
 * `supabase.auth.getSession()` só lê o localStorage — ela devolve "logado"
 * mesmo para uma conta que o servidor não reconhece mais: apagada, senha
 * trocada em outro aparelho, refresh token revogado. O app ficava preso nesse
 * limbo: a tela dizia logado, e toda chamada ao servidor voltava 401
 * disfarçada de "não consegui, tente de novo" — inclusive na hora de pagar.
 */

import { supabase } from './supabase'

type Ouvinte = () => void

const ouvintes = new Set<Ouvinte>()

/**
 * Avisa quando o SERVIDOR recusa a sessão — nunca quando a pessoa sai por
 * conta própria. Quem escuta isso é o AuthContext, que transforma o aviso em
 * estado e deixa as telas explicarem o que houve.
 *
 * Devolve a função de cancelar a inscrição.
 */
export function aoExpirarSessao(ouvinte: Ouvinte): () => void {
  ouvintes.add(ouvinte)
  return () => {
    ouvintes.delete(ouvinte)
  }
}

/**
 * Apaga a sessão SÓ deste aparelho e avisa os ouvintes.
 *
 * `scope: 'local'` é deliberado: o token já não vale no servidor, então
 * tentar revogá-lo lá é uma ida à rede que só pode falhar e atrasar a tela.
 */
export async function descartarSessaoLocal(): Promise<void> {
  try {
    await supabase.auth.signOut({ scope: 'local' })
  } catch {
    // O onAuthStateChange já terá limpado o estado em memória.
  }
  for (const ouvinte of ouvintes) ouvinte()
}

/**
 * Pergunta ao servidor se a sessão restaurada ainda vale.
 *
 * Só derruba o login quando o servidor REJEITA de fato (401/403). Erro de
 * rede, servidor fora do ar ou aparelho offline mantêm o acesso: o app promete
 * funcionar sem internet, e deslogar alguém dentro de um túnel seria pior do
 * que carregar uma sessão morta por mais um tempo.
 */
export async function sessaoAindaVale(): Promise<boolean> {
  const { error } = await supabase.auth.getUser()
  if (!error) return true

  const status = (error as { status?: number }).status
  if (status === 401 || status === 403) {
    await descartarSessaoLocal()
    return false
  }

  return true
}
