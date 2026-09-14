/**
 * abacate-webhook
 *
 * Camada de durabilidade do Pix: se a pessoa fechar o navegador depois de pagar
 * o QR code, a licença nasce mesmo assim. O caminho principal é conferir-pix.
 *
 * verify_jwt DESLIGADO: o AbacatePay não tem como mandar um JWT do Supabase. A
 * autenticação é o segredo na query string, comparado em tempo constante.
 *
 * O payload NÃO é a fonte da verdade. Dele só sai o id da cobrança; o status é
 * confirmado direto na API. Assim nem um payload forjado emite licença — o que
 * também nos protege de a documentação do formato estar incompleta.
 */
import { createClient } from 'npm:@supabase/supabase-js@2'

const BASE = 'https://api.abacatepay.com/v2'
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

/** Comparação que não vaza, pelo tempo, quantos caracteres bateram. */
function iguais(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diferenca = 0
  for (let i = 0; i < a.length; i++) diferenca |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diferenca === 0
}

/** O id da cobrança pode vir em lugares diferentes conforme o evento. */
function acharId(payload: Record<string, unknown>): string | null {
  const dados = (payload.data ?? {}) as Record<string, unknown>
  const aninhado = (campo: string) =>
    (dados[campo] as Record<string, unknown> | undefined)?.id

  const candidatos = [dados.id, aninhado('pixQrCode'), aninhado('transparent'), aninhado('charge')]
  for (const candidato of candidatos) {
    if (typeof candidato === 'string' && candidato.length > 5) return candidato
  }
  return null
}

Deno.serve(async (req: Request) => {
  const segredo = Deno.env.get('ABACATEPAY_WEBHOOK_SECRET')
  const chave = Deno.env.get('ABACATEPAY_API_KEY')
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceRole = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

  if (!segredo || !chave || !supabaseUrl || !serviceRole) {
    console.error('Faltam variáveis de ambiente na função.')
    return new Response('configuracao_incompleta', { status: 500 })
  }

  // A documentação mostra o segredo na query string, mas também menciona um
  // header de assinatura. Como não deu para confirmar qual chega de fato,
  // aceito as duas formas — errar aqui derrubaria a camada de durabilidade em
  // silêncio, e só descobriríamos por um cliente sem acesso.
  const url = new URL(req.url)
  const candidatos = [
    url.searchParams.get('webhookSecret'),
    url.searchParams.get('webhook_secret'),
    req.headers.get('x-webhook-secret'),
    req.headers.get('x-abacatepay-secret'),
  ]

  if (!candidatos.some((valor) => typeof valor === 'string' && iguais(valor, segredo))) {
    console.warn('Webhook recusado: segredo ausente ou incorreto.')
    return new Response('segredo_invalido', { status: 401 })
  }

  let payload: Record<string, unknown>
  try {
    payload = await req.json()
  } catch {
    return new Response('json_invalido', { status: 400 })
  }

  const cobrancaId = acharId(payload)
  if (!cobrancaId) {
    console.log('Evento sem id de cobrança:', payload.event)
    return new Response(JSON.stringify({ ignorado: 'sem_id' }), { status: 200 })
  }

  // Confirma na API em vez de acreditar no corpo recebido.
  let status = ''
  try {
    const resposta = await fetch(
      BASE + '/transparents/check?id=' + encodeURIComponent(cobrancaId),
      { headers: { Authorization: 'Bearer ' + chave } },
    )
    const corpo = await resposta.json()
    status = String(corpo?.data?.status ?? '')
  } catch (erro) {
    console.error('Falha ao confirmar no AbacatePay:', erro instanceof Error ? erro.message : erro)
    return new Response('gateway_indisponivel', { status: 500 })
  }

  if (status !== 'PAID') {
    return new Response(JSON.stringify({ ignorado: 'nao_pago', status }), { status: 200 })
  }

  const supabase = createClient(supabaseUrl, serviceRole)
  const { error } = await supabase.from('licenses').insert({
    key: gerarChave(),
    provider: 'abacatepay',
    external_id: cobrancaId,
    amount_total: precoCentavos(),
    currency: 'brl',
  })

  // 23505 = reenvio do evento, ou o navegador chegou primeiro. Não é erro.
  if (error && error.code !== '23505') {
    console.error('Falha ao gravar licença:', error)
    return new Response('falha_ao_gravar', { status: 500 })
  }

  return new Response(JSON.stringify({ ok: true, ja_existia: Boolean(error) }), { status: 200 })
})
