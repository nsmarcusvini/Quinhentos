import { SUPPORT_EMAIL } from '../../lib/pricing'
import { DocumentoLegal, Destaque, Secao } from './DocumentoLegal'

/** Identificação do vendedor, exigida pelo art. 31 do CDC. */
const CONTROLADOR = 'Marcus Vinicius Nascimento de Souza'
const DOCUMENTO = 'CPF 526.985.108-38'

const ATUALIZADO_EM = new Date('2026-09-14T12:00:00').getTime()

export default function Privacidade() {
  return (
    <DocumentoLegal titulo="Política de privacidade" atualizadoEm={ATUALIZADO_EM}>
      <p className="text-sm leading-relaxed text-muted">
        Esta política explica quais dados o Norte Financeiro trata, por quê, e o que você pode fazer a
        respeito. O controlador dos dados é {CONTROLADOR}, inscrito no {DOCUMENTO}, contato{' '}
        {SUPPORT_EMAIL}.
      </p>

      <Secao titulo="1. O princípio">
        <Destaque>
          As casinhas que você marca ficam <strong className="font-semibold">no seu aparelho</strong>,
          no armazenamento local do navegador. Elas só saem dali se você criar a conta opcional —
          e essa é a única finalidade de existir conta.
        </Destaque>
        <p>Sem conta, nós não temos e não conseguimos ver quanto você guardou.</p>
      </Secao>

      <Secao titulo="2. O que tratamos, e por quê">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[34rem] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-line text-xs uppercase tracking-wider text-muted">
                <th className="py-2 pr-3 font-medium">Dado</th>
                <th className="py-2 pr-3 font-medium">Para quê</th>
                <th className="py-2 font-medium">Base legal (LGPD)</th>
              </tr>
            </thead>
            <tbody className="align-top">
              <tr className="border-b border-line/60">
                <td className="py-2.5 pr-3 text-ink">E-mail da compra</td>
                <td className="py-2.5 pr-3">Emitir o código, dar suporte e processar reembolso</td>
                <td className="py-2.5">Execução de contrato (art. 7º, V)</td>
              </tr>
              <tr className="border-b border-line/60">
                <td className="py-2.5 pr-3 text-ink">Registro do pagamento</td>
                <td className="py-2.5 pr-3">Comprovar a compra e vincular a licença</td>
                <td className="py-2.5">Execução de contrato e obrigação legal</td>
              </tr>
              <tr className="border-b border-line/60">
                <td className="py-2.5 pr-3 text-ink">E-mail e senha da conta</td>
                <td className="py-2.5 pr-3">Autenticar você para sincronizar o desafio</td>
                <td className="py-2.5">Execução de contrato (art. 7º, V)</td>
              </tr>
              <tr>
                <td className="py-2.5 pr-3 text-ink">Progresso do desafio</td>
                <td className="py-2.5 pr-3">
                  Devolver seu desafio em outro aparelho — <strong className="text-ink">só com
                  conta criada</strong>
                </td>
                <td className="py-2.5">Consentimento (art. 7º, I)</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p>
          A senha é guardada com algoritmo de hash pelo nosso provedor de autenticação. Nem nós
          conseguimos lê-la.
        </p>
      </Secao>

      <Secao titulo="3. O que NÃO tratamos">
        <p>
          Não temos acesso aos dados do seu cartão: o pagamento acontece inteiramente dentro do
          Stripe, que nos informa apenas que a compra foi concluída, o valor e o e-mail.
        </p>
        <p>
          Não nos conectamos ao seu banco, não lemos extrato, não usamos Open Finance. Não vendemos
          nem compartilhamos dados para publicidade.
        </p>
      </Secao>

      <Secao titulo="4. Com quem compartilhamos">
        <p>Apenas com quem é necessário para o serviço funcionar:</p>
        <ul className="ml-4 list-disc space-y-1.5">
          <li>
            <strong className="text-ink">Stripe</strong> — processamento do pagamento
          </li>
          <li>
            <strong className="text-ink">Supabase</strong> — banco de dados e autenticação
          </li>
          <li>
            <strong className="text-ink">Vercel</strong> — hospedagem do site
          </li>
        </ul>
        <p>
          Parte da infraestrutura desses fornecedores fica fora do Brasil, o que caracteriza
          transferência internacional de dados, permitida nos termos do art. 33 da LGPD para
          execução do contrato.
        </p>
      </Secao>

      <Secao titulo="5. Cookies e medição">
        <p>
          Não usamos cookies de rastreamento nem de publicidade. O armazenamento local do navegador
          é usado para o app funcionar — guardar seu progresso, seu código e sua preferência de
          tema.
        </p>
        <p>
          Para entender o uso do site podemos utilizar uma ferramenta de estatísticas sem cookies,
          que mede páginas e ações de forma agregada e anônima, sem identificar visitantes.
        </p>
      </Secao>

      <Secao titulo="6. Por quanto tempo guardamos">
        <p>
          Dados da compra: pelo prazo necessário para suporte, garantia e obrigações fiscais.
          Dados da conta e progresso sincronizado: enquanto a conta existir.
        </p>
        <p>
          Ao excluir sua conta, o desafio sincronizado é apagado junto. O registro da compra é
          mantido pelo prazo legal, por ser comprovante de transação.
        </p>
      </Secao>

      <Secao titulo="7. Seus direitos">
        <p>
          A LGPD (art. 18) garante a você confirmação do tratamento, acesso, correção,
          anonimização, portabilidade, eliminação dos dados tratados com consentimento, informação
          sobre compartilhamento e revogação do consentimento.
        </p>
        <p>
          Para exercer qualquer um deles, escreva para {SUPPORT_EMAIL}. Respondemos no prazo legal.
        </p>
        <p>
          Dois deles você exerce sozinho, sem pedir nada: a{' '}
          <strong className="text-ink">portabilidade</strong>, em Configurações → Exportar JSON, e
          a <strong className="text-ink">eliminação local</strong>, em Configurações → Zerar o
          desafio.
        </p>
      </Secao>

      <Secao titulo="8. Segurança">
        <p>
          O acesso ao banco é restrito por políticas de linha: cada conta só alcança os próprios
          registros. A tabela de licenças não é gravável por nenhum usuário — só pelo servidor. O
          tráfego é criptografado em trânsito.
        </p>
        <p>
          Nenhum sistema é imune a incidentes. Se ocorrer algum que traga risco relevante a você,
          comunicaremos conforme o art. 48 da LGPD.
        </p>
      </Secao>

      <Secao titulo="9. Mudanças">
        <p>
          Se esta política mudar, a data no topo é atualizada e mudanças relevantes são comunicadas
          no app. Dúvidas: {SUPPORT_EMAIL}
        </p>
      </Secao>
    </DocumentoLegal>
  )
}
