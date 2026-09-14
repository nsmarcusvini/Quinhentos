/**
 * criar-pix
 *
 * Cria a cobrança Pix no AbacatePay e devolve o código copia-e-cola mais o QR.
 *
 * O valor vem do ambiente, nunca do corpo da requisição: se o navegador
 * escolhesse o valor, qualquer um pagaria R$ 0,01 pelo acesso.
 */
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

/** Uma hora, igual ao Pix do Stripe. Compra por impulso não pede mais. */
const EXPIRA_EM_SEGUNDOS = 3600

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') return json({ erro: 'metodo_nao_permitido' }, 405)

  const chave = Deno.env.get('ABACATEPAY_API_KEY')
  const valorCentavos = Number(Deno.env.get('PRECO_CENTAVOS') ?? '1990')

  if (!chave || !Number.isInteger(valorCentavos) || valorCentavos <= 0) {
    console.error('Faltam variáveis de ambiente na função.')
    return json({ erro: 'configuracao_incompleta' }, 500)
  }

  try {
    const resposta = await fetch(BASE + '/transparents/create', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + chave,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        method: 'PIX',
        data: {
          amount: valorCentavos,
          expiresIn: EXPIRA_EM_SEGUNDOS,
          description: 'Desafio 500 — acesso vitalício',
        },
      }),
    })

    const corpo = await resposta.json()

    if (!resposta.ok || corpo?.success === false || !corpo?.data?.id) {
      console.error('AbacatePay recusou a criação:', corpo?.error ?? resposta.status)
      return json({ erro: 'falha_ao_criar_cobranca' }, 502)
    }

    const dados = corpo.data
    return json({
      id: dados.id,
      brCode: dados.brCode,
      brCodeBase64: dados.brCodeBase64,
      expiresAt: dados.expiresAt,
      devMode: dados.devMode === true,
    })
  } catch (erro) {
    console.error('Falha ao falar com o AbacatePay:', erro instanceof Error ? erro.message : erro)
    return json({ erro: 'gateway_indisponivel' }, 502)
  }
})
