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
  // Tem customer no Stripe → pode abrir o portal de gerenciamento.
  canManage: boolean;
}

export const PRICE_LABEL: Record<BillingCycle, string> = {
  monthly: "R$ 14,90/mês",
  yearly: "R$ 149/ano",
};
