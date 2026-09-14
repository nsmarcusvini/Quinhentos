import { Suspense, lazy } from 'react'
import { Button } from '../../components/ui/Button'
import { analyticsAtivo } from '../../lib/analytics'
import { cn } from '../../lib/cn'
import { TOTAL_AMOUNT } from '../../lib/constants'
import { formatCurrency, formatCurrencyCompact, formatInteger, formatPercent } from '../../lib/format'
import { Kpi, Secao, Vazio } from './AdminUi'
import type { AdminAnalytics, Destaque } from './useAdminAnalytics'

const AdminCharts = {
  SerieArea: lazy(() => import('./AdminCharts').then((m) => ({ default: m.SerieArea }))),
  BarrasCategoria: lazy(() => import('./AdminCharts').then((m) => ({ default: m.BarrasCategoria }))),
  Rosca: lazy(() => import('./AdminCharts').then((m) => ({ default: m.Rosca }))),
}

function Placeholder({ alto = 'h-56' }: { alto?: string }) {
  return <div className={cn('animate-pulse rounded-xl bg-surface-2', alto)} aria-hidden />
}

function Cartao({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-4">
      <p className="mb-3 text-xs uppercase tracking-wider text-muted">{titulo}</p>
      {children}
    </div>
  )
}

const TONS_DESTAQUE: Record<Destaque['tom'], string> = {
  bom: 'border-brand-500/30 bg-brand-500/10',
  atencao: 'border-danger/30 bg-danger/5',
  neutro: 'border-line bg-surface',
}

/**
 * Degraus do funil como barras proporcionais.
 *
 * Cada barra é medida contra o topo, não contra o degrau anterior: é assim que
 * a perda fica visível de relance. Um funil desenhado passo a passo mostra
 * sempre barras parecidas, mesmo quando 95% caiu no caminho.
 */
function Funil({ funil }: { funil: AdminAnalytics['funil'] }) {
  const degraus = [
    { rotulo: 'Criaram conta', valor: funil.cadastros, tom: 'bg-brand-500' },
    { rotulo: 'Abriram o checkout', valor: funil.iniciaram, tom: 'bg-brand-400' },
    { rotulo: 'Pagaram', valor: funil.pagaram, tom: 'bg-accent' },
  ]
  const topo = Math.max(funil.cadastros, 1)

  return (
    <div className="space-y-3">
      {degraus.map((degrau) => (
        <div key={degrau.rotulo}>
          <div className="flex items-baseline justify-between text-sm">
            <span className="text-ink">{degrau.rotulo}</span>
            <span className="num text-muted">
              {formatInteger(degrau.valor)} · {formatPercent(degrau.valor / topo)}
            </span>
          </div>
          <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-surface-2">
            <div
              className={cn('h-full rounded-full', degrau.tom)}
              style={{ width: `${Math.max((degrau.valor / topo) * 100, degrau.valor > 0 ? 2 : 0)}%` }}
            />
          </div>
        </div>
      ))}

      <dl className="grid grid-cols-3 gap-2 border-t border-line pt-3 text-center">
        <div>
          <dt className="text-xs text-muted">Cadastro → checkout</dt>
          <dd className="num text-sm font-semibold text-ink">{formatPercent(funil.taxaCheckout)}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted">Checkout → pago</dt>
          <dd className="num text-sm font-semibold text-ink">
            {formatPercent(funil.taxaFechamento)}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-muted">Ponta a ponta</dt>
          <dd className="num text-sm font-semibold text-accent">{formatPercent(funil.taxaGeral)}</dd>
        </div>
      </dl>
    </div>
  )
}

const JANELAS: Array<{ dias: number | null; rotulo: string }> = [
  { dias: 7, rotulo: '7 dias' },
  { dias: 30, rotulo: '30 dias' },
  { dias: 90, rotulo: '90 dias' },
  { dias: null, rotulo: 'Tudo' },
]

export function AnalyticsPanel({
  analytics,
  janela,
  aoTrocarJanela,
}: {
  analytics: AdminAnalytics
  janela: number | null
  aoTrocarJanela: (dias: number | null) => void
}) {
  const { contas, receita, funil, mix, produto, saude, coortes, destaques } = analytics
  const dominio = import.meta.env.VITE_ANALYTICS_DOMAIN

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs uppercase tracking-wider text-muted">Recorte</span>
        {JANELAS.map((opcao) => (
          <Button
            key={opcao.rotulo}
            size="sm"
            variant={janela === opcao.dias ? 'primary' : 'secondary'}
            onClick={() => aoTrocarJanela(opcao.dias)}
            aria-pressed={janela === opcao.dias}
          >
            {opcao.rotulo}
          </Button>
        ))}
      </div>

      {destaques.length > 0 && (
        <Secao titulo="O que os números estão dizendo" descricao="Leitura automática do recorte atual.">
          <ul className="grid gap-2 md:grid-cols-2">
            {destaques.map((destaque) => (
              <li
                key={destaque.texto}
                className={cn('rounded-2xl border px-4 py-3 text-sm text-ink', TONS_DESTAQUE[destaque.tom])}
              >
                {destaque.texto}
              </li>
            ))}
          </ul>
        </Secao>
      )}

      <Secao titulo="Aquisição" descricao="Contas criadas no período escolhido.">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Kpi rotulo="Contas" valor={formatInteger(contas.total)} dica="no total" />
          <Kpi
            rotulo="Novas no período"
            valor={formatInteger(contas.novasNaJanela)}
            dica={janela ? `últimos ${janela} dias` : 'desde o início'}
            tom={contas.novasNaJanela > 0 ? 'bom' : 'neutro'}
          />
          <Kpi
            rotulo="E-mail confirmado"
            valor={formatInteger(contas.confirmadas)}
            dica={`${formatInteger(contas.pendentes)} ainda não confirmaram`}
          />
          <Kpi
            rotulo="Ativos em 7 dias"
            valor={formatInteger(produto.ativos7)}
            dica={`${formatInteger(produto.ativos30)} nos últimos 30`}
          />
        </div>

        <Cartao titulo="Cadastros por dia">
          <Suspense fallback={<Placeholder />}>
            <AdminCharts.SerieArea dados={contas.serie} sufixo="conta(s)" />
          </Suspense>
        </Cartao>

        <Cartao titulo="Base acumulada">
          <Suspense fallback={<Placeholder />}>
            <AdminCharts.SerieArea dados={contas.serie} sufixo="conta(s)" acumulada />
          </Suspense>
        </Cartao>
      </Secao>

      <Secao titulo="Receita" descricao="Tudo que o gateway confirmou, em reais.">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Kpi rotulo="Faturamento" valor={formatCurrency(receita.bruta)} dica="bruto, desde sempre" />
          <Kpi
            rotulo="Líquido"
            valor={formatCurrency(receita.liquida)}
            dica={`${formatCurrency(receita.reembolsada)} devolvidos`}
            tom="bom"
          />
          <Kpi rotulo="Ticket médio" valor={formatCurrency(receita.ticketMedio)} dica="por venda" />
          <Kpi
            rotulo="Receita recorrente"
            valor={formatCurrency(receita.mrr)}
            dica="soma dos mensais ativos"
          />
        </div>

        <Cartao titulo="Receita por dia">
          <Suspense fallback={<Placeholder />}>
            <AdminCharts.SerieArea
              dados={receita.serie}
              formatar={formatCurrencyCompact}
              sufixo="no dia"
            />
          </Suspense>
        </Cartao>
      </Secao>

      <Secao
        titulo="Conversão"
        descricao="Do cadastro à venda. O checkout aberto vem de payment_intents; a venda, da licença emitida."
      >
        <div className="grid gap-4 lg:grid-cols-2">
          <Cartao titulo="Funil">
            <Funil funil={funil} />
          </Cartao>

          <div className="grid grid-cols-2 gap-3 self-start">
            <Kpi
              rotulo="Abandonaram"
              valor={formatInteger(funil.abandonaram)}
              dica="abriram o checkout e não pagaram"
              tom={funil.abandonaram > 0 ? 'atencao' : 'neutro'}
            />
            <Kpi
              rotulo="Pagantes"
              valor={formatInteger(funil.pagaram)}
              dica="contas com licença ativa ou passada"
              tom="bom"
            />
            <Kpi
              rotulo="Conversão geral"
              valor={formatPercent(funil.taxaGeral)}
              dica="cadastro → venda"
            />
            <Kpi
              rotulo="Fechamento"
              valor={formatPercent(funil.taxaFechamento)}
              dica="de quem chegou no checkout"
            />
          </div>
        </div>
      </Secao>

      <Secao titulo="Como as pessoas pagam" descricao="Mix de plano, forma de pagamento e gateway.">
        <div className="grid gap-4 md:grid-cols-3">
          <Cartao titulo="Forma de pagamento">
            <Suspense fallback={<Placeholder alto="h-44" />}>
              <AdminCharts.Rosca dados={mix.formas} />
            </Suspense>
          </Cartao>
          <Cartao titulo="Plano">
            <Suspense fallback={<Placeholder alto="h-44" />}>
              <AdminCharts.Rosca dados={mix.planos} />
            </Suspense>
          </Cartao>
          <Cartao titulo="Gateway">
            <Suspense fallback={<Placeholder alto="h-44" />}>
              <AdminCharts.Rosca dados={mix.provedores} />
            </Suspense>
          </Cartao>
        </div>
      </Secao>

      <Secao
        titulo="Uso do produto"
        descricao="O desafio de cada conta, somado. É o que diz se o app está sendo usado de verdade."
      >
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Kpi
            rotulo="Guardado pelos usuários"
            valor={formatCurrency(produto.totalGuardado)}
            dica={`de ${formatCurrencyCompact(contas.total * TOTAL_AMOUNT)} possíveis`}
            tom="bom"
          />
          <Kpi
            rotulo="Progresso médio"
            valor={formatPercent(produto.progressoMedio)}
            dica={`mediana de ${formatInteger(produto.medianaMarcadas)} casinhas`}
          />
          <Kpi
            rotulo="Começaram"
            valor={formatInteger(produto.comDesafio)}
            dica={`${formatInteger(produto.semDesafio)} nunca marcaram nada`}
          />
          <Kpi
            rotulo="Completaram"
            valor={formatInteger(produto.concluiram)}
            dica="as 500 casinhas"
            tom={produto.concluiram > 0 ? 'bom' : 'neutro'}
          />
        </div>

        <Cartao titulo="Quantas contas em cada faixa de progresso">
          <Suspense fallback={<Placeholder />}>
            <AdminCharts.BarrasCategoria dados={produto.distribuicao} />
          </Suspense>
        </Cartao>
      </Secao>

      <Secao
        titulo="Retenção por coorte"
        descricao="Cada linha é uma semana de cadastro. Ativo = marcou, sincronizou ou entrou nos últimos 30 dias."
      >
        {coortes.length === 0 ? (
          <Vazio>Ainda não há semanas com cadastro.</Vazio>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-line bg-surface">
            <table className="w-full min-w-[520px] text-left text-sm">
              <thead>
                <tr className="border-b border-line">
                  {['Semana', 'Contas', 'Ativos hoje', 'Retenção', 'Pagantes', 'Conversão'].map(
                    (coluna) => (
                      <th
                        key={coluna}
                        scope="col"
                        className="whitespace-nowrap px-3 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted"
                      >
                        {coluna}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {coortes.map((coorte) => (
                  <tr key={coorte.semana}>
                    <td className="px-3 py-2.5 text-ink">{coorte.label}</td>
                    <td className="num px-3 py-2.5 text-ink">{formatInteger(coorte.contas)}</td>
                    <td className="num px-3 py-2.5 text-ink">{formatInteger(coorte.ativos)}</td>
                    <td className="px-3 py-2.5">
                      {/* Barra no fundo da célula: compara as semanas sem
                          precisar ler seis porcentagens em sequência. */}
                      <div className="relative h-5 w-24 overflow-hidden rounded bg-surface-2">
                        <div
                          className="absolute inset-y-0 left-0 bg-brand-500/40"
                          style={{ width: `${coorte.retencao * 100}%` }}
                        />
                        <span className="num relative flex h-full items-center justify-center text-xs text-ink">
                          {formatPercent(coorte.retencao)}
                        </span>
                      </div>
                    </td>
                    <td className="num px-3 py-2.5 text-ink">{formatInteger(coorte.pagantes)}</td>
                    <td className="num px-3 py-2.5 text-muted">{formatPercent(coorte.conversao)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Secao>

      <Secao titulo="Saúde da carteira" descricao="O que merece uma olhada antes de virar problema.">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Kpi
            rotulo="Taxa de reembolso"
            valor={formatPercent(saude.taxaReembolso)}
            dica={`${formatInteger(saude.revogadas)} licença(s) revogada(s)`}
            tom={saude.taxaReembolso > 0.05 ? 'atencao' : 'neutro'}
          />
          <Kpi
            rotulo="Expiram em 7 dias"
            valor={formatInteger(saude.expirandoEm7)}
            dica="assinaturas a renovar"
            tom={saude.expirandoEm7 > 0 ? 'atencao' : 'neutro'}
          />
          <Kpi
            rotulo="Já expiradas"
            valor={formatInteger(saude.expiradas)}
            dica="período terminou sem renovar"
          />
          <Kpi
            rotulo="Chaves nunca usadas"
            valor={formatInteger(saude.nuncaUsadas)}
            dica="pagou e não entrou"
            tom={saude.nuncaUsadas > 0 ? 'atencao' : 'neutro'}
          />
        </div>

        {saude.orfas.length > 0 && (
          <div className="rounded-2xl border border-danger/30 bg-danger/5 p-4 text-sm text-ink">
            <p className="font-semibold text-danger">
              {saude.orfas.length} licença(s) sem conta vinculada
            </p>
            <p className="mt-1 text-muted">
              A compra existe, mas nenhuma conta reivindicou a chave. Quem pagou pode estar sem
              acesso — vale mandar a chave por e-mail.
            </p>
            <ul className="num mt-2 space-y-1 text-xs text-muted">
              {saude.orfas.slice(0, 8).map((licenca) => (
                <li key={licenca.key}>
                  {licenca.key} — {licenca.email ?? 'sem e-mail no checkout'}
                </li>
              ))}
            </ul>
          </div>
        )}
      </Secao>

      <Secao
        titulo="Funil da landing"
        descricao="Visitas, demo jogada e cliques no CTA acontecem antes de existir conta — esses eventos vivem no Plausible, não no banco."
      >
        <div className="rounded-2xl border border-line bg-surface p-4 text-sm">
          {analyticsAtivo() ? (
            <>
              <p className="text-ink">
                Eventos sendo enviados para <span className="num">{dominio}</span>:{' '}
                <span className="text-muted">
                  landing_view, demo_mark, calc_interact, price_view, cta_click, faq_open,
                  checkout_start, checkout_success.
                </span>
              </p>
              <a
                className="mt-3 inline-flex min-h-[44px] items-center rounded-xl border border-line bg-surface-2 px-4 font-medium text-ink hover:border-brand-500/60"
                href={`https://plausible.io/${dominio}`}
                target="_blank"
                rel="noreferrer noopener"
              >
                Abrir o painel do Plausible
              </a>
            </>
          ) : (
            <p className="text-muted">
              <span className="num">VITE_ANALYTICS_DOMAIN</span> não está configurada, então os
              eventos da landing não saem do navegador. Tudo que aparece acima vem do banco —
              conta criada para a frente.
            </p>
          )}
        </div>
      </Secao>
    </div>
  )
}
