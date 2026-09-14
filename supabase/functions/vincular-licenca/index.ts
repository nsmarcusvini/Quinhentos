/**
 * vincular-licenca
 *
 * Amarra uma chave de acesso à conta de quem está logado. Depois disso o login
 * sozinho destrava o app — a pessoa não precisa mais guardar a chave.
 *
 * Precisa de service_role porque o usuário não tem permissão de escrita em
 * `licenses` (só de leitura da própria linha). Por isso a verificação de quem
 * está chamando é feita aqui dentro, a partir do JWT.
 */
import { createClient } from 'npm:@supabase/supabase-js@2'

const CORS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

/**
 * Chaves novas saem como NF-XXXX-XXXX-XXXX. As antigas, emitidas quando o
 * produto se chamava Desafio 500, continuam valendo para sempre: quem pagou
 * não pode perder o acesso porque o site trocou de nome.
 */
const FORMATO = /^(NF|D500)-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/

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
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')
  if (!supabaseUrl || !serviceRole || !anonKey) {
    console.error('Faltam variáveis de ambiente na função.')
    return json({ erro: 'configuracao_incompleta' }, 500)
  }

  // Quem está chamando? O JWT do usuário decide, não o corpo da requisição.
  const authorization = req.headers.get('Authorization') ?? ''
  const comoUsuario = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authorization } },
  })

  const { data: sessao, error: erroAuth } = await comoUsuario.auth.getUser()
  const usuario = sessao?.user
  if (erroAuth || !usuario) {
    return json({ erro: 'nao_autenticado' }, 401)
  }

  let chave: unknown
  try {
    const corpo = await req.json()
    chave = corpo?.key
  } catch {
    return json({ erro: 'json_invalido' }, 400)
  }

  if (typeof chave !== 'string') return json({ erro: 'chave_invalida' }, 400)
  const normalizada = chave.trim().toUpperCase().replace(/\s+/g, '')
  if (!FORMATO.test(normalizada)) return json({ erro: 'chave_invalida' }, 400)

  const admin = createClient(supabaseUrl, serviceRole)

  const { data: licenca, error } = await admin
    .from('licenses')
    .select('key, user_id, revoked_at')
    .eq('key', normalizada)
    .maybeSingle()

  if (error) {
    console.error('Falha ao consultar licença:', error)
    return json({ erro: 'falha_na_consulta' }, 500)
  }

  if (!licenca) return json({ erro: 'chave_inexistente' }, 404)
  if (licenca.revoked_at) return json({ erro: 'licenca_revogada' }, 410)

  // Já é desta conta: nada a fazer, mas responde sucesso (idempotente).
  if (licenca.user_id === usuario.id) return json({ vinculada: true, ja_era: true })

  // Já pertence a OUTRA conta: não rouba licença alheia.
  if (licenca.user_id) return json({ erro: 'chave_de_outra_conta' }, 409)

  const { error: erroUpdate } = await admin
    .from('licenses')
    .update({ user_id: usuario.id, last_seen_at: new Date().toISOString() })
    .eq('key', normalizada)
    .is('user_id', null)

  if (erroUpdate) {
    console.error('Falha ao vincular licença:', erroUpdate)
    return json({ erro: 'falha_ao_vincular' }, 500)
  }

  return json({ vinculada: true })
})
