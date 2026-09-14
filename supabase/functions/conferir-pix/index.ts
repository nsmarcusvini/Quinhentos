/**
 * conferir-pix
 *
 * Pergunta o status da cobrança ao AbacatePay e, se estiver paga, emite a
 * licença. É o caminho principal: o navegador fica perguntando enquanto a
 * pessoa paga o QR code.
 *
 * A fonte da verdade é sempre a API do gateway, nunca o que o cliente mandou.
 */
import { createClient } from 'npm:@supabase/supabase-js@2'

const BASE = 'https://api.abacatepay.com/v2'

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

/**
 * O /transparents/check devolve apenas { id, status, expiresAt } — sem o
 * valor. Então o valor gravado vem do nosso próprio preço, que é a fonte
 * autoritativa de quanto foi cobrado, e não do gateway nem do cliente.
 */
const precoCentavos = (): number | null => {
  const bruto = Number(Deno.env.get('PRECO_CENTAVOS') ?? '1990')
  return Number.isInteger(bruto) && bruto > 0 ? bruto : null
}

const ALFABETO = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

function gerarChave(): string {
  const bytes = new Uint8Array(12)
  crypto.getRandomValues(bytes)
  let corpo = ''
  for (let i = 0; i < 12; i++) {
    corpo += ALFABETO[bytes[i]! % ALFABETO.length]
    if (i === 3 || i === 7) corpo += '-'
  }
  return 'D500-' + corpo
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') return json({ erro: 'metodo_nao_permitido' }, 405)

  const chave = Deno.env.get('ABACATEPAY_API_KEY')
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceRole = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!chave || !supabaseUrl || !serviceRole) {
    console.error('Faltam variáveis de ambiente na função.')
    return json({ erro: 'configuracao_incompleta' }, 500)
  }

  let cobrancaId: unknown
  try {
    const corpo = await req.json()
    cobrancaId = corpo?.id
  } catch {
    return json({ erro: 'json_invalido' }, 400)
  }
  if (typeof cobrancaId !== 'string' || cobrancaId.length < 6 || cobrancaId.length > 200) {
    return json({ erro: 'cobranca_invalida' }, 400)
  }

  const supabase = createClient(supabaseUrl, serviceRole)

  // Já emitida? Devolve a mesma (o webhook pode ter chegado primeiro).
  const { data: existente } = await supabase
    .from('licenses')
    .select('key, revoked_at')
    .eq('provider', 'abacatepay')
    .eq('external_id', cobrancaId)
    .maybeSingle()

  if (existente?.revoked_at) return json({ erro: 'licenca_revogada' }, 410)
  if (existente) return json({ status: 'PAID', key: existente.key, ja_emitida: true })

  let status = ''
  try {
    const resposta = await fetch(
      BASE + '/transparents/check?id=' + encodeURIComponent(cobrancaId),
      { headers: { Authorization: 'Bearer ' + chave } },
    )
    const corpo = await resposta.json()
    if (!resposta.ok || !corpo?.data) return json({ erro: 'cobranca_nao_encontrada' }, 404)
    status = String(corpo.data.status ?? '')
  } catch (erro) {
    console.error('Falha ao consultar o AbacatePay:', erro instanceof Error ? erro.message : erro)
    return json({ erro: 'gateway_indisponivel' }, 502)
  }

  if (status !== 'PAID') return json({ status })

  const key = gerarChave()
  const { error } = await supabase.from('licenses').insert({
    key,
    provider: 'abacatepay',
    external_id: cobrancaId,
    amount_total: precoCentavos(),
    currency: 'brl',
    last_seen_at: new Date().toISOString(),
  })

  if (error) {
    // Corrida com o webhook: a constraint única segurou. Relê e devolve a dele.
    const { data: apos } = await supabase
      .from('licenses')
      .select('key')
      .eq('provider', 'abacatepay')
      .eq('external_id', cobrancaId)
      .maybeSingle()

    if (apos) return json({ status: 'PAID', key: apos.key, ja_emitida: true })

    console.error('Falha ao gravar licença:', error)
    return json({ erro: 'falha_ao_emitir' }, 500)
  }

  return json({ status: 'PAID', key })
})
