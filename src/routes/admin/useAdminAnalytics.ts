import { useMemo } from 'react'
import {
  emReais,
  rotularFormaDePagamento,
  rotularPlano,
  rotularProvedor,
  situacaoDaLicenca,
  type AdminDados,
  type AdminLicenca,
  type AdminUsuario,
} from '../../lib/admin'
import { HOUSE_COUNT, TOTAL_AMOUNT } from '../../lib/constants'
import { DAY_IN_MS, startOfDay, toDayKey } from '../../lib/date'

/**
 * Todo o analytics do painel, derivado de uma resposta só.
 *
 * Mesma regra do [`useStats`](../../state/useStats.ts) do app: nada de número
 * guardado, tudo recalculado com `useMemo` a partir da fonte. Um total salvo
 * em algum lugar é um total que um dia diverge do que o gráfico mostra.
 */

export interface PontoSerie {
  /** "AAAA-MM-DD" — chave de ordenação. */
  dia: string
  /** "14/set" — o que aparece no eixo. */
  label: string
  valor: number
  acumulado: number
}

export interface Fatia {
  nome: string
  valor: number
  /** Fração do total, já pronta para `formatPercent`. */
  fracao: number
}

export interface FaixaProgresso {
  nome: string
  valor: number
}

export interface Coorte {
  /** Segunda-feira da semana de cadastro. */
  semana: string
  label: string
  contas: number
  pagantes: number
  ativos: number
  retencao: number
  conversao: number
}

export interface Destaque {
  texto: string
  tom: 'bom' | 'neutro' | 'atencao'
}

export interface AdminAnalytics {
  contas: {
    total: number
    confirmadas: number
    pendentes: number
    novasNaJanela: number
    serie: PontoSerie[]
  }
  receita: {
    bruta: number
    reembolsada: number
    liquida: number
    naJanela: number
    ticketMedio: number
    mrr: number
    serie: PontoSerie[]
  }
  funil: {
    cadastros: number
    iniciaram: number
    pagaram: number
    abandonaram: number
    taxaCheckout: number
    taxaFechamento: number
    taxaGeral: number
  }
  mix: {
    planos: Fatia[]
    provedores: Fatia[]
    formas: Fatia[]
  }
  produto: {
    comDesafio: number
    semDesafio: number
    ativos7: number
    ativos30: number
    concluiram: number
    totalGuardado: number
    mediaMarcadas: number
    medianaMarcadas: number
    progressoMedio: number
    distribuicao: FaixaProgresso[]
  }
  saude: {
    revogadas: number
    expiradas: number
    taxaReembolso: number
    expirandoEm7: number
    nuncaUsadas: number
    orfas: AdminLicenca[]
  }
  coortes: Coorte[]
  destaques: Destaque[]
}

// "14/set" em vez do "14 de set." que o Intl entrega em pt-BR: o rótulo do
// eixo repete a cada poucos pixels, e as três letras a mais fazem o Recharts
// esconder metade das marcas.
const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']

const rotuloDoDia = (dia: string): string => {
  const [, mes, data] = dia.split('-')
  return `${data}/${MESES[Number(mes) - 1]}`
}

const quandoMs = (iso: string | null): number | null => {
  if (!iso) return null
  const ms = new Date(iso).getTime()
  return Number.isNaN(ms) ? null : ms
}

/**
 * Série diária densa entre dois instantes.
 *
 * Os dias sem nada precisam existir como zero: sem eles o gráfico liga 1º de
 * setembro direto em 10 de setembro e desenha um crescimento suave onde houve
 * nove dias parados.
 */
function montarSerie(
  eventos: Array<{ em: number; valor: number }>,
  inicio: number,
  fim: number,
): PontoSerie[] {
  const porDia = new Map<string, number>()
  for (const evento of eventos) {
    if (evento.em < inicio || evento.em > fim) continue
    const dia = toDayKey(evento.em)
    porDia.set(dia, (porDia.get(dia) ?? 0) + evento.valor)
  }

  const pontos: PontoSerie[] = []
  let acumulado = 0

  // Teto de 730 pontos: dois anos de gráfico diário já é mais do que cabe na
  // tela, e protege contra uma data absurda no banco virar um laço eterno.
  for (let dia = startOfDay(inicio); dia <= fim && pontos.length < 730; dia += DAY_IN_MS) {
    const chave = toDayKey(dia)
    const valor = porDia.get(chave) ?? 0
    acumulado += valor
    pontos.push({ dia: chave, label: rotuloDoDia(chave), valor, acumulado })
  }

  return pontos
}

/** Conta ocorrências e devolve as fatias já ordenadas da maior para a menor. */
function fatiar(rotulos: string[]): Fatia[] {
  const contagem = new Map<string, number>()
  for (const rotulo of rotulos) contagem.set(rotulo, (contagem.get(rotulo) ?? 0) + 1)

  const total = rotulos.length || 1
  return [...contagem.entries()]
    .map(([nome, valor]) => ({ nome, valor, fracao: valor / total }))
    .sort((a, b) => b.valor - a.valor)
}

function mediana(valores: number[]): number {
  if (valores.length === 0) return 0
  const ordenados = [...valores].sort((a, b) => a - b)
  const meio = Math.floor(ordenados.length / 2)
  return ordenados.length % 2 === 0
    ? (ordenados[meio - 1] + ordenados[meio]) / 2
    : ordenados[meio]
}

/** Segunda-feira da semana de um instante — âncora das coortes. */
function inicioDaSemana(ms: number): number {
  const data = new Date(startOfDay(ms))
  const diaDaSemana = (data.getDay() + 6) % 7
  data.setDate(data.getDate() - diaDaSemana)
  return data.getTime()
}

/** Última atividade conhecida da pessoa: marcação, sincronia ou login. */
function ultimaAtividade(usuario: AdminUsuario): number | null {
  const candidatos = [
    usuario.desafio?.ultimaEm ?? null,
    quandoMs(usuario.desafio?.atualizadoEm ?? null),
    quandoMs(usuario.ultimoLoginEm),
  ].filter((valor): valor is number => typeof valor === 'number')

  return candidatos.length === 0 ? null : Math.max(...candidatos)
}

const FAIXAS: Array<{ nome: string; ate: number }> = [
  { nome: 'Nem começou', ate: 0 },
  { nome: 'Até 10%', ate: 0.1 },
  { nome: '10 a 25%', ate: 0.25 },
  { nome: '25 a 50%', ate: 0.5 },
  { nome: '50 a 75%', ate: 0.75 },
  { nome: '75 a 99%', ate: 0.9999 },
  { nome: 'Completou', ate: 1 },
]

/**
 * @param janelaDias Quantos dias o recorte cobre; null olha o histórico todo.
 */
export function useAdminAnalytics(dados: AdminDados | null, janelaDias: number | null) {
  return useMemo<AdminAnalytics | null>(() => {
    if (!dados) return null

    const agora = Date.now()
    const { usuarios, licencas, cobrancas } = dados

    // Começo do recorte. Sem janela, o gráfico arranca no primeiro cadastro —
    // ou hoje, quando ainda não há nenhum.
    const primeiroCadastro = usuarios.reduce<number>(
      (menor, usuario) => Math.min(menor, quandoMs(usuario.criadoEm) ?? agora),
      agora,
    )
    const inicio =
      janelaDias === null ? primeiroCadastro : startOfDay(agora - (janelaDias - 1) * DAY_IN_MS)

    // ---- Contas -----------------------------------------------------------
    const cadastros = usuarios
      .map((usuario) => quandoMs(usuario.criadoEm))
      .filter((ms): ms is number => ms !== null)

    const serieContas = montarSerie(
      cadastros.map((em) => ({ em, valor: 1 })),
      inicio,
      agora,
    )

    // ---- Receita ----------------------------------------------------------
    // Revogada é reembolso ou contestação: o dinheiro voltou. A bruta continua
    // à vista porque é ela que diz quanto o produto vendeu.
    const bruta = licencas.reduce((soma, licenca) => soma + emReais(licenca.valorCentavos), 0)
    const reembolsada = licencas
      .filter((licenca) => licenca.revogadaEm)
      .reduce((soma, licenca) => soma + emReais(licenca.valorCentavos), 0)

    const serieReceita = montarSerie(
      licencas
        .map((licenca) => ({
          em: quandoMs(licenca.criadaEm),
          valor: emReais(licenca.valorCentavos),
        }))
        .filter((evento): evento is { em: number; valor: number } => evento.em !== null),
      inicio,
      agora,
    )

    const mensaisAtivos = licencas.filter(
      (licenca) => licenca.plano === 'mensal' && situacaoDaLicenca(licenca, agora) === 'ativa',
    )
    const mrr = mensaisAtivos.reduce((soma, licenca) => soma + emReais(licenca.valorCentavos), 0)

    // ---- Funil ------------------------------------------------------------
    // Uma pessoa pode tentar pagar várias vezes; o funil conta gente, não
    // tentativa, senão a taxa de fechamento fica menor do que a realidade.
    const iniciaram = new Set(cobrancas.map((cobranca) => cobranca.userId))

    const porEmail = new Map<string, string>()
    for (const usuario of usuarios) {
      if (usuario.email) porEmail.set(usuario.email.toLowerCase(), usuario.id)
    }

    const pagantes = new Set<string>()
    const orfas: AdminLicenca[] = []
    for (const licenca of licencas) {
      // A licença pode ter sido comprada antes de existir vínculo com a conta:
      // nesse caso o e-mail do checkout é a única ponte. Sobrou sem ponte, é
      // uma compra que ninguém consegue usar — o painel precisa mostrar.
      const dono = licenca.userId ?? (licenca.email ? porEmail.get(licenca.email.toLowerCase()) : undefined)
      if (dono) pagantes.add(dono)
      else orfas.push(licenca)
    }

    const cadastrosTotais = usuarios.length
    const abandonaram = [...iniciaram].filter((id) => !pagantes.has(id)).length

    const dividir = (numerador: number, denominador: number) =>
      denominador === 0 ? 0 : numerador / denominador

    // ---- Produto ----------------------------------------------------------
    const marcadasPorUsuario = usuarios.map((usuario) => usuario.desafio?.marcadas ?? 0)
    const comDesafio = marcadasPorUsuario.filter((marcadas) => marcadas > 0).length
    const totalGuardado = usuarios.reduce(
      (soma, usuario) => soma + (usuario.desafio?.guardado ?? 0),
      0,
    )

    const distribuicao = FAIXAS.map((faixa, indice) => {
      const piso = indice === 0 ? -1 : FAIXAS[indice - 1].ate
      return {
        nome: faixa.nome,
        valor: marcadasPorUsuario.filter((marcadas) => {
          const razao = marcadas / HOUSE_COUNT
          return razao > piso && razao <= faixa.ate
        }).length,
      }
    })

    const dentroDe = (dias: number) =>
      usuarios.filter((usuario) => {
        const visto = ultimaAtividade(usuario)
        return visto !== null && agora - visto <= dias * DAY_IN_MS
      }).length

    // ---- Saúde ------------------------------------------------------------
    const revogadas = licencas.filter((licenca) => licenca.revogadaEm).length
    const expiradas = licencas.filter(
      (licenca) => situacaoDaLicenca(licenca, agora) === 'expirada',
    ).length
    const expirandoEm7 = licencas.filter((licenca) => {
      const fim = quandoMs(licenca.fimDoPeriodo)
      return fim !== null && fim > agora && fim - agora <= 7 * DAY_IN_MS
    }).length

    // ---- Coortes ----------------------------------------------------------
    // Semana de cadastro contra "ainda aparece". É o que separa produto que
    // segura gente de produto que só vende bem.
    const semanas = new Map<number, { contas: number; pagantes: number; ativos: number }>()
    for (const usuario of usuarios) {
      const criado = quandoMs(usuario.criadoEm)
      if (criado === null) continue

      const semana = inicioDaSemana(criado)
      const atual = semanas.get(semana) ?? { contas: 0, pagantes: 0, ativos: 0 }
      atual.contas += 1
      if (pagantes.has(usuario.id)) atual.pagantes += 1

      const visto = ultimaAtividade(usuario)
      if (visto !== null && agora - visto <= 30 * DAY_IN_MS) atual.ativos += 1

      semanas.set(semana, atual)
    }

    const coortes: Coorte[] = [...semanas.entries()]
      .sort((a, b) => b[0] - a[0])
      .slice(0, 12)
      .map(([semana, valores]) => ({
        semana: toDayKey(semana),
        label: rotuloDoDia(toDayKey(semana)),
        contas: valores.contas,
        pagantes: valores.pagantes,
        ativos: valores.ativos,
        retencao: dividir(valores.ativos, valores.contas),
        conversao: dividir(valores.pagantes, valores.contas),
      }))

    // ---- Mix --------------------------------------------------------------
    const mix = {
      planos: fatiar(licencas.map((licenca) => rotularPlano(licenca.plano))),
      provedores: fatiar(licencas.map((licenca) => rotularProvedor(licenca.provedor))),
      formas: fatiar(licencas.map(rotularFormaDePagamento)),
    }

    const taxaGeral = dividir(pagantes.size, cadastrosTotais)
    const taxaFechamento = dividir(pagantes.size, iniciaram.size)

    // ---- Destaques --------------------------------------------------------
    // As mesmas contas acima, ditas em uma frase. Serve para não precisar
    // interpretar seis gráficos toda vez que o painel abre.
    const destaques: Destaque[] = []

    if (cadastrosTotais > 0) {
      destaques.push({
        texto: `${pagantes.size} de ${cadastrosTotais} contas pagaram — ${(taxaGeral * 100).toFixed(1)}% de conversão de cadastro para venda.`,
        tom: taxaGeral >= 0.1 ? 'bom' : 'neutro',
      })
    }

    if (abandonaram > 0) {
      destaques.push({
        texto: `${abandonaram} ${abandonaram === 1 ? 'pessoa abriu' : 'pessoas abriram'} o checkout e não concluiu${abandonaram === 1 ? '' : 'ram'}. É o público mais quente que existe para uma lembrança por e-mail.`,
        tom: 'atencao',
      })
    }

    const formaTop = mix.formas[0]
    if (formaTop && licencas.length > 0) {
      destaques.push({
        texto: `${formaTop.nome} responde por ${(formaTop.fracao * 100).toFixed(0)}% das compras (${formaTop.valor} de ${licencas.length}).`,
        tom: 'neutro',
      })
    }

    const inativos = cadastrosTotais - comDesafio
    if (inativos > 0) {
      destaques.push({
        texto: `${inativos} ${inativos === 1 ? 'conta nunca marcou' : 'contas nunca marcaram'} uma casinha sequer — cadastro sem primeiro uso.`,
        tom: 'atencao',
      })
    }

    if (revogadas > 0) {
      destaques.push({
        texto: `${revogadas} ${revogadas === 1 ? 'licença revogada' : 'licenças revogadas'} por reembolso ou contestação: ${(dividir(revogadas, licencas.length) * 100).toFixed(1)}% das vendas.`,
        tom: 'atencao',
      })
    }

    if (orfas.length > 0) {
      destaques.push({
        texto: `${orfas.length} ${orfas.length === 1 ? 'licença paga não está' : 'licenças pagas não estão'} vinculada${orfas.length === 1 ? '' : 's'} a nenhuma conta. Quem comprou pode estar sem acesso.`,
        tom: 'atencao',
      })
    }

    if (totalGuardado > 0) {
      destaques.push({
        texto: `Somados, os desafios já guardaram R$ ${totalGuardado.toLocaleString('pt-BR')} de verdade.`,
        tom: 'bom',
      })
    }

    return {
      contas: {
        total: cadastrosTotais,
        confirmadas: usuarios.filter((usuario) => usuario.confirmadoEm).length,
        pendentes: usuarios.filter((usuario) => !usuario.confirmadoEm).length,
        novasNaJanela: cadastros.filter((em) => em >= inicio).length,
        serie: serieContas,
      },
      receita: {
        bruta,
        reembolsada,
        liquida: bruta - reembolsada,
        naJanela: serieReceita.reduce((soma, ponto) => soma + ponto.valor, 0),
        ticketMedio: dividir(bruta, licencas.length),
        mrr,
        serie: serieReceita,
      },
      funil: {
        cadastros: cadastrosTotais,
        iniciaram: iniciaram.size,
        pagaram: pagantes.size,
        abandonaram,
        taxaCheckout: dividir(iniciaram.size, cadastrosTotais),
        taxaFechamento,
        taxaGeral,
      },
      mix,
      produto: {
        comDesafio,
        semDesafio: cadastrosTotais - comDesafio,
        ativos7: dentroDe(7),
        ativos30: dentroDe(30),
        concluiram: marcadasPorUsuario.filter((marcadas) => marcadas >= HOUSE_COUNT).length,
        totalGuardado,
        mediaMarcadas: dividir(
          marcadasPorUsuario.reduce((soma, marcadas) => soma + marcadas, 0),
          cadastrosTotais,
        ),
        medianaMarcadas: mediana(marcadasPorUsuario),
        progressoMedio: dividir(totalGuardado, cadastrosTotais * TOTAL_AMOUNT),
        distribuicao,
      },
      saude: {
        revogadas,
        expiradas,
        taxaReembolso: dividir(revogadas, licencas.length),
        expirandoEm7,
        nuncaUsadas: licencas.filter((licenca) => !licenca.ultimoUsoEm).length,
        orfas,
      },
      coortes,
      destaques,
    }
  }, [dados, janelaDias])
}
