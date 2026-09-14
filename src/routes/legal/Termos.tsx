import { formatCurrency } from '../../lib/format'
import { GUARANTEE_DAYS, PRICE_BRL, SUPPORT_EMAIL } from '../../lib/pricing'
import { TOTAL_AMOUNT } from '../../lib/constants'
import { DocumentoLegal, Destaque, Secao } from './DocumentoLegal'

/** Trocar por razão social e CNPJ/CPF antes de vender. */
const RESPONSAVEL = '[SEU NOME OU RAZÃO SOCIAL]'
const DOCUMENTO = '[SEU CPF OU CNPJ]'

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
          O acesso custa {formatCurrency(PRICE_BRL)} em <strong className="text-ink">pagamento
          único</strong>. Não há mensalidade, renovação automática nem cobrança posterior de
          qualquer espécie.
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
      </Secao>

      <Secao titulo="3. Direito de arrependimento e reembolso">
        <Destaque>
          Você tem {GUARANTEE_DAYS} dias corridos, contados da compra, para desistir e receber o
          valor integral de volta — é o direito de arrependimento do artigo 49 do Código de Defesa
          do Consumidor.
        </Destaque>
        <p>
          Para exercer, escreva para {SUPPORT_EMAIL} informando o e-mail usado na compra. Não
          pedimos justificativa. O estorno é feito pelo mesmo meio de pagamento, no prazo praticado
          pela operadora.
        </p>
        <p>
          Após o reembolso, o código de acesso é cancelado e deixa de destravar o app. Seu progresso
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
