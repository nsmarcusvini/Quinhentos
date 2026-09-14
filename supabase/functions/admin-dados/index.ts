/**
 * admin-dados
 *
 * Devolve o retrato inteiro do negócio — contas, licenças, cobranças e
 * progresso de cada desafio — para uma única pessoa: o dono do produto.
 *
 * Por que uma Edge Function e não uma tela lendo o banco direto: a RLS de
 * `licenses` não tem policy nenhuma e a de `challenges` só devolve a linha de
 * quem está logado. Isso é proposital e não vai mudar — um painel que
 * precisasse afrouxar a RLS transformaria a anon key, que é pública, em chave
 * de leitura da base de clientes. Aqui o service_role fica no servidor e o
 * portão é o ID do JWT contra a lista de administradores.
 *
 * Só lê. Nenhuma rota deste arquivo altera licença, conta ou desafio — a única
 * escrita é o cache da forma de pagamento, que é dado derivado da Stripe.
 */
import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2'
import Stripe from 'npm:stripe@18'

const CORS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

/**
 * Quem entra, por ID de usuário — nunca por e-mail.
 *
 * O e-mail é auto-declarável: com a confirmação desligada no Supabase, quem
 * se cadastra com um endereço recebe sessão sem provar que o endereço é dele.
 * Enquanto o allowlist fosse de e-mails, bastava um endereço administrativo
 * ainda não cadastrado para alguém reivindicá-lo e sair com a base inteira de
 * clientes — inclusive as chaves de licença, que `vincular-licenca` resgata.
 * E o endereço não era segredo: o bundle do front é público.
 *
 * O UUID vem do banco, não do cadastro. Ninguém se inscreve escolhendo o seu.
 *
 * `ADMIN_USER_IDS` (separado por vírgula) manda; sem ele vale o dono. Nunca
 * vira lista vazia: lista vazia que libera todo mundo é a falha clássica.
 */
const ADMIN_PADRAO = ['bb7c0fbd-2a03-4cdc-839a-1fd57e13b892']

/** Quantas licenças sem forma de pagamento consultar na Stripe por chamada. */
const LIMITE_ENRIQUECIMENTO = 25

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })
}

function listaDeAdmins(): string[] {
  const bruto = Deno.env.get('ADMIN_USER_IDS')
  if (!bruto) return ADMIN_PADRAO

  const lista = bruto
    .split(',')
    .map((id) => id.trim().toLowerCase())
    .filter(Boolean)

  return lista.length > 0 ? lista : ADMIN_PADRAO
}

interface ResumoDesafio {
  marcadas: number
  guardado: number
  primeiraEm: number | null
  ultimaEm: number | null
  atualizadoEm: string | null
}

/**
 * Condensa o `state` do desafio nos números que interessam ao painel.
 *
 * Uma casinha vale quando `entries[n]` existe e é mais recente que
 * `removed[n]` — a mesma regra da sincronia entre aparelhos. Somar só as
 * chaves de `entries` contaria de novo o que a pessoa desmarcou.
 *
 * O jsonb inteiro nunca sai daqui: são até 500 pares por usuário, e o painel
 * não tem o que fazer com o timestamp de cada casinha.
 */
function resumirDesafio(state: unknown, atualizadoEm: string | null): ResumoDesafio {
  const vazio: ResumoDesafio = {
    marcadas: 0,
    guardado: 0,
    primeiraEm: null,
    ultimaEm: null,
    atualizadoEm,
  }

  if (typeof state !== 'object' || state === null) return vazio

  const { entries, removed } = state as {
    entries?: Record<string, unknown>
    removed?: Record<string, unknown>
  }
  if (typeof entries !== 'object' || entries === null) return vazio

  let marcadas = 0
  let guardado = 0
  let primeira: number | null = null
  let ultima: number | null = null

  for (const [chave, valor] of Object.entries(entries)) {
    const numero = Number(chave)
    if (!Number.isInteger(numero) || numero < 1 || numero > 500) continue
    if (typeof valor !== 'number' || !Number.isFinite(valor)) continue

    const apagadaEm = removed?.[chave]
    if (typeof apagadaEm === 'number' && apagadaEm >= valor) continue

    marcadas += 1
    guardado += numero
    if (primeira === null || valor < primeira) primeira = valor
    if (ultima === null || valor > ultima) ultima = valor
  }

  return { marcadas, guardado, primeiraEm: primeira, ultimaEm: ultima, atualizadoEm }
}

interface UsuarioAuth {
  id: string
  email?: string
  created_at: string
  last_sign_in_at?: string | null
  email_confirmed_at?: string | null
  /** Nome e idade, preenchidos no cadastro. */
  user_metadata?: Record<string, unknown> | null
}

/**
 * Lê nome e idade do metadata da conta.
 *
 * O `user_metadata` é escrito pelo próprio navegador no `signUp` — quem cria a
 * conta manda o que quiser ali. Por isso nada aqui confia no formato: conta
 * anterior ao formulário novo não tem os campos, e uma inventada à mão pode ter
 * qualquer coisa neles. O painel prefere mostrar "—" a exibir lixo.
 */
function lerPerfil(metadata: Record<string, unknown> | null | undefined): {
  nome: string | null
  idade: number | null
} {
  if (!metadata) return { nome: null, idade: null }

  const nome = typeof metadata.nome === 'string' ? metadata.nome.trim().slice(0, 80) : ''

  // Number() porque uma conta antiga pode ter gravado a idade como texto.
  const bruta = Number(metadata.idade)
  const idade = Number.isFinite(bruta) && bruta > 0 && bruta < 150 ? Math.trunc(bruta) : null

  return { nome: nome || null, idade }
}

/**
 * Lê todas as contas.
 *
 * `listUsers` pagina, e a página tem teto — sem o laço o painel mostraria só
 * os primeiros e passaria a mentir em silêncio a partir do usuário 1001. O
 * teto de páginas existe para um bug não virar laço infinito.
 */
async function lerUsuarios(supabase: SupabaseClient): Promise<UsuarioAuth[]> {
  const porPagina = 1000
  const todos: UsuarioAuth[] = []

  for (let pagina = 1; pagina <= 20; pagina += 1) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page: pagina,
      perPage: porPagina,
    })
    if (error) throw error

    todos.push(...(data.users as unknown as UsuarioAuth[]))
    if (data.users.length < porPagina) break
  }

  return todos
}

interface LinhaLicenca {
  key: string
  user_id: string | null
  customer_email: string | null
  plan: string
  provider: string
  payment_method: string | null
  amount_total: number | null
  currency: string | null
  created_at: string
  last_seen_at: string | null
  revoked_at: string | null
  revoked_reason: string | null
  current_period_end: string | null
  external_id: string
  stripe_session_id: string | null
  stripe_subscription_id: string | null
  stripe_payment_intent: string | null
}

/**
 * Descobre como cada compra foi paga, uma vez só.
 *
 * A forma de pagamento não existe no instante em que a licença é emitida: o
 * webhook recebe a sessão, não a cobrança. Em vez de mais uma ida à Stripe
 * dentro do webhook — que é o caminho crítico do pagamento — a consulta
 * acontece aqui, fora da pressa, e o resultado fica gravado. Cada licença
 * custa uma chamada uma vez na vida.
 *
 * Assinatura é sempre cartão: no modo `subscription` a Stripe não oferece Pix.
 * Sem STRIPE_SECRET_KEY nada disso roda e o painel mostra o que dá para
 * deduzir do provedor, que já cobre o Pix do AbacatePay.
 */
async function completarFormaDePagamento(
  supabase: SupabaseClient,
  licencas: LinhaLicenca[],
): Promise<void> {
  const chaveStripe = Deno.env.get('STRIPE_SECRET_KEY')

  const pendentes = licencas.filter((licenca) => !licenca.payment_method)
  if (pendentes.length === 0) return

  const gravar = async (licenca: LinhaLicenca, metodo: string) => {
    licenca.payment_method = metodo
    const { error } = await supabase
      .from('licenses')
      .update({ payment_method: metodo })
      .eq('key', licenca.key)
    if (error) console.error('Falha ao gravar forma de pagamento:', error)
  }

  const naStripe: LinhaLicenca[] = []

  for (const licenca of pendentes) {
    if (licenca.provider === 'abacatepay') {
      await gravar(licenca, 'pix')
      continue
    }
    if (licenca.stripe_subscription_id) {
      await gravar(licenca, 'card')
      continue
    }
    if (chaveStripe && licenca.stripe_payment_intent) naStripe.push(licenca)
  }

  if (naStripe.length === 0) return

  const stripe = new Stripe(chaveStripe!)

  for (const licenca of naStripe.slice(0, LIMITE_ENRIQUECIMENTO)) {
    try {
      const intencao = await stripe.paymentIntents.retrieve(licenca.stripe_payment_intent!, {
        expand: ['latest_charge'],
      })
      const cobranca = intencao.latest_charge as Stripe.Charge | null
      const metodo = cobranca?.payment_method_details?.type ?? intencao.payment_method_types?.[0]
      if (metodo) await gravar(licenca, metodo)
    } catch (erro) {
      // Cobrança fora do histórico, chave de teste contra dado de produção,
      // rede caindo: nada disso justifica derrubar o painel inteiro. A licença
      // fica sem método e a próxima abertura tenta de novo.
      console.error('Falha ao consultar a Stripe:', erro instanceof Error ? erro.message : erro)
    }
  }
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

  // Quem está chamando: o JWT do próprio navegador, validado pelo Supabase.
  const comoUsuario = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
  })
  const { data: sessaoAuth } = await comoUsuario.auth.getUser()
  const usuario = sessaoAuth?.user
  if (!usuario) return json({ erro: 'nao_autenticado' }, 401)

  // Compara o ID, não o e-mail: veja o comentário de ADMIN_PADRAO.
  if (!listaDeAdmins().includes(usuario.id.toLowerCase())) {
    // Sem detalhe no corpo: a resposta não conta o que existe do outro lado.
    return json({ erro: 'nao_autorizado' }, 403)
  }

  const supabase = createClient(supabaseUrl, serviceRole)

  try {
    const [usuarios, licencasResp, desafiosResp, intencoesResp] = await Promise.all([
      lerUsuarios(supabase),
      supabase.from('licenses').select('*').order('created_at', { ascending: false }),
      supabase.from('challenges').select('user_id, state, updated_at'),
      supabase.from('payment_intents').select('provider, external_id, user_id, created_at'),
    ])

    if (licencasResp.error) throw licencasResp.error
    if (desafiosResp.error) throw desafiosResp.error
    if (intencoesResp.error) throw intencoesResp.error

    const licencas = (licencasResp.data ?? []) as LinhaLicenca[]
    await completarFormaDePagamento(supabase, licencas)

    const desafios = new Map<string, ResumoDesafio>()
    for (const linha of desafiosResp.data ?? []) {
      const registro = linha as { user_id: string; state: unknown; updated_at: string | null }
      desafios.set(registro.user_id, resumirDesafio(registro.state, registro.updated_at))
    }

    return json({
      geradoEm: new Date().toISOString(),
      usuarios: usuarios.map((conta) => ({
        id: conta.id,
        email: conta.email ?? null,
        ...lerPerfil(conta.user_metadata),
        criadoEm: conta.created_at,
        ultimoLoginEm: conta.last_sign_in_at ?? null,
        confirmadoEm: conta.email_confirmed_at ?? null,
        desafio: desafios.get(conta.id) ?? null,
      })),
      licencas: licencas.map((licenca) => ({
        key: licenca.key,
        userId: licenca.user_id,
        email: licenca.customer_email,
        plano: licenca.plan,
        provedor: licenca.provider,
        formaDePagamento: licenca.payment_method,
        // Centavos no banco; a conversão fica na tela, junto com a moeda.
        valorCentavos: licenca.amount_total,
        moeda: licenca.currency,
        criadaEm: licenca.created_at,
        ultimoUsoEm: licenca.last_seen_at,
        revogadaEm: licenca.revoked_at,
        motivoRevogacao: licenca.revoked_reason,
        fimDoPeriodo: licenca.current_period_end,
        idExterno: licenca.external_id,
        assinatura: licenca.stripe_subscription_id,
      })),
      cobrancas: (intencoesResp.data ?? []).map((linha) => {
        const intencao = linha as {
          provider: string
          external_id: string
          user_id: string
          created_at: string
        }
        return {
          provedor: intencao.provider,
          idExterno: intencao.external_id,
          userId: intencao.user_id,
          criadaEm: intencao.created_at,
        }
      }),
    })
  } catch (erro) {
    console.error('Falha ao montar o painel:', erro instanceof Error ? erro.message : erro)
    return json({ erro: 'falha_na_consulta' }, 500)
  }
})
