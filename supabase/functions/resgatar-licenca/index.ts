/**
 * resgatar-licenca
 *
 * Chamada pelo navegador logo depois do Stripe redirecionar de volta.
 * Recebe o session_id, confirma o pagamento direto na API do Stripe e devolve
 * a chave de acesso. É idempotente: chamar duas vezes com a mesma sessão
 * devolve a mesma chave, nunca emite uma segunda.
 *
 * A chave secreta do Stripe vive só em STRIPE_SECRET_KEY, nunca no frontend.
 */
import { createClient } from 'npm:@supabase/supabase-js@2'

const CORS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

/** Sem O, I, 0 e 1: a chave pode ser digitada à mão sem ambiguidade. */
const ALFABETO = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

function gerarChave(): string {
  const bytes = new Uint8Array(12)
  crypto.getRandomValues(bytes)

  let corpo = ''
  for (let i = 0; i < 12; i++) {
    corpo += ALFABETO[bytes[i]! % ALFABETO.length]
    if (i === 3 || i === 7) corpo += '-'
  }
  return `D500-${corpo}`
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') return json({ erro: 'metodo_nao_permitido' }, 405)

  const stripeKey = Deno.env.get('STRIPE_SECRET_KEY')
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceRole = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

  if (!stripeKey || !supabaseUrl || !serviceRole) {
    console.error('Faltam variáveis de ambiente na função.')
    return json({ erro: 'configuracao_incompleta' }, 500)
  }

  let sessionId: unknown
  try {
    const corpo = await req.json()
    sessionId = corpo?.session_id
  } catch {
    return json({ erro: 'json_invalido' }, 400)
  }

  if (typeof sessionId !== 'string' || !sessionId.startsWith('cs_') || sessionId.length > 200) {
    return json({ erro: 'sessao_invalida' }, 400)
  }

  // Fonte da verdade é o Stripe, nunca o que o navegador mandou.
  const resposta = await fetch(
    `https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(sessionId)}`,
    { headers: { Authorization: `Bearer ${stripeKey}` } },
  )

  if (!resposta.ok) {
    return json({ erro: 'sessao_nao_encontrada' }, 404)
  }

  const sessao = await resposta.json()

  if (sessao.payment_status !== 'paid') {
    return json({ erro: 'pagamento_pendente', status: sessao.payment_status }, 402)
  }

  const supabase = createClient(supabaseUrl, serviceRole)
  const agora = new Date().toISOString()

  // Já emitida? Devolve a mesma (o webhook pode ter chegado primeiro).
  const { data: existente } = await supabase
    .from('licenses')
    .select('key, revoked_at')
    .eq('provider', 'stripe')
    .eq('external_id', sessionId)
    .maybeSingle()

  if (existente?.revoked_at) {
    return json({ erro: 'licenca_revogada' }, 410)
  }

  if (existente) {
    await supabase.from('licenses').update({ last_seen_at: agora }).eq('key', existente.key)
    return json({ key: existente.key, ja_emitida: true })
  }

  const key = gerarChave()
  const { error } = await supabase.from('licenses').insert({
    key,
    provider: 'stripe',
    external_id: sessionId,
    stripe_session_id: sessionId,
    stripe_payment_intent: sessao.payment_intent ?? null,
    customer_email: sessao.customer_details?.email ?? sessao.customer_email ?? null,
    amount_total: sessao.amount_total ?? null,
    currency: sessao.currency ?? null,
    last_seen_at: agora,
  })

  if (error) {
    // Corrida com o webhook: a constraint única segurou. Relê e devolve a dele.
    const { data: apos } = await supabase
      .from('licenses')
      .select('key')
      .eq('provider', 'stripe')
      .eq('external_id', sessionId)
      .maybeSingle()

    if (apos) return json({ key: apos.key, ja_emitida: true })

    console.error('Falha ao gravar licença:', error)
    return json({ erro: 'falha_ao_emitir' }, 500)
  }

  return json({ key })
})
