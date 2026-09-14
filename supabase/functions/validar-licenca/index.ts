/**
 * validar-licenca
 *
 * Confere se uma chave colada à mão existe de verdade. É o que impede alguém
 * de inventar uma chave no formato certo e destravar o app sem ter pago.
 *
 * Responde só sim ou não: nunca devolve e-mail, valor ou qualquer dado da
 * compra, para não virar um oráculo de dados de clientes.
 */
import { createClient } from 'npm:@supabase/supabase-js@2'

const CORS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const FORMATO = /^D500-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') return json({ erro: 'metodo_nao_permitido' }, 405)

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceRole = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!supabaseUrl || !serviceRole) {
    console.error('Faltam variáveis de ambiente na função.')
    return json({ erro: 'configuracao_incompleta' }, 500)
  }

  let chave: unknown
  try {
    const corpo = await req.json()
    chave = corpo?.key
  } catch {
    return json({ erro: 'json_invalido' }, 400)
  }

  if (typeof chave !== 'string') return json({ valida: false }, 200)

  const normalizada = chave.trim().toUpperCase().replace(/\s+/g, '')
  if (!FORMATO.test(normalizada)) return json({ valida: false }, 200)

  const supabase = createClient(supabaseUrl, serviceRole)
  const { data, error } = await supabase
    .from('licenses')
    .select('key, revoked_at, plan, current_period_end')
    .eq('key', normalizada)
    .maybeSingle()

  if (error) {
    console.error('Falha ao consultar licença:', error)
    return json({ erro: 'falha_na_consulta' }, 500)
  }

  if (!data) return json({ valida: false, motivo: 'inexistente' }, 200)

  // Reembolsada ou contestada: a linha continua no banco para auditoria, mas
  // deixa de destravar. O motivo vai separado para a tela explicar direito.
  if (data.revoked_at) return json({ valida: false, motivo: 'revogada' }, 200)

  // Assinatura cujo período acabou sem renovar. Nulo é o vitalício, que não
  // expira nunca — por isso a comparação só acontece quando há data.
  if (data.current_period_end && new Date(data.current_period_end).getTime() <= Date.now()) {
    return json({ valida: false, motivo: 'expirada' }, 200)
  }

  await supabase
    .from('licenses')
    .update({ last_seen_at: new Date().toISOString() })
    .eq('key', normalizada)

  return json({ valida: true, plano: data.plan, expiraEm: data.current_period_end })
})
