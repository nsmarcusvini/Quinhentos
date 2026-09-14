import { useState } from 'react'
import { Button } from '../../components/ui/Button'
import { CheckIcon } from '../../components/ui/icons'
import { abrirPortal } from '../../lib/api'
import { cn } from '../../lib/cn'
import { formatCurrency } from '../../lib/format'
import { PLANO_MENSAL, SUPPORT_EMAIL } from '../../lib/pricing'
import { useAuth } from '../../state/AuthContext'
import { useEntitlement } from '../../state/EntitlementContext'
import { useSync, type StatusSync } from '../../state/SyncContext'
import { FormularioAuth } from './FormularioAuth'

const ROTULO_SYNC: Record<StatusSync, string> = {
  desligado: 'Sem conta — nada sai deste aparelho',
  sincronizando: 'Sincronizando…',
  sincronizado: 'Progresso salvo na nuvem',
  erro: 'Não consegui sincronizar agora',
}

const formatarData = (iso: string): string =>
  new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })

/**
 * Bloco da assinatura mensal.
 *
 * O botão leva ao portal do Stripe, onde dá para trocar o cartão, ver as
 * faturas e CANCELAR. Cobrar por mês escondendo o cancelamento atrás de um
 * e-mail de suporte é o padrão escuro clássico de assinatura — e, no Brasil,
 * problema legal, não só de reputação.
 */
function Assinatura({ expiraEm }: { expiraEm: string | null }) {
  const [abrindo, setAbrindo] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const abrir = async () => {
    setAbrindo(true)
    setErro(null)
    try {
      window.location.href = await abrirPortal()
    } catch (problema) {
      console.error('[Norte Financeiro] Falha ao abrir o portal de cobrança.', problema)
      setErro(`Não consegui abrir agora. Se precisar cancelar, escreva para ${SUPPORT_EMAIL}.`)
      setAbrindo(false)
    }
  }

  return (
    <div className="rounded-2xl border border-line bg-surface p-4">
      <p className="text-xs uppercase tracking-wider text-muted">Sua assinatura</p>
      <p className="mt-1 text-sm font-medium text-ink">
        Mensal · {formatCurrency(PLANO_MENSAL.preco)} por mês
      </p>
      {expiraEm && (
        <p className="mt-1 text-xs text-muted">Próxima cobrança em {formatarData(expiraEm)}.</p>
      )}

      <Button
        size="sm"
        variant="secondary"
        className="mt-3"
        disabled={abrindo}
        onClick={() => void abrir()}
      >
        {abrindo ? 'Abrindo…' : 'Gerenciar ou cancelar'}
      </Button>

      {erro ? (
        <p role="alert" className="mt-2 text-xs leading-relaxed text-danger">
          {erro}
        </p>
      ) : (
        <p className="mt-2 text-xs leading-relaxed text-muted">
          Trocar o cartão, ver as faturas ou cancelar. Cancelando, você continua com acesso até o
          fim do período já pago.
        </p>
      )}
    </div>
  )
}

export function ContaPanel() {
  const { usuario, sair } = useAuth()
  const { status, sincronizarAgora } = useSync()
  const { license } = useEntitlement()

  // ---------- logado ----------
  if (usuario) {
    return (
      <div className="space-y-4">
        <div className="rounded-2xl border border-brand-500/30 bg-brand-500/5 p-4">
          <p className="flex items-center gap-2 text-sm font-semibold text-ink">
            <CheckIcon width={16} height={16} strokeWidth={3} className="text-accent" />
            Conta ativa
          </p>
          <p className="mt-1 break-all text-sm text-muted">{usuario.email}</p>
        </div>

        {license?.plan === 'mensal' && <Assinatura expiraEm={license.expiresAt ?? null} />}

        <div className="rounded-2xl border border-line bg-surface p-4">
          <p className="text-xs uppercase tracking-wider text-muted">Sincronização</p>
          <p
            className={cn(
              'mt-1 text-sm font-medium',
              status === 'erro' ? 'text-danger' : 'text-ink',
            )}
          >
            {ROTULO_SYNC[status]}
          </p>
          <p className="mt-2 text-xs leading-relaxed text-muted">
            Seu desafio fica salvo na nuvem além do aparelho. Em outro celular, basta entrar na
            conta — sem precisar de arquivo de backup.
          </p>
          <Button
            size="sm"
            variant="secondary"
            className="mt-3"
            disabled={status === 'sincronizando'}
            onClick={() => void sincronizarAgora()}
          >
            Sincronizar agora
          </Button>
        </div>

        <div className="border-t border-line pt-4">
          <Button variant="ghost" onClick={() => void sair()}>
            Sair da conta
          </Button>
          <p className="mt-1 text-xs text-muted">
            Sair não apaga nada deste aparelho — o desafio continua aqui.
          </p>
        </div>
      </div>
    )
  }

  // ---------- deslogado ----------
  // Hoje inalcançável: o app inteiro exige sessão, então este painel só abre
  // com alguém logado. Fica como rede de segurança, dizendo a verdade.
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-line bg-surface p-4">
        <p className="text-sm font-semibold text-ink">Entre na sua conta</p>
        <p className="mt-1.5 text-xs leading-relaxed text-muted">
          É a conta que guarda seu acesso e seu progresso, e é por ela que o desafio volta em
          qualquer aparelho.
        </p>
      </div>

      <FormularioAuth modoInicial="entrar" />
    </div>
  )
}
