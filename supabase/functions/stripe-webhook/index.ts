/**
 * stripe-webhook
 *
 * Autenticação é a assinatura HMAC do Stripe, verificada abaixo — por isso
 * esta é a única função com verify_jwt desligado (o Stripe não tem como mandar
 * um JWT do Supabase). Sem assinatura válida nada é gravado.
 *
 * Eventos tratados:
 *   checkout.session.completed              emite  (cartão)
 *   checkout.session.async_payment_succeeded emite  (Pix/boleto confirmado)
 *   checkout.session.async_payment_failed    log    (Pix/boleto não pago)
 *   charge.refunded                          revoga (reembolso integral)
 *   charge.dispute.created                   revoga (chargeback)
 */
import Stripe from 'npm:stripe@18'
import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2'

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

const ok = (corpo: Record<string, unknown>) =>
  new Response(JSON.stringify(corpo), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })

/** Emite a licença da sessão. A constraint única garante idempotência. */
async function emitir(supabase: SupabaseClient, sessao: Stripe.Checkout.Session) {
  const { error } = await supabase.from('licenses').insert({
    key: gerarChave(),
    stripe_session_id: sessao.id,
    stripe_payment_intent: typeof sessao.payment_intent === 'string' ? sessao.payment_intent : null,
    customer_email: sessao.customer_details?.email ?? sessao.customer_email ?? null,
    amount_total: sessao.amount_total ?? null,
    currency: sessao.currency ?? null,
  })

  // 23505 = reenvio do mesmo evento, ou o resgate chegou primeiro. Não é erro.
  if (error && error.code !== '23505') throw error
  return error ? 'ja_existia' : 'emitida'
}

/**
 * Revoga pela referência do pagamento. A linha permanece: o histórico fica
 * auditável e o stripe_session_id segue ocupado contra reemissão.
 */
async function revogar(supabase: SupabaseClient, paymentIntent: string | null, motivo: string) {
  if (!paymentIntent) return 'sem_payment_intent'

  const { data, error } = await supabase
    .from('licenses')
    .update({ revoked_at: new Date().toISOString(), revoked_reason: motivo })
    .eq('stripe_payment_intent', paymentIntent)
    .is('revoked_at', null)
    .select('key')

  if (error) throw error
  return data && data.length > 0 ? `revogadas_${data.length}` : 'nenhuma_licenca'
}

Deno.serve(async (req: Request) => {
  const assinatura = req.headers.get('stripe-signature')
  const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')
  const stripeKey = Deno.env.get('STRIPE_SECRET_KEY')
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceRole = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

  if (!webhookSecret || !stripeKey || !supabaseUrl || !serviceRole) {
    console.error('Faltam variáveis de ambiente na função.')
    return new Response('configuracao_incompleta', { status: 500 })
  }
  if (!assinatura) return new Response('assinatura_ausente', { status: 400 })

  const stripe = new Stripe(stripeKey)
  const corpoBruto = await req.text()

  let evento: Stripe.Event
  try {
    // constructEventAsync usa Web Crypto — é a variante correta no Deno.
    evento = await stripe.webhooks.constructEventAsync(corpoBruto, assinatura, webhookSecret)
  } catch (erro) {
    console.error('Assinatura inválida:', erro instanceof Error ? erro.message : erro)
    return new Response('assinatura_invalida', { status: 400 })
  }

  const supabase = createClient(supabaseUrl, serviceRole)

  try {
    switch (evento.type) {
      case 'checkout.session.completed':
      case 'checkout.session.async_payment_succeeded': {
        const sessao = evento.data.object as Stripe.Checkout.Session

        // No Pix o `completed` chega antes do pagamento confirmar; quem emite
        // nesse caso é o async_payment_succeeded, que vem depois.
        if (sessao.payment_status !== 'paid') {
          return ok({ ignorado: 'aguardando_pagamento', status: sessao.payment_status })
        }

        return ok({ resultado: await emitir(supabase, sessao) })
      }

      case 'checkout.session.async_payment_failed': {
        const sessao = evento.data.object as Stripe.Checkout.Session
        console.log('Pagamento assíncrono falhou para a sessão', sessao.id)
        return ok({ resultado: 'pagamento_falhou' })
      }

      case 'charge.refunded': {
        const cobranca = evento.data.object as Stripe.Charge

        // `refunded` só é true no reembolso INTEGRAL. Parcial não tira acesso.
        if (!cobranca.refunded) {
          return ok({ ignorado: 'reembolso_parcial', reembolsado: cobranca.amount_refunded })
        }

        const pi =
          typeof cobranca.payment_intent === 'string' ? cobranca.payment_intent : null
        return ok({ resultado: await revogar(supabase, pi, 'charge.refunded') })
      }

      case 'charge.dispute.created': {
        const disputa = evento.data.object as Stripe.Dispute
        const pi = typeof disputa.payment_intent === 'string' ? disputa.payment_intent : null
        return ok({ resultado: await revogar(supabase, pi, 'charge.dispute.created') })
      }

      default:
        // Reconhece e ignora: evita o Stripe reenviar o que não nos serve.
        return ok({ ignorado: evento.type })
    }
  } catch (erro) {
    console.error('Falha ao processar', evento.type, erro)
    // 500 faz o Stripe tentar de novo — é o que queremos numa falha real.
    return new Response('falha_ao_processar', { status: 500 })
  }
})
