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

const CORS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
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
  const priceId = Deno.env.get('STRIPE_PRICE_ID')
  const siteUrl = Deno.env.get('SITE_URL')

  if (!stripeKey || !priceId || !siteUrl) {
    console.error('Faltam variáveis de ambiente na função.')
    return json({ erro: 'configuracao_incompleta' }, 500)
  }

  const base = siteUrl.replace(/\/+$/, '')
  const stripe = new Stripe(stripeKey)

  try {
    const sessao = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${base}/acesso?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${base}/app`,
      locale: 'pt-BR',
      // O e-mail vira o caminho de recuperação da chave e a sua lista.
      customer_creation: 'always',
      billing_address_collection: 'auto',
    })

    if (!sessao.url) return json({ erro: 'sessao_sem_url' }, 500)
    return json({ url: sessao.url })
  } catch (erro) {
    console.error('Falha ao criar checkout:', erro instanceof Error ? erro.message : erro)
    return json({ erro: 'falha_ao_criar_checkout' }, 502)
  }
})
