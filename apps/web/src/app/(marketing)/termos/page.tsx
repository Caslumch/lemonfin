import type { Metadata } from "next";
import { LegalPage } from "../_components/LegalPage";

export const metadata: Metadata = {
  title: "Termos de Uso — LemonFin",
  description:
    "As regras de uso do LemonFin: conta, assinatura, cancelamento, uso da inteligência artificial e responsabilidades.",
};

// RASCUNHO — revisar com assessoria jurídica antes de tratar como definitivo.
export default function TermosPage() {
  return (
    <LegalPage title="Termos de Uso" updatedAt="7 de julho de 2026">
      <p>
        Estes Termos de Uso regem o acesso e a utilização do{" "}
        <strong>LemonFin</strong>, um serviço de organização financeira pessoal
        operado por <strong>Lucas Machado da Silva</strong> (CNPJ
        54.032.276/0001-80). Ao criar uma conta ou usar o serviço, você declara
        ter lido e concordado com estes Termos e com a{" "}
        <a href="/privacidade">Política de Privacidade</a>.
      </p>

      <h2>1. O que é o LemonFin</h2>
      <p>
        O LemonFin permite registrar e consultar suas finanças por mensagens no
        WhatsApp (texto, áudio e fotos de comprovantes) e por um painel na web,
        usando inteligência artificial para interpretar e categorizar seus
        lançamentos. É uma ferramenta de organização financeira —{" "}
        <strong>não</strong> é instituição financeira, não presta consultoria de
        investimentos e não movimenta seu dinheiro.
      </p>

      <h2>2. Cadastro e conta</h2>
      <ul>
        <li>
          Você deve fornecer informações verdadeiras e manter seus dados
          atualizados. O uso é destinado a maiores de 18 anos.
        </li>
        <li>
          Você é responsável por manter a confidencialidade da sua senha e por
          toda atividade realizada na sua conta.
        </li>
        <li>
          Na conta compartilhada (família), os membros visualizam os dados
          financeiros lançados no grupo. Convide apenas pessoas de sua confiança.
        </li>
      </ul>

      <h2>3. Assinatura, período de teste e cobrança</h2>
      <ul>
        <li>
          O LemonFin é oferecido por assinatura. Os planos e valores vigentes são
          exibidos na página de planos e no momento da contratação.
        </li>
        <li>
          Oferecemos um <strong>período de teste gratuito</strong>. Ao final do
          teste, o acesso aos recursos pagos depende de uma assinatura ativa.
        </li>
        <li>
          A cobrança é recorrente e processada pelo Stripe, renovando-se
          automaticamente ao fim de cada ciclo até que você cancele.
        </li>
        <li>
          <strong>Garantia de 7 dias:</strong> se você não ficar satisfeito, pode
          solicitar o reembolso integral em até 7 dias após a primeira cobrança.
        </li>
      </ul>

      <h2>4. Cancelamento</h2>
      <p>
        Você pode cancelar a assinatura a qualquer momento pelo aplicativo. O
        cancelamento interrompe as cobranças futuras; o acesso aos recursos pagos
        permanece até o fim do ciclo já pago. Você também pode excluir sua conta
        e seus dados nas Configurações, o que cancela a assinatura ativa.
      </p>

      <h2>5. Uso da inteligência artificial</h2>
      <p>
        O LemonFin usa modelos de inteligência artificial para interpretar suas
        mensagens. Embora busquemos a maior precisão possível, a IA pode{" "}
        <strong>cometer erros</strong> de valor, categoria ou interpretação.
        Você é responsável por conferir os lançamentos e corrigi-los quando
        necessário. O LemonFin não substitui o seu próprio controle nem
        aconselhamento profissional (contábil, financeiro ou jurídico).
      </p>

      <h2>6. Uso aceitável</h2>
      <p>Ao usar o LemonFin, você concorda em não:</p>
      <ul>
        <li>
          usar o serviço para fins ilícitos ou que violem direitos de terceiros;
        </li>
        <li>
          tentar acessar contas ou dados de outras pessoas sem autorização;
        </li>
        <li>
          comprometer a segurança, sobrecarregar, sondar ou realizar engenharia
          reversa da plataforma;
        </li>
        <li>
          enviar conteúdo malicioso ou automatizar o uso de forma abusiva.
        </li>
      </ul>
      <p>
        Podemos suspender ou encerrar contas que violem estes Termos ou coloquem
        em risco o serviço ou outros usuários.
      </p>

      <h2>7. Disponibilidade do serviço</h2>
      <p>
        Empenhamo-nos para manter o LemonFin disponível e estável, mas o serviço
        é fornecido &quot;no estado em que se encontra&quot;. Podem ocorrer
        interrupções por manutenção, falhas de terceiros (por exemplo, o gateway
        de WhatsApp) ou fatores fora do nosso controle. Podemos alterar,
        suspender ou descontinuar recursos, comunicando quando cabível.
      </p>

      <h2>8. Limitação de responsabilidade</h2>
      <p>
        Na máxima extensão permitida pela lei, o LemonFin não se responsabiliza
        por decisões financeiras tomadas com base nas informações do aplicativo,
        por lançamentos incorretos que não tenham sido conferidos por você, nem
        por danos indiretos decorrentes do uso ou da indisponibilidade do
        serviço. Nada nestes Termos afasta direitos que você tenha como
        consumidor nos termos do Código de Defesa do Consumidor.
      </p>

      <h2>9. Propriedade intelectual</h2>
      <p>
        A marca, o software e os conteúdos do LemonFin pertencem ao seu titular.
        Seus dados financeiros permanecem seus — apenas os tratamos para prestar o
        serviço, conforme a <a href="/privacidade">Política de Privacidade</a>.
      </p>

      <h2>10. Alterações destes Termos</h2>
      <p>
        Podemos atualizar estes Termos periodicamente. Alterações relevantes
        serão comunicadas pelos nossos canais, e o uso continuado após a
        atualização representa concordância com a nova versão.
      </p>

      <h2>11. Lei aplicável e foro</h2>
      <p>
        Estes Termos são regidos pelas leis brasileiras. Fica eleito o foro da
        comarca de Barueri/SP para dirimir controvérsias, sem prejuízo do foro do
        domicílio do consumidor quando aplicável.
      </p>

      <div className="lf-legal-note">
        Documento em versão inicial, pendente de revisão por assessoria jurídica.
        Dúvidas: <a href="mailto:contato@lemonfin.com">contato@lemonfin.com</a>.
      </div>
    </LegalPage>
  );
}
