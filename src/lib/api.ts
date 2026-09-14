/**
 * Chamadas às Edge Functions do Supabase.
 *
 * O frontend nunca fala com o banco direto — a tabela `licenses` não tem
 * policy nenhuma, então nem a anon key lê dela. Tudo passa por estas funções,
 * que rodam com service_role e decidem o que pode sair.
 */

import { supabase } from './supabase'

const BASE_URL = import.meta.env.VITE_SUPABASE_URL
const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

export const apiConfigurada = (): boolean => Boolean(BASE_URL && ANON_KEY)

async function chamar<T>(funcao: string, corpo: unknown): Promise<T> {
  if (!apiConfigurada()) {
    throw new Error('VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY não estão definidas.')
  }

  // Com sessão, manda o JWT do usuário: `vincular-licenca` precisa saber QUEM
  // está chamando, e a anon key não identifica ninguém. Sem sessão, a anon key
  // já serve — é um JWT válido e público.
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token ?? ANON_KEY

  const resposta = await fetch(`${BASE_URL}/functions/v1/${funcao}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
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

export interface CobrancaPix {
  id: string
  /** Código copia-e-cola do Pix. */
  brCode: string
  /** QR já pronto como data:image/png;base64. */
  brCodeBase64: string
  expiresAt: string
  devMode: boolean
}

/** Cria a cobrança Pix no AbacatePay. */
export async function criarPix(): Promise<CobrancaPix> {
  return chamar<CobrancaPix>('criar-pix', {})
}

export interface StatusPix {
  status?: string
  key?: string
}

/** Pergunta se o Pix já caiu. Quando cai, vem a chave junto. */
export async function conferirPix(id: string): Promise<StatusPix> {
  return chamar<StatusPix>('conferir-pix', { id })
}

/** Amarra a chave à conta logada. Depois disso o login sozinho destrava. */
export async function vincularLicenca(key: string): Promise<void> {
  await chamar<{ vinculada: boolean }>('vincular-licenca', { key })
}

/** Por que o servidor recusou uma chave. */
export type MotivoRecusa = 'formato' | 'inexistente' | 'revogada' | 'indisponivel'

export interface ResultadoValidacao {
  valida: boolean
  motivo?: MotivoRecusa
}

/** Confere no servidor se uma chave existe e ainda vale. */
export async function validarLicencaNoServidor(key: string): Promise<ResultadoValidacao> {
  const resposta = await chamar<{ valida: boolean; motivo?: MotivoRecusa }>('validar-licenca', {
    key,
  })
  return { valida: resposta.valida === true, motivo: resposta.motivo }
}
