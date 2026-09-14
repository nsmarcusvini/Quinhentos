import { useMemo, useState } from 'react'
import { Button } from '../../components/ui/Button'
import { situacaoDaLicenca, type AdminDados, type AdminLicenca } from '../../lib/admin'
import { HOUSE_COUNT } from '../../lib/constants'
import { formatDate, formatDateTime } from '../../lib/date'
import { downloadCsv, nomeComData } from '../../lib/download'
import { formatCurrencyCompact, formatInteger, formatPercent } from '../../lib/format'
import { Badge, Celula, Secao, Tabela, Vazio } from './AdminUi'

type Ordem = 'recentes' | 'progresso' | 'atividade'

/**
 * Quem são as pessoas.
 *
 * A linha junta três fontes que no banco vivem separadas: a conta em
 * `auth.users`, a licença em `licenses` e o progresso em `challenges`. Sem
 * isso o painel obrigaria a cruzar e-mail na mão para responder a pergunta
 * mais básica — "essa pessoa pagou e está usando?".
 */
export function UsuariosPanel({ dados }: { dados: AdminDados }) {
  const [busca, setBusca] = useState('')
  const [ordem, setOrdem] = useState<Ordem>('recentes')
  const [somentePagantes, setSomentePagantes] = useState(false)

  const linhas = useMemo(() => {
    // A licença acha o dono pelo user_id; quando ele não existe — compra feita
    // antes do vínculo — o e-mail do checkout é a única ponte que sobra.
    const porUsuario = new Map<string, AdminLicenca>()
    const porEmail = new Map<string, AdminLicenca>()
    for (const licenca of dados.licencas) {
      if (licenca.userId) porUsuario.set(licenca.userId, licenca)
      if (licenca.email) porEmail.set(licenca.email.toLowerCase(), licenca)
    }

    const iniciaram = new Set(dados.cobrancas.map((cobranca) => cobranca.userId))

    return dados.usuarios.map((usuario) => {
      const licenca =
        porUsuario.get(usuario.id) ??
        (usuario.email ? porEmail.get(usuario.email.toLowerCase()) : undefined) ??
        null

      const marcadas = usuario.desafio?.marcadas ?? 0

      return {
        usuario,
        licenca,
        marcadas,
        guardado: usuario.desafio?.guardado ?? 0,
        progresso: marcadas / HOUSE_COUNT,
        ultimaEm: usuario.desafio?.ultimaEm ?? null,
        tentouPagar: iniciaram.has(usuario.id),
      }
    })
  }, [dados])

  const visiveis = useMemo(() => {
    const termo = busca.trim().toLowerCase()

    const filtradas = linhas.filter((linha) => {
      if (somentePagantes && !linha.licenca) return false
      if (!termo) return true
      return (
        (linha.usuario.nome ?? '').toLowerCase().includes(termo) ||
        (linha.usuario.email ?? '').toLowerCase().includes(termo) ||
        linha.usuario.id.toLowerCase().includes(termo) ||
        (linha.licenca?.key ?? '').toLowerCase().includes(termo)
      )
    })

    const cronologica = (valor: string | null) => (valor ? new Date(valor).getTime() : 0)

    return [...filtradas].sort((a, b) => {
      if (ordem === 'progresso') return b.marcadas - a.marcadas
      if (ordem === 'atividade') return (b.ultimaEm ?? 0) - (a.ultimaEm ?? 0)
      return cronologica(b.usuario.criadoEm) - cronologica(a.usuario.criadoEm)
    })
  }, [linhas, busca, ordem, somentePagantes])

  const exportar = () => {
    downloadCsv(nomeComData('usuarios-desafio500'), [
      [
        'nome',
        'idade',
        'email',
        'id',
        'cadastro',
        'confirmado',
        'ultimo login',
        'plano',
        'forma de pagamento',
        'situacao da licenca',
        'chave',
        'casinhas marcadas',
        'guardado (R$)',
        'ultima marcacao',
      ],
      ...visiveis.map((linha) => [
        linha.usuario.nome ?? '',
        linha.usuario.idade ?? '',
        linha.usuario.email ?? '',
        linha.usuario.id,
        linha.usuario.criadoEm,
        linha.usuario.confirmadoEm ? 'sim' : 'nao',
        linha.usuario.ultimoLoginEm ?? '',
        linha.licenca?.plano ?? '',
        linha.licenca?.formaDePagamento ?? '',
        linha.licenca ? situacaoDaLicenca(linha.licenca) : 'sem licenca',
        linha.licenca?.key ?? '',
        linha.marcadas,
        linha.guardado,
        linha.ultimaEm ? new Date(linha.ultimaEm).toISOString() : '',
      ]),
    ])
  }

  return (
    <Secao
      titulo={`Usuários (${formatInteger(visiveis.length)})`}
      descricao="Conta, licença e progresso do desafio na mesma linha."
      acao={
        <Button size="sm" onClick={exportar} disabled={visiveis.length === 0}>
          Exportar CSV
        </Button>
      }
    >
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="search"
          value={busca}
          onChange={(evento) => setBusca(evento.target.value)}
          placeholder="Buscar por nome, e-mail, id ou chave"
          aria-label="Buscar usuário"
          className="min-h-[44px] flex-1 rounded-xl border border-line bg-surface px-3 text-sm text-ink placeholder:text-muted"
        />

        <select
          value={ordem}
          onChange={(evento) => setOrdem(evento.target.value as Ordem)}
          aria-label="Ordenar por"
          className="min-h-[44px] rounded-xl border border-line bg-surface px-3 text-sm text-ink"
        >
          <option value="recentes">Mais recentes</option>
          <option value="progresso">Maior progresso</option>
          <option value="atividade">Atividade recente</option>
        </select>

        <label className="flex min-h-[44px] cursor-pointer items-center gap-2 rounded-xl border border-line bg-surface px-3 text-sm text-ink">
          <input
            type="checkbox"
            checked={somentePagantes}
            onChange={(evento) => setSomentePagantes(evento.target.checked)}
            className="h-4 w-4 accent-brand-500"
          />
          Só pagantes
        </label>
      </div>

      {visiveis.length === 0 ? (
        <Vazio>Nenhuma conta bate com esse filtro.</Vazio>
      ) : (
        <Tabela
          cabecalho={[
            'Pessoa',
            'Idade',
            'Cadastro',
            'Acesso',
            'Progresso',
            'Guardado',
            'Última marcação',
            'Último login',
          ]}
        >
          {visiveis.map((linha) => {
            const situacao = linha.licenca ? situacaoDaLicenca(linha.licenca) : null

            return (
              <tr key={linha.usuario.id} className="hover:bg-surface-2/60">
                {/* Nome e e-mail na mesma célula: são a mesma pergunta ("quem
                    é?") e separá-los em duas colunas só empurraria a tabela
                    para o lado numa tela que já rola na horizontal. */}
                <Celula>
                  <span className="font-medium text-ink">
                    {linha.usuario.nome ?? linha.usuario.email ?? '—'}
                  </span>
                  {!linha.usuario.confirmadoEm && (
                    <span className="ml-2 text-xs text-muted">(não confirmou)</span>
                  )}
                  {linha.usuario.nome && (
                    <span className="block text-xs text-muted">{linha.usuario.email ?? '—'}</span>
                  )}
                </Celula>

                <Celula className="num text-muted">
                  {linha.usuario.idade === null ? '—' : `${formatInteger(linha.usuario.idade)} anos`}
                </Celula>

                <Celula className="text-muted">{formatDate(new Date(linha.usuario.criadoEm))}</Celula>

                <Celula>
                  {situacao === 'ativa' ? (
                    <Badge tom="bom">
                      {linha.licenca?.plano === 'mensal' ? 'Mensal' : 'Vitalício'}
                    </Badge>
                  ) : situacao === 'revogada' ? (
                    <Badge tom="atencao">Revogada</Badge>
                  ) : situacao === 'expirada' ? (
                    <Badge tom="atencao">Expirada</Badge>
                  ) : linha.tentouPagar ? (
                    <Badge tom="atencao">Abandonou o checkout</Badge>
                  ) : (
                    <Badge>Grátis</Badge>
                  )}
                </Celula>

                <Celula className="num">
                  {formatInteger(linha.marcadas)}
                  <span className="text-muted"> · {formatPercent(linha.progresso)}</span>
                </Celula>

                <Celula className="num">{formatCurrencyCompact(linha.guardado)}</Celula>

                <Celula className="text-muted">
                  {linha.ultimaEm ? formatDateTime(linha.ultimaEm) : '—'}
                </Celula>

                <Celula className="text-muted">
                  {linha.usuario.ultimoLoginEm
                    ? formatDateTime(new Date(linha.usuario.ultimoLoginEm))
                    : '—'}
                </Celula>
              </tr>
            )
          })}
        </Tabela>
      )}
    </Secao>
  )
}
