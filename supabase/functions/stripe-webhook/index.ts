/**
 * stripe-webhook
 *
 * Camada de durabilidade: se a pessoa fechar o navegador antes de voltar do
 * Stripe, a licença é emitida mesmo assim e fica recuperável pelo e-mail da
 * compra. O caminho principal continua sendo a função resgatar-licenca.
 *
 * Esta função roda com verify_jwt DESLIGADO — o Stripe não tem como mandar um
 * JWT do Supabase. A autenticação é a assinatura HMAC do próprio Stripe,
 * verificada abaixo; sem assinatura válida nada é gravado.
 */
import Stripe from 'npm:stripe@18'
import { createClient } from 'npm:@supabase/supabase-js@2'

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
  if (!assinatura) {
    return new Response('assinatura_ausente', { status: 400 })
  }

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

  if (evento.type !== 'checkout.session.completed') {
    // Reconhece e ignora: evita o Stripe reenviar eventos que não nos servem.
    return new Response(JSON.stringify({ ignorado: evento.type }), { status: 200 })
  }

  const sessao = evento.data.object as Stripe.Checkout.Session
  if (sessao.payment_status !== 'paid') {
    return new Response(JSON.stringify({ ignorado: 'nao_pago' }), { status: 200 })
  }

  const supabase = createClient(supabaseUrl, serviceRole)

  // A constraint única em stripe_session_id faz a idempotência: um reenvio do
  // mesmo evento não emite segunda chave.
  const { error } = await supabase.from('licenses').insert({
    key: gerarChave(),
    stripe_session_id: sessao.id,
    stripe_payment_intent: typeof sessao.payment_intent === 'string' ? sessao.payment_intent : null,
    customer_email: sessao.customer_details?.email ?? sessao.customer_email ?? null,
    amount_total: sessao.amount_total ?? null,
    currency: sessao.currency ?? null,
  })

  if (error && error.code !== '23505') {
    console.error('Falha ao gravar licença:', error)
    // 500 faz o Stripe tentar de novo — é o que queremos numa falha real.
    return new Response('falha_ao_gravar', { status: 500 })
  }

  return new Response(JSON.stringify({ ok: true }), { status: 200 })
})
