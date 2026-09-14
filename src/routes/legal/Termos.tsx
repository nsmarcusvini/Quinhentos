import { formatCurrency } from '../../lib/format'
import { GUARANTEE_DAYS, PLANO_MENSAL, PLANO_VITALICIO, SUPPORT_EMAIL } from '../../lib/pricing'
import { TOTAL_AMOUNT } from '../../lib/constants'
import { DocumentoLegal, Destaque, Secao } from './DocumentoLegal'

/** Identificação do vendedor, exigida pelo art. 31 do CDC. */
const RESPONSAVEL = 'Marcus Vinicius Nascimento de Souza'
const DOCUMENTO = 'CPF 526.985.108-38'

const ATUALIZADO_EM = new Date('2026-09-14T12:00:00').getTime()

export default function Termos() {
  return (
    <DocumentoLegal titulo="Termos de uso" atualizadoEm={ATUALIZADO_EM}>
      <p className="text-sm leading-relaxed text-muted">
        Estes termos regem o uso do Desafio 500, oferecido por {RESPONSAVEL}, inscrito no{' '}
        {DOCUMENTO}. Ao comprar ou usar o app, você concorda com o que está aqui.
      </p>

      <Secao titulo="1. O que o Desafio 500 é — e o que não é">
        <p>
          O Desafio 500 é um <strong className="text-ink">marcador de progresso</strong>: 500
          casinhas numeradas de 1 a 500 que você risca conforme guarda o dinheiro por conta
          própria. Riscar todas equivale a {formatCurrency(TOTAL_AMOUNT)}.
        </p>
        <Destaque>
          O app <strong className="font-semibold">não recebe, não guarda e não movimenta o seu
          dinheiro</strong>. Não somos instituição financeira, não temos conta para você depositar
          e não nos conectamos ao seu banco. O dinheiro fica onde você decidir colocá-lo — o app só
          marca o placar.
        </Destaque>
        <p>
          Também não prestamos consultoria ou recomendação de investimento. As projeções e
          estimativas de data mostradas no app são cálculos aritméticos sobre o que você mesmo
          registrou, não promessa de resultado.
        </p>
      </Secao>

      <Secao titulo="2. Preço e acesso">
        <p>
          Existem dois planos, com o mesmo produto em ambos:
        </p>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <strong className="text-ink">Mensal</strong> — {formatCurrency(PLANO_MENSAL.preco)} por
            mês, cobrados no cartão de crédito de forma recorrente até você cancelar. A renovação é
            automática e o valor é debitado a cada período de 30 dias. O cancelamento pode ser feito
            a qualquer momento, por você mesmo, dentro do app, e evita a cobrança seguinte.
          </li>
          <li>
            <strong className="text-ink">Vitalício</strong> —{' '}
            {formatCurrency(PLANO_VITALICIO.preco)} em pagamento único, no Pix ou no cartão. Não há
            renovação nem cobrança posterior de qualquer espécie.
          </li>
        </ul>
        <p>
          O plano mensal é aceito apenas no cartão de crédito, por limitação técnica do Pix, que não
          realiza cobrança recorrente.
        </p>
        <p>
          A compra gera um código de acesso pessoal. Você pode usá-lo nos seus próprios aparelhos;
          ele não pode ser revendido, compartilhado publicamente ou distribuído.
        </p>
        <p>
          "Acesso vitalício" significa acesso pelo tempo em que o serviço existir, sem prazo de
          expiração da sua parte. Se algum dia o serviço for encerrado, avisaremos com
          antecedência razoável e o app continuará funcionando localmente no aparelho em que
          estiver instalado, com seus dados exportáveis.
        </p>
        <p>
          No plano mensal, o acesso vale até o fim do período já pago. Ao cancelar, você continua
          com acesso até essa data e não há nova cobrança. Se o pagamento falhar e não for
          regularizado, o acesso termina ao fim do período pago.
        </p>
      </Secao>

      <Secao titulo="3. Direito de arrependimento e reembolso">
        <Destaque>
          Você tem {GUARANTEE_DAYS} dias corridos, contados da contratação, para desistir e receber
          o valor integral de volta — é o direito de arrependimento do artigo 49 do Código de Defesa
          do Consumidor. Vale para os dois planos.
        </Destaque>
        <p>
          No plano mensal, além desse direito, você pode cancelar quando quiser pelo próprio app,
          sem contato com o suporte. O cancelamento interrompe as cobranças futuras; o período já
          pago segue válido até o fim.
        </p>
        <p>
          Para exercer, escreva para {SUPPORT_EMAIL} informando o e-mail usado na compra. Não
          pedimos justificativa. O estorno é feito pelo mesmo meio de pagamento, no prazo praticado
          pela operadora.
        </p>
        <p>
          Após o reembolso, o acesso é cancelado e deixa de destravar o app. Seu progresso
          registrado permanece no seu aparelho e pode ser exportado.
        </p>
      </Secao>

      <Secao titulo="4. Seus dados e o risco de perdê-los">
        <p>
          Por padrão, tudo que você marca fica apenas no armazenamento local do navegador do seu
          aparelho.
        </p>
        <Destaque>
          Sem conta e sem backup, limpar os dados do navegador ou perder o aparelho{' '}
          <strong className="font-semibold">apaga o seu progresso de forma definitiva</strong>, sem
          possibilidade de recuperação por nós. Criar a conta opcional ou exportar o backup em JSON
          é sua proteção contra isso.
        </Destaque>
      </Secao>

      <Secao titulo="5. Disponibilidade">
        <p>
          Fazemos o possível para manter o serviço no ar, mas ele é oferecido "como está", sem
          garantia de disponibilidade ininterrupta. Interrupções para manutenção, falhas de
          terceiros (hospedagem, processador de pagamento) ou indisponibilidade temporária podem
          ocorrer.
        </p>
        <p>
          Como o app funciona offline depois de instalado, uma indisponibilidade do servidor não
          impede você de continuar marcando as casinhas.
        </p>
      </Secao>

      <Secao titulo="6. Uso adequado">
        <p>
          Você se compromete a não tentar burlar o controle de acesso, não distribuir códigos de
          terceiros e não usar o serviço para fins ilícitos. O descumprimento pode levar ao
          cancelamento da licença, sem reembolso quando fora do prazo do item 3.
        </p>
      </Secao>

      <Secao titulo="7. Mudanças nestes termos">
        <p>
          Podemos atualizar estes termos. Mudanças relevantes serão comunicadas no próprio app com
          antecedência. Se você não concordar com uma mudança, pode solicitar o encerramento do uso
          — e, se estiver dentro do prazo do item 3, o reembolso.
        </p>
      </Secao>

      <Secao titulo="8. Foro">
        <p>
          Aplica-se a legislação brasileira, em especial o Código de Defesa do Consumidor. Fica
          eleito o foro do domicílio do consumidor para dirimir eventuais controvérsias.
        </p>
        <p>Dúvidas sobre estes termos: {SUPPORT_EMAIL}</p>
      </Secao>
    </DocumentoLegal>
  )
}
