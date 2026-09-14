/**
 * criar-portal
 *
 * Abre o portal de cobrança do Stripe para quem assina o mensal: trocar o
 * cartão, ver as faturas e CANCELAR, sem passar por e-mail de suporte.
 *
 * Cobrar por mês sem um botão de cancelar seria indefensável — e, no Brasil, o
 * art. 49 do CDC e o direito de rescisão fazem disso um problema jurídico, não
 * só de reputação. O portal é do Stripe, então o cancelamento vale na hora e
 * não depende de nós processarmos nada.
 *
 * O cliente é descoberto a partir da licença da CONTA LOGADA, nunca de um id
 * vindo do corpo: aceitar um customer id do navegador deixaria qualquer um
 * abrir o portal de cobrança de outra pessoa.
 */
import Stripe from 'npm:stripe@18'
import { createClient } from 'npm:@supabase/supabase-js@2'

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
  const siteUrl = Deno.env.get('SITE_URL')
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceRole = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')

  if (!stripeKey || !siteUrl || !supabaseUrl || !serviceRole || !anonKey) {
    console.error('Faltam variáveis de ambiente na função.')
    return json({ erro: 'configuracao_incompleta' }, 500)
  }

  const comoUsuario = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
  })
  const { data: sessaoAuth } = await comoUsuario.auth.getUser()
  const usuario = sessaoAuth?.user
  if (!usuario) return json({ erro: 'nao_autenticado' }, 401)

  const admin = createClient(supabaseUrl, serviceRole)
  const { data: licenca, error } = await admin
    .from('licenses')
    .select('stripe_subscription_id')
    .eq('user_id', usuario.id)
    .eq('plan', 'mensal')
    .not('stripe_subscription_id', 'is', null)
    .maybeSingle()

  if (error) {
    console.error('Falha ao buscar a assinatura:', error)
    return json({ erro: 'falha_na_consulta' }, 500)
  }
  if (!licenca?.stripe_subscription_id) return json({ erro: 'sem_assinatura' }, 404)

  const stripe = new Stripe(stripeKey)
  const base = siteUrl.replace(/\/+$/, '')

  try {
    // O customer vem da própria assinatura: é a fonte que o Stripe considera
    // dona da cobrança, e evita guardarmos mais um id no nosso banco.
    const assinatura = await stripe.subscriptions.retrieve(licenca.stripe_subscription_id)
    const customer =
      typeof assinatura.customer === 'string' ? assinatura.customer : assinatura.customer.id

    const portal = await stripe.billingPortal.sessions.create({
      customer,
      return_url: `${base}/app`,
      locale: 'pt-BR',
    })

    return json({ url: portal.url })
  } catch (erro) {
    console.error('Falha ao abrir o portal:', erro instanceof Error ? erro.message : erro)
    return json({ erro: 'falha_ao_abrir_portal' }, 502)
  }
})
