/**
 * Chamadas às Edge Functions do Supabase.
 *
 * O frontend nunca fala com o banco direto — a tabela `licenses` não tem
 * policy nenhuma, então nem a anon key lê dela. Tudo passa por estas funções,
 * que rodam com service_role e decidem o que pode sair.
 */

const BASE_URL = import.meta.env.VITE_SUPABASE_URL
const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

export const apiConfigurada = (): boolean => Boolean(BASE_URL && ANON_KEY)

async function chamar<T>(funcao: string, corpo: unknown): Promise<T> {
  if (!apiConfigurada()) {
    throw new Error('VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY não estão definidas.')
  }

  const resposta = await fetch(`${BASE_URL}/functions/v1/${funcao}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      // A função exige JWT; a anon key é um JWT válido e público.
      Authorization: `Bearer ${ANON_KEY}`,
      apikey: ANON_KEY,
    },
    body: JSON.stringify(corpo),
  })

  const dados = (await resposta.json().catch(() => null)) as T | null

  if (!resposta.ok || dados === null) {
    const detalhe =
      dados && typeof dados === 'object' && 'erro' in dados
        ? String((dados as { erro: unknown }).erro)
        : `http_${resposta.status}`
    throw new Error(detalhe)
  }

  return dados
}

/** Abre o Checkout do Stripe. Devolve a URL para onde redirecionar. */
export async function criarCheckout(): Promise<string> {
  const { url } = await chamar<{ url: string }>('criar-checkout', {})
  return url
}

/** Troca o session_id do Stripe pela chave de acesso. Idempotente. */
export async function resgatarLicenca(sessionId: string): Promise<string> {
  const { key } = await chamar<{ key: string }>('resgatar-licenca', { session_id: sessionId })
  return key
}

/** Confere no servidor se uma chave colada à mão existe de verdade. */
export async function validarLicencaNoServidor(key: string): Promise<boolean> {
  const { valida } = await chamar<{ valida: boolean }>('validar-licenca', { key })
  return valida === true
}
