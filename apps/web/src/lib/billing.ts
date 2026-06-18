// Tipos compartilhados de billing (espelham o GET /billing/status do backend).
// Mantém uma fonte só para a aba de assinatura, a página de sucesso e o paywall.

export type SubscriptionStatus =
  | "TRIALING"
  | "ACTIVE"
  | "PAST_DUE"
  | "CANCELED";

export type BillingCycle = "monthly" | "yearly";

export interface BillingStatus {
  subscriptionStatus: SubscriptionStatus;
  currentPeriodEnd: string | null;
  trialEndsAt: string | null;
  // Acesso efetivo já derivado pelo backend — o front NÃO recalcula a regra.
  hasPremium: boolean;
  // De onde vem o acesso: própria assinatura, cobertura da família, ou nenhum.
  // 'family' → membro coberto pelo dono: não mostrar botão de compra.
  accessSource: "self" | "family" | "none";
  // Tem customer no Stripe → pode abrir o portal de gerenciamento.
  canManage: boolean;
  // Nome do dono quando o acesso vem da família (accessSource === 'family').
  familyOwnerName: string | null;
}

export const PRICE_LABEL: Record<BillingCycle, string> = {
  monthly: "R$ 14,90/mês",
  yearly: "R$ 149/ano",
};
