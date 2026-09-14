/**
 * stripe-webhook
 *
 * Autenticação é a assinatura HMAC do Stripe, verificada abaixo — por isso
 * esta é a única função com verify_jwt desligado (o Stripe não tem como mandar
 * um JWT do Supabase). Sem assinatura válida nada é gravado.
 *
 * Eventos tratados:
 *   checkout.session.completed               emite  (cartão, e 1ª cobrança do mensal)
 *   checkout.session.async_payment_succeeded emite  (Pix/boleto confirmado)
 *   checkout.session.async_payment_failed    log    (Pix/boleto não pago)
 *   invoice.paid                             renova (empurra o fim do período)
 *   invoice.payment_failed                   log    (a Stripe ainda vai retentar)
 *   customer.subscription.updated            ajusta (fim do período, cancelamento)
 *   customer.subscription.deleted            revoga (assinatura encerrada)
 *   charge.refunded                          revoga (reembolso integral)
 *   charge.dispute.created                   revoga (chargeback)
 *
 * O acesso do mensal não depende de ninguém lembrar de cortá-lo: ele vale até
 * `current_period_end` e só continua valendo se uma renovação empurrar essa
 * data. Falha de cobrança não precisa de lógica de carência — a data chega e o
 * acesso cai sozinho.
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

/**
 * Fim do período da assinatura, em ISO.
 *
 * A Stripe moveu `current_period_end` da assinatura para os itens dela em
 * versões recentes da API. Lê os dois lugares para não depender de qual versão
 * a conta está fixada.
 */
function fimDoPeriodo(assinatura: Stripe.Subscription): string | null {
  const daAssinatura = (assinatura as unknown as { current_period_end?: number })
    .current_period_end
  const doItem = assinatura.items?.data?.[0]?.current_period_end
  const bruto = typeof daAssinatura === 'number' ? daAssinatura : doItem

  return typeof bruto === 'number' ? new Date(bruto * 1000).toISOString() : null
}

/** Emite a licença da sessão. A constraint única garante idempotência. */
async function emitir(
  supabase: SupabaseClient,
  stripe: Stripe,
  sessao: Stripe.Checkout.Session,
) {
  const assinaturaId =
    typeof sessao.subscription === 'string' ? sessao.subscription : sessao.subscription?.id ?? null

  let plano: 'vitalicio' | 'mensal' = 'vitalicio'
  let fim: string | null = null

  if (assinaturaId) {
    // Busca ao vivo: a sessão traz o id da assinatura, não as datas dela.
    const assinatura = await stripe.subscriptions.retrieve(assinaturaId)
    fim = fimDoPeriodo(assinatura)

    // Sem data de fim não dá para emitir mensal: a constraint do banco recusa,
    // e emitir sem fim seria dar acesso eterno por R$ 5,90.
    if (!fim) throw new Error(`Assinatura ${assinaturaId} veio sem fim de período`)
    plano = 'mensal'
  }

  const { error } = await supabase.from('licenses').insert({
    key: gerarChave(),
    provider: 'stripe',
    external_id: sessao.id,
    stripe_session_id: sessao.id,
    stripe_payment_intent: typeof sessao.payment_intent === 'string' ? sessao.payment_intent : null,
    stripe_subscription_id: assinaturaId,
    plan: plano,
    current_period_end: fim,
    customer_email: sessao.customer_details?.email ?? sessao.customer_email ?? null,
    amount_total: sessao.amount_total ?? null,
    currency: sessao.currency ?? null,
  })

  // 23505 = reenvio do mesmo evento, ou o resgate chegou primeiro. Não é erro.
  if (error && error.code !== '23505') throw error
  return error ? 'ja_existia' : `emitida_${plano}`
}

/**
 * Empurra o fim do acesso de uma assinatura já emitida.
 *
 * Só ATUALIZA, nunca cria: quem cria é o checkout. Se a fatura chegar antes da
 * sessão — a ordem dos webhooks não é garantida — zero linhas aqui é o
 * resultado certo, e a sessão emite logo em seguida já com a data ao vivo.
 */
async function renovar(supabase: SupabaseClient, assinaturaId: string, fim: string | null) {
  if (!fim) return 'sem_fim_de_periodo'

  const { data, error } = await supabase
    .from('licenses')
    .update({ current_period_end: fim })
    .eq('stripe_subscription_id', assinaturaId)
    .select('key')

  if (error) throw error
  return data && data.length > 0 ? `renovada_ate_${fim}` : 'licenca_ainda_nao_existe'
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

/** Revoga pela assinatura, para quando ela é encerrada de vez. */
async function revogarAssinatura(
  supabase: SupabaseClient,
  assinaturaId: string,
  motivo: string,
) {
  const { data, error } = await supabase
    .from('licenses')
    .update({ revoked_at: new Date().toISOString(), revoked_reason: motivo })
    .eq('stripe_subscription_id', assinaturaId)
    .is('revoked_at', null)
    .select('key')

  if (error) throw error
  return data && data.length > 0 ? `revogadas_${data.length}` : 'nenhuma_licenca'
}

Deno.serve(async (req: Request) => {
  const assinaturaHeader = req.headers.get('stripe-signature')
  const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')
  const stripeKey = Deno.env.get('STRIPE_SECRET_KEY')
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceRole = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

  if (!webhookSecret || !stripeKey || !supabaseUrl || !serviceRole) {
    console.error('Faltam variáveis de ambiente na função.')
    return new Response('configuracao_incompleta', { status: 500 })
  }
  if (!assinaturaHeader) return new Response('assinatura_ausente', { status: 400 })

  const stripe = new Stripe(stripeKey)
  const corpoBruto = await req.text()

  let evento: Stripe.Event
  try {
    // constructEventAsync usa Web Crypto — é a variante correta no Deno.
    evento = await stripe.webhooks.constructEventAsync(corpoBruto, assinaturaHeader, webhookSecret)
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
        // nesse caso é o async_payment_succeeded, que vem depois. Assinatura
        // sem cobrança (cupom de 100%) vem como `no_payment_required`.
        if (sessao.payment_status === 'unpaid') {
          return ok({ ignorado: 'aguardando_pagamento', status: sessao.payment_status })
        }

        return ok({ resultado: await emitir(supabase, stripe, sessao) })
      }

      case 'checkout.session.async_payment_failed': {
        const sessao = evento.data.object as Stripe.Checkout.Session
        console.log('Pagamento assíncrono falhou para a sessão', sessao.id)
        return ok({ resultado: 'pagamento_falhou' })
      }

      case 'invoice.paid': {
        const fatura = evento.data.object as Stripe.Invoice
        const assinaturaId =
          typeof (fatura as unknown as { subscription?: unknown }).subscription === 'string'
            ? ((fatura as unknown as { subscription: string }).subscription)
            : null

        if (!assinaturaId) return ok({ ignorado: 'fatura_sem_assinatura' })

        const assinatura = await stripe.subscriptions.retrieve(assinaturaId)
        return ok({ resultado: await renovar(supabase, assinaturaId, fimDoPeriodo(assinatura)) })
      }

      case 'invoice.payment_failed': {
        const fatura = evento.data.object as Stripe.Invoice
        // Nada a fazer: a Stripe ainda vai retentar, e o acesso já tem prazo.
        // Se as tentativas acabarem, vem `customer.subscription.deleted`.
        console.log('Cobrança falhou na fatura', fatura.id, '— aguardando retentativas')
        return ok({ resultado: 'aguardando_retentativa' })
      }

      case 'customer.subscription.updated': {
        const assinatura = evento.data.object as Stripe.Subscription

        // `canceled` e `unpaid` são fim de linha; `past_due` ainda tem
        // retentativa pela frente e o prazo em vigor segura o acesso.
        if (assinatura.status === 'canceled' || assinatura.status === 'unpaid') {
          return ok({
            resultado: await revogarAssinatura(
              supabase,
              assinatura.id,
              `subscription.${assinatura.status}`,
            ),
          })
        }

        return ok({ resultado: await renovar(supabase, assinatura.id, fimDoPeriodo(assinatura)) })
      }

      case 'customer.subscription.deleted': {
        const assinatura = evento.data.object as Stripe.Subscription
        return ok({
          resultado: await revogarAssinatura(supabase, assinatura.id, 'subscription.deleted'),
        })
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
