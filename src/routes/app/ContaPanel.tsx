import { useId, useState } from 'react'
import { Button } from '../../components/ui/Button'
import { CheckIcon } from '../../components/ui/icons'
import { cn } from '../../lib/cn'
import { SUPPORT_EMAIL } from '../../lib/pricing'
import { useAuth, type ErroAuth } from '../../state/AuthContext'
import { useSync, type StatusSync } from '../../state/SyncContext'

type Modo = 'entrar' | 'cadastrar'

const MENSAGENS: Record<ErroAuth, string> = {
  credenciais_invalidas: 'E-mail ou senha não conferem.',
  email_ja_usado: 'Já existe conta com esse e-mail. Tente entrar.',
  senha_fraca: 'A senha precisa de pelo menos 6 caracteres.',
  email_invalido: 'Esse e-mail não parece válido.',
  confirmacao_pendente: 'Enviamos um link de confirmação para o seu e-mail.',
  indisponivel: 'Não consegui completar agora. Tente de novo em instantes.',
}

const ROTULO_SYNC: Record<StatusSync, string> = {
  desligado: 'Sem conta — nada sai deste aparelho',
  sincronizando: 'Sincronizando…',
  sincronizado: 'Progresso salvo na nuvem',
  erro: 'Não consegui sincronizar agora',
}

const inputClass =
  'h-11 w-full rounded-xl border border-line bg-surface-2 px-3 text-sm text-ink placeholder:text-muted transition-colors duration-150 focus:border-brand-500 focus:bg-surface'

export function ContaPanel() {
  const { usuario, entrar, cadastrar, sair, recuperarSenha } = useAuth()
  const { status, sincronizarAgora } = useSync()

  const emailId = useId()
  const senhaId = useId()

  const [modo, setModo] = useState<Modo>('cadastrar')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)
  const [ocupado, setOcupado] = useState(false)

  const enviar = async () => {
    setOcupado(true)
    setErro(null)
    setAviso(null)

    const resultado = modo === 'entrar' ? await entrar(email, senha) : await cadastrar(email, senha)

    setOcupado(false)
    if (!resultado.ok) {
      setErro(MENSAGENS[resultado.erro ?? 'indisponivel'])
      return
    }
    setEmail('')
    setSenha('')
  }

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
            conta — sem precisar da chave nem de arquivo de backup.
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

      <div
        role="group"
        aria-label="Entrar ou criar conta"
        className="flex gap-1 rounded-xl border border-line bg-surface-2 p-1"
      >
        {(['cadastrar', 'entrar'] as const).map((opcao) => (
          <button
            key={opcao}
            type="button"
            aria-pressed={modo === opcao}
            onClick={() => {
              setModo(opcao)
              setErro(null)
              setAviso(null)
            }}
            className={cn(
              'min-h-[40px] flex-1 rounded-lg px-3 text-sm font-medium transition-colors duration-150',
              modo === opcao ? 'bg-surface text-ink shadow-soft' : 'text-muted hover:text-ink',
            )}
          >
            {opcao === 'cadastrar' ? 'Criar conta' : 'Já tenho conta'}
          </button>
        ))}
      </div>

      <form
        className="space-y-3"
        onSubmit={(evento) => {
          evento.preventDefault()
          void enviar()
        }}
      >
        <div>
          <label htmlFor={emailId} className="text-sm font-medium text-ink">
            E-mail
          </label>
          <input
            id={emailId}
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(evento) => setEmail(evento.target.value)}
            placeholder="voce@exemplo.com"
            className={cn(inputClass, 'mt-1.5')}
          />
        </div>

        <div>
          <label htmlFor={senhaId} className="text-sm font-medium text-ink">
            Senha
          </label>
          <input
            id={senhaId}
            type="password"
            required
            minLength={6}
            autoComplete={modo === 'entrar' ? 'current-password' : 'new-password'}
            value={senha}
            onChange={(evento) => setSenha(evento.target.value)}
            placeholder="pelo menos 6 caracteres"
            className={cn(inputClass, 'mt-1.5')}
          />
        </div>

        {erro && (
          <p role="alert" className="text-sm text-danger">
            {erro}
          </p>
        )}
        {aviso && <p className="text-sm text-accent">{aviso}</p>}

        <Button type="submit" variant="primary" fullWidth disabled={ocupado}>
          {ocupado ? 'Um instante…' : modo === 'cadastrar' ? 'Criar conta' : 'Entrar'}
        </Button>
      </form>

      {modo === 'entrar' && (
        <button
          type="button"
          className="text-xs text-muted underline underline-offset-2 hover:text-ink"
          onClick={() => {
            if (!email.trim()) {
              setErro('Escreva seu e-mail acima primeiro.')
              return
            }
            void recuperarSenha(email).then(() => {
              setErro(null)
              setAviso('Se existir conta com esse e-mail, o link de redefinição chega nele.')
            })
          }}
        >
          Esqueci minha senha
        </button>
      )}

      <p className="text-xs leading-relaxed text-muted">
        Problema para entrar? Escreva para{' '}
        <a
          href={`mailto:${SUPPORT_EMAIL}`}
          className="text-ink underline underline-offset-2 hover:text-accent"
        >
          {SUPPORT_EMAIL}
        </a>
        .
      </p>

    </div>
  )
}
