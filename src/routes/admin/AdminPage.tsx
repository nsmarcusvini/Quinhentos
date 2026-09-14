import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '../../components/ui/Button'
import { buscarDadosAdmin, motivoDoErro, type AdminDados, type ErroAdmin } from '../../lib/admin'
import { cn } from '../../lib/cn'
import { formatDateTime } from '../../lib/date'
import { useAuth } from '../../state/AuthContext'
import { AnalyticsPanel } from './AnalyticsPanel'
import { FormularioAuth } from '../app/FormularioAuth'
import { PagamentosPanel } from './PagamentosPanel'
import { useAdminAnalytics } from './useAdminAnalytics'
import { UsuariosPanel } from './UsuariosPanel'
import { VisaoGeral } from './VisaoGeral'

type Aba = 'visao' | 'usuarios' | 'pagamentos' | 'analytics'

const ABAS: Array<{ id: Aba; rotulo: string }> = [
  { id: 'visao', rotulo: 'Visão geral' },
  { id: 'usuarios', rotulo: 'Usuários' },
  { id: 'pagamentos', rotulo: 'Pagamentos' },
  { id: 'analytics', rotulo: 'Analytics' },
]

function Moldura({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-5 py-10">
      {children}
    </main>
  )
}

/**
 * Painel de administração.
 *
 * Quem decide se você entra é a Edge Function `admin-dados`, não esta tela: a
 * rota não está escondida em lugar nenhum e um `if` no navegador é decoração.
 * O componente só traduz a resposta do servidor — 403 vira "sem permissão",
 * 401 vira formulário de login. Nenhum dado de cliente chega ao navegador
 * antes de o servidor conferir o e-mail do JWT contra a lista de admins.
 */
export default function AdminPage() {
  const { usuario, carregando: carregandoConta, sair } = useAuth()

  const [dados, setDados] = useState<AdminDados | null>(null)
  const [erro, setErro] = useState<ErroAdmin | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [aba, setAba] = useState<Aba>('visao')
  const [janela, setJanela] = useState<number | null>(30)

  const analytics = useAdminAnalytics(dados, janela)

  const carregar = useCallback(async () => {
    setCarregando(true)
    setErro(null)
    try {
      setDados(await buscarDadosAdmin())
    } catch (falha) {
      setErro(motivoDoErro(falha))
      setDados(null)
    } finally {
      setCarregando(false)
    }
  }, [])

  // Sem conta não há o que pedir ao servidor: a chamada voltaria 401 e a tela
  // seria a mesma, com uma ida à rede no meio do caminho. Derivado no render,
  // e não guardado em estado, porque é só a leitura de `usuario` em outra
  // palavra — estado aqui só criaria uma segunda verdade para sincronizar.
  const semConta = !carregandoConta && !usuario

  useEffect(() => {
    if (carregandoConta || !usuario) return
    void carregar()
  }, [usuario, carregandoConta, carregar])

  if (carregandoConta) {
    return (
      <Moldura>
        <p className="text-center text-sm text-muted">Carregando o painel…</p>
      </Moldura>
    )
  }

  if (semConta || erro === 'nao_autenticado') {
    return (
      <Moldura>
        <h1 className="text-xl font-bold text-ink">Painel</h1>
        <p className="mt-1 text-sm text-muted">Entre com a conta de administrador.</p>
        <div className="mt-6">
          <FormularioAuth modoInicial="entrar" />
        </div>
        <Link className="mt-6 text-center text-sm text-muted hover:text-ink" to="/">
          Voltar para a página inicial
        </Link>
      </Moldura>
    )
  }

  if (carregando && !dados) {
    return (
      <Moldura>
        <p className="text-center text-sm text-muted">Carregando o painel…</p>
      </Moldura>
    )
  }

  if (erro === 'nao_autorizado') {
    return (
      <Moldura>
        <h1 className="text-xl font-bold text-ink">Sem permissão</h1>
        <p className="mt-2 text-sm text-muted">
          A conta <span className="num text-ink">{usuario?.email}</span> não está na lista de
          administradores deste painel.
        </p>
        <div className="mt-6 flex flex-col gap-2">
          <Button onClick={() => void sair()}>Sair desta conta</Button>
          <Link
            className="inline-flex min-h-[44px] items-center justify-center rounded-xl text-sm text-muted hover:text-ink"
            to="/app"
          >
            Ir para o desafio
          </Link>
        </div>
      </Moldura>
    )
  }

  if (erro || !dados || !analytics) {
    return (
      <Moldura>
        <h1 className="text-xl font-bold text-ink">Não consegui carregar</h1>
        <p className="mt-2 text-sm text-muted">
          O servidor não respondeu agora. Nada foi alterado — é só tentar de novo.
        </p>
        <Button className="mt-6" variant="primary" onClick={() => void carregar()}>
          Tentar de novo
        </Button>
      </Moldura>
    )
  }

  return (
    <div className="min-h-dvh bg-bg">
      <header className="sticky top-0 z-20 border-b border-line bg-bg/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3 px-4 py-3 sm:px-6">
          <div className="min-w-0 flex-1">
            <h1 className="text-base font-bold text-ink">Painel · Desafio 500</h1>
            <p className="truncate text-xs text-muted">
              {usuario?.email} · dados de {formatDateTime(new Date(dados.geradoEm))}
            </p>
          </div>

          <Button size="sm" onClick={() => void carregar()} disabled={carregando}>
            {carregando ? 'Atualizando…' : 'Atualizar'}
          </Button>
          <Link
            className="inline-flex h-9 items-center rounded-lg px-3 text-sm text-muted hover:text-ink"
            to="/app"
          >
            Meu desafio
          </Link>
        </div>

        <nav className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-4 sm:px-6" aria-label="Seções do painel">
          {ABAS.map((opcao) => (
            <button
              key={opcao.id}
              type="button"
              onClick={() => setAba(opcao.id)}
              aria-current={aba === opcao.id ? 'page' : undefined}
              className={cn(
                'min-h-[44px] whitespace-nowrap border-b-2 px-3 text-sm transition-colors',
                aba === opcao.id
                  ? 'border-brand-500 font-semibold text-ink'
                  : 'border-transparent text-muted hover:text-ink',
              )}
            >
              {opcao.rotulo}
            </button>
          ))}
        </nav>
      </header>

      <main id="conteudo" className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
        {aba === 'visao' && <VisaoGeral dados={dados} analytics={analytics} />}
        {aba === 'usuarios' && <UsuariosPanel dados={dados} />}
        {aba === 'pagamentos' && <PagamentosPanel dados={dados} />}
        {aba === 'analytics' && (
          <AnalyticsPanel analytics={analytics} janela={janela} aoTrocarJanela={setJanela} />
        )}
      </main>
    </div>
  )
}
