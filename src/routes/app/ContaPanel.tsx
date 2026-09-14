import { Button } from '../../components/ui/Button'
import { CheckIcon } from '../../components/ui/icons'
import { cn } from '../../lib/cn'
import { useAuth } from '../../state/AuthContext'
import { useSync, type StatusSync } from '../../state/SyncContext'
import { FormularioAuth } from './FormularioAuth'

const ROTULO_SYNC: Record<StatusSync, string> = {
  desligado: 'Sem conta — nada sai deste aparelho',
  sincronizando: 'Sincronizando…',
  sincronizado: 'Progresso salvo na nuvem',
  erro: 'Não consegui sincronizar agora',
}

export function ContaPanel() {
  const { usuario, sair } = useAuth()
  const { status, sincronizarAgora } = useSync()

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
            conta — sem precisar do código de compra nem de arquivo de backup.
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
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-line bg-surface p-4">
        <p className="text-sm font-semibold text-ink">Criar conta é opcional</p>
        <p className="mt-1.5 text-xs leading-relaxed text-muted">
          Sem conta, o desafio funciona igual e nada sai do seu aparelho. Com conta, seu progresso
          fica salvo na nuvem e volta sozinho se você trocar de celular ou limpar o navegador.
        </p>
      </div>

      <FormularioAuth modoInicial="cadastrar" />
    </div>
  )
}
