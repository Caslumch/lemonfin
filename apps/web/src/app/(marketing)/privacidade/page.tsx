import type { Metadata } from "next";
import { LegalPage } from "../_components/LegalPage";

export const metadata: Metadata = {
  title: "Política de Privacidade — LemonFin",
  description:
    "Como o LemonFin coleta, usa, compartilha e protege seus dados pessoais, em conformidade com a LGPD.",
};

// RASCUNHO — revisar com assessoria jurídica antes de tratar como definitivo.
// Baseado no tratamento real de dados do produto (não é template genérico).
export default function PrivacidadePage() {
  return (
    <LegalPage title="Política de Privacidade" updatedAt="7 de julho de 2026">
      <p>
        Esta Política de Privacidade explica como o <strong>LemonFin</strong>{" "}
        coleta, utiliza, compartilha e protege seus dados pessoais, em
        conformidade com a Lei nº 13.709/2018 (Lei Geral de Proteção de Dados —
        LGPD). Ao criar uma conta e usar o LemonFin, você concorda com as
        práticas aqui descritas.
      </p>

      <h2>1. Quem é o controlador dos seus dados</h2>
      <p>
        O controlador dos dados é <strong>Lucas Machado da Silva</strong>{" "}
        (LemonFin), inscrito no CNPJ nº 54.032.276/0001-80, com endereço na Rua
        Canal do Panamá, 519, Jardim Regina Alice, Barueri/SP, CEP 06412-160.
      </p>
      <p>
        Para qualquer solicitação relativa aos seus dados pessoais, incluindo o
        exercício dos direitos previstos na LGPD, fale conosco pelo e-mail{" "}
        <a href="mailto:contato@lemonfin.com">contato@lemonfin.com</a>.
      </p>

      <h2>2. Quais dados coletamos</h2>
      <h3>2.1. Dados que você fornece</h3>
      <ul>
        <li>
          <strong>Cadastro:</strong> nome, e-mail, telefone (WhatsApp) e senha
          (armazenada apenas de forma criptografada, nunca em texto legível).
        </li>
        <li>
          <strong>Dados financeiros que você registra:</strong> transações
          (valor, tipo, descrição, data), cartões (apelido, bandeira, limite e
          datas de fechamento/vencimento — <strong>não</strong> coletamos o
          número do cartão), contas recorrentes, metas de gasto, reservas
          (objetivos de poupança) e orçamentos.
        </li>
        <li>
          <strong>Mensagens no WhatsApp:</strong> o texto, os áudios e as fotos
          de comprovantes que você envia para registrar ou consultar suas
          finanças, além de trechos recentes da conversa (para dar continuidade
          ao atendimento).
        </li>
        <li>
          <strong>Conta compartilhada (família):</strong> ao criar ou entrar em
          uma conta compartilhada, os membros passam a visualizar os dados
          financeiros lançados naquele grupo.
        </li>
      </ul>

      <h3>2.2. Dados coletados automaticamente</h3>
      <ul>
        <li>
          <strong>Uso e autenticação:</strong> data do último acesso, cookies de
          sessão (necessários para manter você conectado) e registros técnicos
          de segurança.
        </li>
        <li>
          <strong>Assinatura:</strong> identificadores e status da assinatura
          gerados pelo Stripe (nosso processador de pagamentos). Os dados do
          cartão de crédito são inseridos diretamente no ambiente do Stripe e{" "}
          <strong>não trafegam nem são armazenados por nós</strong>.
        </li>
      </ul>
      <p>
        <strong>Não</strong> utilizamos ferramentas de analytics de produto
        (como Google Analytics, PostHog ou similares) e <strong>não</strong>{" "}
        rastreamos você para publicidade.
      </p>

      <h2>3. Para que usamos seus dados e com que base legal</h2>
      <table>
        <thead>
          <tr>
            <th>Finalidade</th>
            <th>Base legal (LGPD)</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              Criar e manter sua conta; registrar, categorizar e exibir suas
              finanças; responder no WhatsApp
            </td>
            <td>Execução de contrato (art. 7º, V)</td>
          </tr>
          <tr>
            <td>
              Interpretar suas mensagens com inteligência artificial (texto,
              áudio e comprovantes) para transformá-las em lançamentos
            </td>
            <td>Execução de contrato (art. 7º, V)</td>
          </tr>
          <tr>
            <td>Processar a cobrança da assinatura</td>
            <td>Execução de contrato (art. 7º, V)</td>
          </tr>
          <tr>
            <td>
              Enviar e-mails transacionais (verificação, redefinição de senha,
              avisos de cobrança)
            </td>
            <td>Execução de contrato / legítimo interesse (art. 7º, V e IX)</td>
          </tr>
          <tr>
            <td>Segurança, prevenção a fraude e correção de erros</td>
            <td>Legítimo interesse (art. 7º, IX)</td>
          </tr>
          <tr>
            <td>Cumprir obrigações legais e regulatórias</td>
            <td>Obrigação legal (art. 7º, II)</td>
          </tr>
        </tbody>
      </table>

      <h2>4. Com quem compartilhamos seus dados</h2>
      <p>
        Não vendemos seus dados. Compartilhamos o mínimo necessário com
        prestadores de serviço (operadores) que viabilizam o funcionamento do
        LemonFin, cada um tratando apenas os dados indicados abaixo e apenas para
        a finalidade descrita:
      </p>
      <table>
        <thead>
          <tr>
            <th>Operador</th>
            <th>Dados</th>
            <th>Finalidade</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>OpenAI</td>
            <td>
              Texto, áudio e imagens de comprovantes das suas mensagens e um
              resumo financeiro para o assistente responder
            </td>
            <td>Interpretar mensagens e alimentar o assistente de IA</td>
          </tr>
          <tr>
            <td>Stripe</td>
            <td>Nome, e-mail e identificador da conta</td>
            <td>Processamento de pagamentos e assinatura</td>
          </tr>
          <tr>
            <td>Resend</td>
            <td>Nome e e-mail</td>
            <td>Envio de e-mails transacionais</td>
          </tr>
          <tr>
            <td>WMode (gateway de WhatsApp)</td>
            <td>Número de telefone e conteúdo das mensagens</td>
            <td>Enviar e receber mensagens no WhatsApp</td>
          </tr>
          <tr>
            <td>Neon (banco de dados)</td>
            <td>Todos os dados da conta</td>
            <td>Armazenamento</td>
          </tr>
          <tr>
            <td>Sentry</td>
            <td>Identificador da conta e e-mail (em registros de erro)</td>
            <td>Monitoramento de estabilidade e correção de falhas</td>
          </tr>
        </tbody>
      </table>
      <p>
        Também poderemos compartilhar dados para cumprir obrigação legal, ordem
        judicial ou solicitação de autoridade competente.
      </p>

      <h2>5. Transferência internacional</h2>
      <p>
        Alguns operadores (por exemplo OpenAI, Stripe, Resend e Sentry) estão
        localizados fora do Brasil, principalmente nos Estados Unidos. Isso
        implica transferência internacional de dados, realizada com base na
        execução do contrato com você e nas garantias contratuais oferecidas por
        esses prestadores, conforme os arts. 33 e seguintes da LGPD.
      </p>

      <h2>6. Como protegemos seus dados</h2>
      <ul>
        <li>
          Criptografia <strong>em trânsito</strong> (TLS/HTTPS) e{" "}
          <strong>em repouso</strong> no banco de dados.
        </li>
        <li>Senhas e códigos de verificação armazenados apenas com hash.</li>
        <li>
          Autenticação em duas etapas (2FA) opcional, com segredo criptografado.
        </li>
        <li>
          Verificação de assinatura nas integrações (webhooks), limitação de
          requisições e controles de acesso.
        </li>
      </ul>
      <p>
        Nenhum sistema é 100% inviolável, mas trabalhamos continuamente para
        proteger seus dados com medidas técnicas e organizacionais adequadas.
      </p>

      <h2>7. Por quanto tempo guardamos seus dados</h2>
      <p>
        Mantemos seus dados enquanto sua conta estiver ativa. Ao excluir a conta
        (ver seção 8), removemos os dados pessoais associados a ela. Alguns
        registros podem ser retidos por prazo adicional quando necessário para
        cumprir obrigações legais, exercer direitos em processos ou por razões de
        segurança.
      </p>

      <h2>8. Seus direitos como titular</h2>
      <p>Nos termos da LGPD, você pode a qualquer momento:</p>
      <ul>
        <li>confirmar a existência de tratamento e acessar seus dados;</li>
        <li>corrigir dados incompletos, inexatos ou desatualizados;</li>
        <li>
          solicitar anonimização, bloqueio ou eliminação de dados desnecessários
          ou tratados em desconformidade;
        </li>
        <li>solicitar a portabilidade dos dados;</li>
        <li>
          revogar o consentimento e solicitar a exclusão da conta e dos dados.
        </li>
      </ul>
      <p>
        Você pode <strong>excluir sua conta e seus dados</strong> diretamente nas
        Configurações do aplicativo. A exclusão remove seus dados pessoais e
        cancela a assinatura ativa. Para os demais direitos, escreva para{" "}
        <a href="mailto:contato@lemonfin.com">contato@lemonfin.com</a>.
      </p>

      <h2>9. Público e idade mínima</h2>
      <p>
        O LemonFin é destinado a maiores de 18 anos. Não coletamos
        intencionalmente dados de crianças e adolescentes. Se identificarmos esse
        tipo de dado sem a devida base legal, tomaremos as medidas para eliminá-lo.
      </p>

      <h2>10. Alterações desta Política</h2>
      <p>
        Podemos atualizar esta Política periodicamente. Alterações relevantes
        serão comunicadas pelos nossos canais. A data da última atualização está
        indicada no topo desta página.
      </p>

      <div className="lf-legal-note">
        Documento em versão inicial, pendente de revisão por assessoria jurídica.
        Em caso de dúvida sobre o tratamento dos seus dados, fale conosco em{" "}
        <a href="mailto:contato@lemonfin.com">contato@lemonfin.com</a>.
      </div>
    </LegalPage>
  );
}
