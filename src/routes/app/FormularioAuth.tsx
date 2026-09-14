import { useId, useRef, useState } from 'react'
import { Button } from '../../components/ui/Button'
import { cn } from '../../lib/cn'
import { SUPPORT_EMAIL } from '../../lib/pricing'
import { useAuth, type ErroAuth } from '../../state/AuthContext'

type Modo = 'entrar' | 'cadastrar'

const MENSAGENS: Record<ErroAuth, string> = {
  credenciais_invalidas: 'E-mail ou senha não conferem.',
  email_ja_usado: 'Já existe conta com esse e-mail. Tente entrar.',
  senha_fraca: 'A senha precisa de pelo menos 6 caracteres.',
  email_invalido: 'Esse e-mail não parece válido.',
  confirmacao_pendente: 'Enviamos um link de confirmação para o seu e-mail.',
  indisponivel: 'Não consegui completar agora. Tente de novo em instantes.',
}

/**
 * Limites da idade.
 *
 * O teto é sanidade contra dedo escorregado, não regra. O piso segue a LGPD,
 * que trata dado de criança com proteção própria e exige consentimento de quem
 * responde por ela (art. 14) — coisa que este formulário não tem como colher.
 * Se um dia a oferta exigir maioridade, o número a mudar é este.
 */
const IDADE_MINIMA = 13
const IDADE_MAXIMA = 120

const inputClass =
  'h-11 w-full rounded-xl border border-line bg-surface-2 px-3 text-sm text-ink placeholder:text-muted transition-colors duration-150 focus:border-brand-500 focus:bg-surface'

interface FormularioAuthProps {
  /**
   * No paywall quem chega já comprou, então "entrar" é o caminho provável.
   * Nas configurações a intenção costuma ser criar a conta.
   */
  modoInicial?: Modo
}

/**
 * Entrar ou criar conta. Compartilhado entre as Configurações e o paywall —
 * sem isto o paywall não teria caminho nenhum para login, e quem comprasse num
 * aparelho ficaria trancado do lado de fora em qualquer outro.
 */
export function FormularioAuth({ modoInicial = 'cadastrar' }: FormularioAuthProps) {
  const { entrar, cadastrar, recuperarSenha } = useAuth()

  const emailId = useId()
  const senhaId = useId()
  const nomeId = useId()
  const idadeId = useId()
  const confirmacaoId = useId()
  const erroConfirmacaoId = useId()
  const confirmacaoRef = useRef<HTMLInputElement>(null)

  const [modo, setModo] = useState<Modo>(modoInicial)
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [nome, setNome] = useState('')
  // Texto, e não número: `<input type="number">` devolve '' quando o conteúdo
  // é inválido, e guardar isso como `number` transformaria "abc" em 0 — uma
  // idade que passa em qualquer validação numérica.
  const [idade, setIdade] = useState('')
  const [confirmacao, setConfirmacao] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)
  const [ocupado, setOcupado] = useState(false)

  const senhasDiferentes = confirmacao.length > 0 && senha !== confirmacao

  const enviar = async () => {
    setErro(null)
    setAviso(null)

    // As duas checagens que só o navegador pode fazer: o servidor recebe uma
    // senha só e nunca soube que existia um campo de confirmação.
    if (modo === 'cadastrar') {
      if (senha !== confirmacao) {
        // Sem repetir a mensagem aqui em cima: o campo já mostra a dele desde
        // que a pessoa começou a digitar, e dizer a mesma coisa em dois
        // lugares faz parecer que são dois problemas. O que falta é levar o
        // cursor até lá.
        confirmacaoRef.current?.focus()
        return
      }

      const anos = Number(idade)
      if (!Number.isInteger(anos) || anos < IDADE_MINIMA || anos > IDADE_MAXIMA) {
        setErro(`Informe uma idade entre ${IDADE_MINIMA} e ${IDADE_MAXIMA} anos.`)
        return
      }
    }

    setOcupado(true)

    const resultado =
      modo === 'entrar'
        ? await entrar(email, senha)
        : await cadastrar(email, senha, { nome, idade: Number(idade) })

    setOcupado(false)
    if (!resultado.ok) {
      setErro(MENSAGENS[resultado.erro ?? 'indisponivel'])
      return
    }
    setEmail('')
    setSenha('')
    setNome('')
    setIdade('')
    setConfirmacao('')
  }

  return (
    <div className="space-y-3">
      <div
        role="group"
        aria-label="Entrar ou criar conta"
        className="flex gap-1 rounded-xl border border-line bg-surface-2 p-1"
      >
        {(['entrar', 'cadastrar'] as const).map((opcao) => (
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
            {opcao === 'entrar' ? 'Já tenho conta' : 'Criar conta'}
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
        {modo === 'cadastrar' && (
          <div>
            <label htmlFor={nomeId} className="text-sm font-medium text-ink">
              Nome
            </label>
            <input
              id={nomeId}
              type="text"
              required
              maxLength={80}
              autoComplete="name"
              value={nome}
              onChange={(evento) => setNome(evento.target.value)}
              placeholder="como você quer ser chamado"
              className={cn(inputClass, 'mt-1.5')}
            />
          </div>
        )}

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

        {modo === 'cadastrar' && (
          <div>
            <label htmlFor={idadeId} className="text-sm font-medium text-ink">
              Idade
            </label>
            <input
              id={idadeId}
              type="number"
              required
              min={IDADE_MINIMA}
              max={IDADE_MAXIMA}
              step={1}
              // Teclado numérico no celular sem depender do `type`, que o
              // Safari trata como teclado completo.
              inputMode="numeric"
              value={idade}
              onChange={(evento) => setIdade(evento.target.value)}
              placeholder="em anos"
              className={cn(inputClass, 'mt-1.5')}
            />
          </div>
        )}

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

        {modo === 'cadastrar' && (
          <div>
            <label htmlFor={confirmacaoId} className="text-sm font-medium text-ink">
              Confirmar senha
            </label>
            <input
              ref={confirmacaoRef}
              id={confirmacaoId}
              type="password"
              required
              minLength={6}
              autoComplete="new-password"
              value={confirmacao}
              onChange={(evento) => setConfirmacao(evento.target.value)}
              placeholder="repita a senha"
              // O aviso sai enquanto digita, mas só depois de haver o que
              // comparar: acusar diferença na primeira letra é ruído.
              aria-invalid={senhasDiferentes}
              aria-describedby={senhasDiferentes ? erroConfirmacaoId : undefined}
              className={cn(inputClass, 'mt-1.5')}
            />
            {senhasDiferentes && (
              <p id={erroConfirmacaoId} role="alert" className="mt-1 text-xs text-danger">
                As senhas não são iguais.
              </p>
            )}
          </div>
        )}

        {erro && (
          <p role="alert" className="text-sm text-danger">
            {erro}
          </p>
        )}
        {aviso && <p className="text-sm text-accent">{aviso}</p>}

        <Button type="submit" variant="primary" fullWidth disabled={ocupado}>
          {ocupado ? 'Um instante…' : modo === 'entrar' ? 'Entrar' : 'Criar conta'}
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
