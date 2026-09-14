import { useMemo, useState } from 'react'
import { Button } from '../../components/ui/Button'
import {
  emReais,
  rotularFormaDePagamento,
  rotularPlano,
  rotularProvedor,
  situacaoDaLicenca,
  type AdminDados,
} from '../../lib/admin'
import { formatDate, formatDateTime } from '../../lib/date'
import { downloadCsv, nomeComData } from '../../lib/download'
import { formatCurrency, formatInteger } from '../../lib/format'
import { Badge, Celula, Kpi, Secao, Tabela, Vazio } from './AdminUi'

type Filtro = 'todas' | 'ativas' | 'revogadas' | 'mensais' | 'orfas'

const FILTROS: Array<{ id: Filtro; rotulo: string }> = [
  { id: 'todas', rotulo: 'Todas' },
  { id: 'ativas', rotulo: 'Ativas' },
  { id: 'mensais', rotulo: 'Assinaturas' },
  { id: 'revogadas', rotulo: 'Revogadas' },
  { id: 'orfas', rotulo: 'Não resgatadas' },
]

/**
 * O que entrou, por quem e por qual meio.
 *
 * Uma licença é uma venda: a tabela `licenses` só ganha linha quando o gateway
 * confirma o pagamento. Por isso ela serve como extrato — e o filtro "não
 * resgatadas" existe porque uma venda sem `user_id` é dinheiro recebido de
 * alguém que ainda não vinculou a chave a uma conta.
 */
export function PagamentosPanel({ dados }: { dados: AdminDados }) {
  const [filtro, setFiltro] = useState<Filtro>('todas')

  const enriquecidas = useMemo(() => {
    const emails = new Map<string, string>()
    for (const usuario of dados.usuarios) {
      if (usuario.email) emails.set(usuario.id, usuario.email)
    }

    return dados.licencas.map((licenca) => ({
      licenca,
      situacao: situacaoDaLicenca(licenca),
      // O e-mail do checkout pode diferir do e-mail da conta; quando existe
      // conta vinculada, ela é a verdade — é por ela que a pessoa entra.
      email: (licenca.userId ? emails.get(licenca.userId) : null) ?? licenca.email ?? null,
      valor: emReais(licenca.valorCentavos),
    }))
  }, [dados])

  const visiveis = useMemo(
    () =>
      enriquecidas.filter(({ licenca, situacao }) => {
        if (filtro === 'ativas') return situacao === 'ativa'
        if (filtro === 'revogadas') return situacao === 'revogada'
        if (filtro === 'mensais') return licenca.plano === 'mensal'
        if (filtro === 'orfas') return !licenca.userId
        return true
      }),
    [enriquecidas, filtro],
  )

  const somaVisivel = visiveis.reduce((soma, item) => soma + item.valor, 0)

  const exportar = () => {
    downloadCsv(nomeComData('pagamentos-desafio500'), [
      [
        'data',
        'email',
        'plano',
        'forma de pagamento',
        'provedor',
        'valor (R$)',
        'moeda',
        'situacao',
        'chave',
        'id externo',
        'assinatura',
        'fim do periodo',
        'revogada em',
        'motivo',
      ],
      ...visiveis.map(({ licenca, situacao, email, valor }) => [
        licenca.criadaEm,
        email ?? '',
        licenca.plano,
        rotularFormaDePagamento(licenca),
        licenca.provedor,
        valor.toFixed(2).replace('.', ','),
        licenca.moeda ?? '',
        situacao,
        licenca.key,
        licenca.idExterno,
        licenca.assinatura ?? '',
        licenca.fimDoPeriodo ?? '',
        licenca.revogadaEm ?? '',
        licenca.motivoRevogacao ?? '',
      ]),
    ])
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi
          rotulo="Vendas"
          valor={formatInteger(dados.licencas.length)}
          dica="licenças já emitidas"
        />
        <Kpi
          rotulo="Faturado"
          valor={formatCurrency(enriquecidas.reduce((soma, item) => soma + item.valor, 0))}
          dica="soma de tudo que entrou"
        />
        <Kpi
          rotulo="Devolvido"
          valor={formatCurrency(
            enriquecidas
              .filter((item) => item.situacao === 'revogada')
              .reduce((soma, item) => soma + item.valor, 0),
          )}
          dica="reembolsos e contestações"
          tom="atencao"
        />
        <Kpi
          rotulo="Assinaturas ativas"
          valor={formatInteger(
            enriquecidas.filter(
              (item) => item.licenca.plano === 'mensal' && item.situacao === 'ativa',
            ).length,
          )}
          dica="cobram de novo no fim do período"
        />
      </div>

      <Secao
        titulo={`Pagamentos (${formatInteger(visiveis.length)} · ${formatCurrency(somaVisivel)})`}
        descricao="Cada linha é uma compra confirmada pelo gateway."
        acao={
          <Button size="sm" onClick={exportar} disabled={visiveis.length === 0}>
            Exportar CSV
          </Button>
        }
      >
        <div className="flex flex-wrap gap-2">
          {FILTROS.map((opcao) => (
            <Button
              key={opcao.id}
              size="sm"
              variant={filtro === opcao.id ? 'primary' : 'secondary'}
              onClick={() => setFiltro(opcao.id)}
              aria-pressed={filtro === opcao.id}
            >
              {opcao.rotulo}
            </Button>
          ))}
        </div>

        {visiveis.length === 0 ? (
          <Vazio>Nenhum pagamento nesse filtro.</Vazio>
        ) : (
          <Tabela
            cabecalho={[
              'Data',
              'Cliente',
              'Plano',
              'Forma de pagamento',
              'Valor',
              'Situação',
              'Chave',
              'Último uso',
            ]}
          >
            {visiveis.map(({ licenca, situacao, email, valor }) => (
              <tr key={licenca.key} className="hover:bg-surface-2/60">
                <Celula className="text-muted">
                  {formatDate(new Date(licenca.criadaEm))}
                </Celula>

                <Celula>
                  <span className="font-medium text-ink">{email ?? '—'}</span>
                  {!licenca.userId && (
                    <span className="ml-2 text-xs text-danger">chave não resgatada</span>
                  )}
                </Celula>

                <Celula>{rotularPlano(licenca.plano)}</Celula>

                <Celula>
                  {rotularFormaDePagamento(licenca)}
                  <span className="ml-1.5 text-xs text-muted">
                    via {rotularProvedor(licenca.provedor)}
                  </span>
                </Celula>

                <Celula className="num">{formatCurrency(valor)}</Celula>

                <Celula>
                  {situacao === 'ativa' ? (
                    <Badge tom="bom">Ativa</Badge>
                  ) : situacao === 'revogada' ? (
                    <Badge tom="atencao">{licenca.motivoRevogacao ?? 'Revogada'}</Badge>
                  ) : (
                    <Badge tom="atencao">Expirada</Badge>
                  )}
                  {licenca.fimDoPeriodo && situacao === 'ativa' && (
                    <span className="ml-2 text-xs text-muted">
                      até {formatDate(new Date(licenca.fimDoPeriodo))}
                    </span>
                  )}
                </Celula>

                <Celula className="num text-muted">{licenca.key}</Celula>

                <Celula className="text-muted">
                  {licenca.ultimoUsoEm ? formatDateTime(new Date(licenca.ultimoUsoEm)) : 'nunca'}
                </Celula>
              </tr>
            ))}
          </Tabela>
        )}
      </Secao>
    </div>
  )
}
