import { useId, useRef, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '../../components/ui/Button'
import { Modal } from '../../components/ui/Modal'
import { useToast } from '../../components/ui/Toast'
import {
  DownloadIcon,
  MonitorIcon,
  MoonIcon,
  SunIcon,
  TrashIcon,
  UploadIcon,
} from '../../components/ui/icons'
import { ehAdmin } from '../../lib/admin'
import { cn } from '../../lib/cn'
import { backupFilename, downloadJson } from '../../lib/download'
import { formatInteger, pluralize } from '../../lib/format'
import { GUARANTEE_DAYS, SUPPORT_EMAIL } from '../../lib/pricing'
import { useAuth } from '../../state/AuthContext'
import { useChallenge } from '../../state/ChallengeContext'
import { useEntitlement } from '../../state/EntitlementContext'
import { parseBackup } from '../../state/storage'
import type { ChallengeState, ThemePreference } from '../../state/types'

const THEMES: readonly { id: ThemePreference; label: string; Icon: typeof SunIcon }[] = [
  { id: 'light', label: 'Claro', Icon: SunIcon },
  { id: 'dark', label: 'Escuro', Icon: MoonIcon },
  { id: 'system', label: 'Automático', Icon: MonitorIcon },
]

const RESET_WORD = 'APAGAR'

function Field({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: ReactNode
}) {
  return (
    <div>
      <p className="text-sm font-medium text-ink">{label}</p>
      {hint && <p className="mt-0.5 text-xs text-muted">{hint}</p>}
      <div className="mt-2">{children}</div>
    </div>
  )
}

const inputClass =
  'h-11 w-full rounded-xl border border-line bg-surface-2 px-3 text-sm text-ink placeholder:text-muted transition-colors duration-150 focus:border-brand-500 focus:bg-surface'

export function SettingsPanel() {
  const { state, rename, setTargetDate, setTheme, replaceState, reset } = useChallenge()
  const { license } = useEntitlement()
  const { usuario } = useAuth()
  const showToast = useToast()
  const [chaveCopiada, setChaveCopiada] = useState(false)

  const nameId = useId()
  const dateId = useId()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [pendingImport, setPendingImport] = useState<ChallengeState | null>(null)
  const [resetStep, setResetStep] = useState<0 | 1 | 2>(0)
  const [resetTyped, setResetTyped] = useState('')

  const markedCount = Object.keys(state.entries).length

  const handleExport = () => {
    downloadJson(backupFilename(), state)
    showToast({
      title: 'Backup gerado',
      description: `${pluralize(markedCount, 'casinha salva', 'casinhas salvas')} no arquivo.`,
    })
  }

  const handleFile = async (file: File) => {
    try {
      const text = await file.text()
      setPendingImport(parseBackup(text))
    } catch {
      showToast({
        title: 'Não deu para ler esse arquivo',
        description: 'Escolha um backup .json gerado pelo próprio Norte Financeiro.',
      })
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const confirmImport = () => {
    if (!pendingImport) return
    replaceState(pendingImport)
    setPendingImport(null)
    showToast({ title: 'Backup restaurado', description: 'Seu desafio voltou como estava.' })
  }

  const confirmReset = () => {
    reset()
    setResetStep(0)
    setResetTyped('')
    showToast({ title: 'Desafio zerado', description: 'As 500 casinhas voltaram a ficar pendentes.' })
  }

  return (
    <div className="space-y-6">
      <Field label="Tema" hint="O automático segue a preferência do seu sistema.">
        <div role="group" aria-label="Tema do app" className="flex gap-1 rounded-xl border border-line bg-surface-2 p-1">
          {THEMES.map(({ id, label, Icon }) => {
            const active = state.theme === id
            return (
              <button
                key={id}
                type="button"
                aria-pressed={active}
                onClick={() => setTheme(id)}
                className={cn(
                  'flex min-h-[40px] flex-1 items-center justify-center gap-1.5 rounded-lg px-2 text-sm font-medium transition-colors duration-150',
                  active ? 'bg-surface text-ink shadow-soft' : 'text-muted hover:text-ink',
                )}
              >
                <Icon width={16} height={16} />
                {label}
              </button>
            )
          })}
        </div>
      </Field>

      <Field label="Nome do desafio">
        <label htmlFor={nameId} className="sr-only">
          Nome do desafio
        </label>
        <input
          id={nameId}
          type="text"
          maxLength={60}
          value={state.challengeName}
          onChange={(event) => rename(event.target.value)}
          className={inputClass}
        />
      </Field>

      <Field label="Data-alvo" hint="Opcional. Serve de referência para o seu ritmo.">
        <div className="flex gap-2">
          <label htmlFor={dateId} className="sr-only">
            Data-alvo do desafio
          </label>
          <input
            id={dateId}
            type="date"
            value={state.targetDate ?? ''}
            onChange={(event) => setTargetDate(event.target.value || null)}
            className={inputClass}
          />
          {state.targetDate && (
            <Button variant="ghost" onClick={() => setTargetDate(null)}>
              Limpar
            </Button>
          )}
        </div>
      </Field>

      <div className="border-t border-line pt-5">
        <Field
          label="Backup"
          hint="Seus dados ficam só neste aparelho. Exporte antes de trocar de celular ou limpar o navegador."
        >
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button onClick={handleExport} className="flex-1">
              <DownloadIcon width={18} height={18} />
              Exportar JSON
            </Button>
            <Button onClick={() => fileInputRef.current?.click()} className="flex-1">
              <UploadIcon width={18} height={18} />
              Importar JSON
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json,.json"
              className="sr-only"
              aria-label="Escolher arquivo de backup"
              onChange={(event) => {
                const file = event.target.files?.[0]
                if (file) void handleFile(file)
              }}
            />
          </div>
        </Field>
      </div>

      <div className="border-t border-line pt-5">
        <Field label="Zona de perigo" hint="Apaga todas as marcações deste aparelho.">
          <Button variant="danger" onClick={() => setResetStep(1)}>
            <TrashIcon width={18} height={18} />
            Zerar o desafio
          </Button>
        </Field>
      </div>

      {license && (
        <div className="border-t border-line pt-5">
          <Field
            label="Seu código de compra"
            hint="Identifica sua compra no suporte. Para entrar em outro aparelho, use sua conta."
          >
            <div className="flex gap-2">
              <p className="flex h-11 flex-1 select-all items-center rounded-xl border border-line bg-surface-2 px-3 font-mono text-sm text-ink">
                {license.key}
              </p>
              <Button
                variant="secondary"
                onClick={() => {
                  void navigator.clipboard?.writeText(license.key).then(() => {
                    setChaveCopiada(true)
                    window.setTimeout(() => setChaveCopiada(false), 2000)
                  })
                }}
              >
                {chaveCopiada ? 'Copiada!' : 'Copiar'}
              </Button>
            </div>
          </Field>
        </div>
      )}

      <div className="border-t border-line pt-5">
        <p className="text-xs uppercase tracking-wider text-muted">Sua compra</p>
        <p className="mt-2 text-xs leading-relaxed text-muted">
          {license?.plan === 'mensal'
            ? 'Assinatura mensal — cancele quando quiser em Minha conta.'
            : 'Acesso vitalício, pagamento único, sem renovação.'}{' '}
          Dúvidas ou reembolso nos primeiros {GUARANTEE_DAYS} dias:{' '}
          <a
            href={`mailto:${SUPPORT_EMAIL}`}
            className="text-ink underline underline-offset-2 transition-colors duration-150 hover:text-accent"
          >
            {SUPPORT_EMAIL}
          </a>
          .
        </p>
      </div>

      {/* O atalho só aparece para quem administra, mas quem barra o resto é o
          servidor: /admin responde 403 para qualquer outra conta. */}
      {ehAdmin(usuario?.email) && (
        <div className="border-t border-line pt-5">
          <Field label="Painel do dono" hint="Usuários, pagamentos e analytics do negócio.">
            <Link
              to="/admin"
              className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border border-line bg-surface-2 px-4 text-sm text-ink transition-colors duration-150 hover:border-brand-500/60 hover:bg-surface"
            >
              Abrir o painel
            </Link>
          </Field>
        </div>
      )}

      {/* --- diálogos ------------------------------------------------------ */}

      <Modal
        open={pendingImport !== null}
        title="Restaurar este backup?"
        description={
          pendingImport
            ? `O arquivo tem ${pluralize(
                Object.keys(pendingImport.entries).length,
                'casinha marcada',
                'casinhas marcadas',
              )}. Ele vai substituir o desafio atual, que tem ${formatInteger(markedCount)}.`
            : undefined
        }
        confirmLabel="Restaurar"
        onConfirm={confirmImport}
        onClose={() => setPendingImport(null)}
      />

      <Modal
        open={resetStep === 1}
        title="Zerar o desafio?"
        description={`Isso desmarca ${pluralize(
          markedCount,
          'casinha',
          'casinhas',
        )} e zera o seu total. O dinheiro que você já guardou continua onde está — o que some é o registro.`}
        confirmLabel="Continuar"
        destructive
        onConfirm={() => setResetStep(2)}
        onClose={() => setResetStep(0)}
      />

      <Modal
        open={resetStep === 2}
        title="Confirmação final"
        description={`Não dá para desfazer. Digite ${RESET_WORD} para liberar o botão.`}
        confirmLabel="Zerar tudo"
        destructive
        confirmDisabled={resetTyped.trim().toUpperCase() !== RESET_WORD}
        onConfirm={confirmReset}
        onClose={() => {
          setResetStep(0)
          setResetTyped('')
        }}
      >
        <input
          data-autofocus
          type="text"
          value={resetTyped}
          autoComplete="off"
          placeholder={RESET_WORD}
          aria-label={`Digite ${RESET_WORD} para confirmar`}
          onChange={(event) => setResetTyped(event.target.value)}
          className={inputClass}
        />
      </Modal>
    </div>
  )
}
