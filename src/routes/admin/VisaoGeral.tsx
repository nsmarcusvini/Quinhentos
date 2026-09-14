import {
  emReais,
  rotularFormaDePagamento,
  rotularPlano,
  situacaoDaLicenca,
  type AdminDados,
} from '../../lib/admin'
import { cn } from '../../lib/cn'
import { formatDate, formatDateTime } from '../../lib/date'
import { formatCurrency, formatInteger, formatPercent } from '../../lib/format'
import { Badge, Kpi, Secao, Vazio } from './AdminUi'
import type { AdminAnalytics } from './useAdminAnalytics'

const TONS: Record<string, string> = {
  bom: 'border-brand-500/30 bg-brand-500/10',
  atencao: 'border-danger/30 bg-danger/5',
  neutro: 'border-line bg-surface',
}

/**
 * A primeira tela: o essencial sem precisar escolher recorte nem filtro.
 *
 * Deliberadamente curta. O que cabe aqui é o que se olha todo dia — quanto
 * entrou, quem chegou, o que está pegando fogo. O resto tem aba própria.
 */
export function VisaoGeral({
  dados,
  analytics,
}: {
  dados: AdminDados
  analytics: AdminAnalytics
}) {
  const { contas, receita, funil, produto, destaques } = analytics

  const ultimosCadastros = [...dados.usuarios]
    .sort((a, b) => new Date(b.criadoEm).getTime() - new Date(a.criadoEm).getTime())
    .slice(0, 6)

  // Já vem ordenada por data do servidor; o slice é só o corte da tela.
  const ultimasVendas = dados.licencas.slice(0, 6)

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi rotulo="Faturamento" valor={formatCurrency(receita.liquida)} dica="líquido de reembolsos" tom="bom" />
        <Kpi rotulo="Vendas" valor={formatInteger(dados.licencas.length)} dica={`ticket de ${formatCurrency(receita.ticketMedio)}`} />
        <Kpi rotulo="Contas" valor={formatInteger(contas.total)} dica={`${formatInteger(contas.novasNaJanela)} no recorte atual`} />
        <Kpi rotulo="Conversão" valor={formatPercent(funil.taxaGeral)} dica="cadastro → venda" />
        <Kpi rotulo="Ativos em 7 dias" valor={formatInteger(produto.ativos7)} dica="marcaram, sincronizaram ou entraram" />
        <Kpi rotulo="Receita recorrente" valor={formatCurrency(receita.mrr)} dica="mensais ativos" />
        <Kpi rotulo="Guardado no total" valor={formatCurrency(produto.totalGuardado)} dica="somando todos os desafios" />
        <Kpi
          rotulo="Abandonos no checkout"
          valor={formatInteger(funil.abandonaram)}
          dica="abriram e não pagaram"
          tom={funil.abandonaram > 0 ? 'atencao' : 'neutro'}
        />
      </div>

      {destaques.length > 0 && (
        <Secao titulo="Destaques">
          <ul className="grid gap-2 md:grid-cols-2">
            {destaques.slice(0, 4).map((destaque) => (
              <li
                key={destaque.texto}
                className={cn('rounded-2xl border px-4 py-3 text-sm text-ink', TONS[destaque.tom])}
              >
                {destaque.texto}
              </li>
            ))}
          </ul>
        </Secao>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Secao titulo="Últimas vendas">
          {ultimasVendas.length === 0 ? (
            <Vazio>Nenhuma venda ainda.</Vazio>
          ) : (
            <ul className="divide-y divide-line rounded-2xl border border-line bg-surface">
              {ultimasVendas.map((licenca) => (
                <li key={licenca.key} className="flex items-center gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-ink">
                      {licenca.email ?? licenca.key}
                    </p>
                    <p className="text-xs text-muted">
                      {rotularPlano(licenca.plano)} · {rotularFormaDePagamento(licenca)} ·{' '}
                      {formatDate(new Date(licenca.criadaEm))}
                    </p>
                  </div>
                  <span className="num shrink-0 text-sm font-semibold text-ink">
                    {formatCurrency(emReais(licenca.valorCentavos))}
                  </span>
                  {situacaoDaLicenca(licenca) !== 'ativa' && <Badge tom="atencao">inativa</Badge>}
                </li>
              ))}
            </ul>
          )}
        </Secao>

        <Secao titulo="Últimos cadastros">
          {ultimosCadastros.length === 0 ? (
            <Vazio>Nenhuma conta ainda.</Vazio>
          ) : (
            <ul className="divide-y divide-line rounded-2xl border border-line bg-surface">
              {ultimosCadastros.map((usuario) => (
                <li key={usuario.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    {/* Nome quando existe: numa lista curta de "quem chegou",
                        "Marcus" diz mais de relance que o e-mail. O e-mail
                        continua na aba de Usuários. */}
                    <p className="truncate text-sm font-medium text-ink">
                      {usuario.nome ?? usuario.email ?? usuario.id}
                    </p>
                    <p className="text-xs text-muted">
                      {formatDateTime(new Date(usuario.criadoEm))}
                      {usuario.desafio && usuario.desafio.marcadas > 0
                        ? ` · ${formatInteger(usuario.desafio.marcadas)} casinhas`
                        : ' · ainda não marcou nada'}
                    </p>
                  </div>
                  {!usuario.confirmadoEm && <Badge tom="atencao">não confirmou</Badge>}
                </li>
              ))}
            </ul>
          )}
        </Secao>
      </div>
    </div>
  )
}
