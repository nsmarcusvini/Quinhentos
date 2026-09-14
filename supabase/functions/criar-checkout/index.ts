/**
 * criar-checkout
 *
 * Cria a sessão de Checkout do Stripe e devolve a URL para onde redirecionar.
 *
 * O preço e a URL de retorno vêm do ambiente, não do corpo da requisição: se o
 * navegador pudesse escolher o preço, qualquer um compraria por R$ 0,01, e se
 * pudesse escolher o success_url isso viraria um redirecionamento aberto
 * assinado pelo domínio do Stripe.
 */
import Stripe from 'npm:stripe@18'
import { createClient } from 'npm:@supabase/supabase-js@2'

const CORS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

/** Entre 10s e 3 dias, segundo a documentação do Pix. */
const PIX_EXPIRA_EM_SEGUNDOS = 3600

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
  const priceId = Deno.env.get('STRIPE_PRICE_ID')
  const siteUrl = Deno.env.get('SITE_URL')
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceRole = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')

  if (!stripeKey || !priceId || !siteUrl || !supabaseUrl || !serviceRole || !anonKey) {
    console.error('Faltam variáveis de ambiente na função.')
    return json({ erro: 'configuracao_incompleta' }, 500)
  }

  // A conta vem antes do pagamento: sem login não há compra.
  const comoUsuario = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
  })
  const { data: sessaoAuth } = await comoUsuario.auth.getUser()
  const usuario = sessaoAuth?.user
  if (!usuario) return json({ erro: 'nao_autenticado' }, 401)

  const base = siteUrl.replace(/\/+$/, '')
  const stripe = new Stripe(stripeKey)

  try {
    const sessao = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${base}/acesso?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${base}/app`,
      locale: 'pt-BR',
      customer_creation: 'always',
      billing_address_collection: 'auto',
      // Amarra a compra à conta desde a origem; o e-mail já vem preenchido.
      client_reference_id: usuario.id,
      customer_email: usuario.email ?? undefined,
      payment_method_options: {
        pix: {
          // Padrão da Stripe são 4 horas. Para uma compra por impulso de
          // R$ 19,90 isso é tempo demais: deixa cobrança pendente pendurada e
          // dilui a urgência. Uma hora cobre com folga abrir o app do banco.
          expires_after_seconds: PIX_EXPIRA_EM_SEGUNDOS,
        },
      },
    })

    if (!sessao.url) return json({ erro: 'sessao_sem_url' }, 500)

    // Grava quem iniciou, enquanto ainda temos o usuário em mãos.
    const admin = createClient(supabaseUrl, serviceRole)
    const { error: erroIntencao } = await admin
      .from('payment_intents')
      .insert({ provider: 'stripe', external_id: sessao.id, user_id: usuario.id })
    if (erroIntencao) console.error('Falha ao registrar a intenção:', erroIntencao)

    return json({ url: sessao.url })
  } catch (erro) {
    console.error('Falha ao criar checkout:', erro instanceof Error ? erro.message : erro)
    return json({ erro: 'falha_ao_criar_checkout' }, 502)
  }
})
