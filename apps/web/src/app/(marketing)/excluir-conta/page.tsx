import type { Metadata } from "next";
import { LegalPage } from "../_components/LegalPage";

export const metadata: Metadata = {
  title: "Excluir conta — LemonFin",
  description:
    "Como excluir sua conta do LemonFin e apagar permanentemente seus dados.",
};

// Página PÚBLICA de exclusão de conta — exigida pelo Google Play (Data safety
// form pede um link web de exclusão para quem já desinstalou o app), além de
// boa prática LGPD. Precisa estar na allowlist do proxy (rota pré-login).
export default function ExcluirContaPage() {
  return (
    <LegalPage title="Excluir sua conta" updatedAt="8 de julho de 2026">
      <p>
        Você pode excluir sua conta do LemonFin — e todos os dados associados a
        ela — a qualquer momento, por qualquer um destes caminhos:
      </p>

      <h2>Pelo site</h2>
      <ol>
        <li>
          Faça login em <a href="/login">app.lemonfin.com.br</a>.
        </li>
        <li>
          Acesse <strong>Configurações → Perfil → Excluir conta</strong>.
        </li>
        <li>Confirme sua senha e a exclusão.</li>
      </ol>

      <h2>Pelo aplicativo</h2>
      <ol>
        <li>
          Abra o app e acesse <strong>Ajustes → Excluir conta</strong>.
        </li>
        <li>Confirme sua senha e a exclusão.</li>
      </ol>

      <h2>Sem acesso à conta?</h2>
      <p>
        Se você não consegue mais entrar (esqueceu a senha, trocou de e-mail),
        primeiro recupere o acesso em{" "}
        <a href="/esqueci-senha">recuperar senha</a>. Se ainda assim não
        conseguir, escreva para{" "}
        <a href="mailto:contato@lemonfin.com">contato@lemonfin.com</a> a partir
        do e-mail cadastrado, pedindo a exclusão — atendemos em até 15 dias.
      </p>

      <h2>O que é apagado</h2>
      <p>
        A exclusão é <strong>permanente e irreversível</strong> e remove:
        perfil (nome, e-mail, telefone), transações, cartões, metas, reservas,
        contas fixas, categorias personalizadas, histórico de conversa do
        WhatsApp, preferências de notificação e vínculos de família. A
        assinatura é cancelada e o cadastro no processador de pagamento é
        removido. Dados exigidos por obrigação legal (ex.: registros fiscais de
        pagamentos) podem ser retidos pelo prazo legal aplicável.
      </p>

      <p>
        Antes de excluir, você pode baixar uma cópia dos seus dados em{" "}
        <strong>Configurações → Perfil → Exportar meus dados</strong>.
      </p>
    </LegalPage>
  );
}
