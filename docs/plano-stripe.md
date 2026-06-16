# Plano de Implementação — Stripe (assinatura Premium)

**Decidido em:** jun/2026
**Pré-requisito de:** submissão do app mobile na App Store (cobrança "por fora")

## Decisões de produto (travadas)

| Tema | Decisão |
|------|---------|
| Pós-trial | **Paywall total (hard)**: trial expirado sem assinatura → app bloqueado, só a tela de upgrade. |
| Preço | **Mensal R$ 14,90 + Anual R$ 149** (~2 meses grátis). Dois `price` no Stripe. |
| Família | **Assinatura do OWNER cobre toda a família.** Enforcement resolve o status via `FamilyContext` (já existente). |
| Moeda | BRL. |
| Modelo de cobrança | Stripe Checkout (assinatura). Cobrança SEMPRE fora do app iOS ("reader app"). Ver [mobile]. |

## Estado atual (o que já existe e vai ser reusado)

- `User.trialEndsAt` setado no sign-up (now + 7 dias) — `sign-up.use-case.ts`.
- `GET /users/me` é o ponto único de status do usuário — vai passar a expor o status de assinatura.
- Padrão DDD consolidado (replicar `goals/`): `controllers/ use-cases/ repositories/ dtos/ *.module.ts`.
- `PrismaService` injetável; `JwtAuthGuard` + `@CurrentUser()`; `ConfigService` global (`.env`).
- `MailService` (Resend) — `sendEmailVerificationCode`/`sendPasswordResetCode`. Padrão: falha graciosa (retorna boolean).
- `FamiliesModule` / `FamilyContextService` resolve userId → membros — reusado pelo enforcement.
- Web: `TrialBanner`, hook `useApi()`, `GET /users/me` tipado como `Profile`, página `configuracoes` com Tabs (Perfil/Segurança/Família), landing com `Pricing` (CTA → `/register`).

---

## FASE 1 — Schema (Prisma)

Adicionar ao `User`:

```prisma
enum SubscriptionStatus {
  TRIALING      // dentro do trial
  ACTIVE        // assinatura paga em dia
  PAST_DUE      // pagamento falhou, em retry
  CANCELED      // cancelada / expirada
}

model User {
  // ... campos atuais ...
  stripeCustomerId      String?            @unique @map("stripe_customer_id")
  stripeSubscriptionId  String?            @unique @map("stripe_subscription_id")
  subscriptionStatus    SubscriptionStatus @default(TRIALING) @map("subscription_status")
  currentPeriodEnd      DateTime?          @map("current_period_end") // fim do ciclo pago
}
```

- Migration nova (não tocar nas existentes).
- `subscriptionStatus` default `TRIALING` cobre usuários já existentes — junto com `trialEndsAt` que já têm.
- **Acesso premium = derivado**, não armazenado: `ACTIVE` OU (`TRIALING` e `trialEndsAt` no futuro). Função única no backend (`hasPremiumAccess(user)`).

---

## FASE 2 — Backend: módulo `billing/`

Estrutura (espelha `goals/`):

```
apps/api/src/modules/billing/
├── controllers/billing.controller.ts
├── controllers/stripe-webhook.controller.ts
├── use-cases/create-checkout-session.use-case.ts
├── use-cases/create-portal-session.use-case.ts
├── use-cases/handle-stripe-webhook.use-case.ts
├── use-cases/get-subscription-status.use-case.ts
├── services/stripe-client.service.ts        # like resend-client.service.ts
├── repositories/billing.repository.ts        # update do User c/ campos stripe
├── dtos/billing.dto.ts                        # Zod (priceId/ciclo)
└── billing.module.ts
```

**`stripe-client.service.ts`** — config-driven, igual ao Resend:
- Lê `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_MONTHLY`, `STRIPE_PRICE_YEARLY`, `STRIPE_PORTAL_RETURN_URL`, `APP_URL`.
- SDK `stripe`.

**Endpoints (todos `@UseGuards(JwtAuthGuard)` exceto o webhook):**

| Método | Rota | Use-case | O que faz |
|--------|------|----------|-----------|
| POST | `/billing/checkout` | create-checkout-session | Body `{ cycle: 'monthly'\|'yearly' }`. Cria/recupera `stripeCustomerId`, abre Checkout Session de assinatura, retorna `url`. |
| POST | `/billing/portal` | create-portal-session | Abre Stripe Billing Portal (gerenciar/cancelar), retorna `url`. |
| GET | `/billing/status` | get-subscription-status | Retorna status efetivo (considerando família — ver Fase 4). |
| POST | `/billing/webhook` | handle-stripe-webhook | **Público + verificação de assinatura Stripe.** |

**Webhook — pontos críticos:**
- **Raw body obrigatório** para validar a assinatura. NestJS por padrão faz parse JSON → configurar `rawBody` só nessa rota (ex.: `express.raw({type:'application/json'})` ou `bodyParser:false` + raw no main). NÃO quebrar o parse das outras rotas.
- Verificar `stripe.webhooks.constructEvent(rawBody, sig, STRIPE_WEBHOOK_SECRET)`.
- **Idempotência:** processar por `event.id` (ignorar repetidos). Stripe reenvia.
- Eventos a tratar:
  - `checkout.session.completed` → vincular `stripeSubscriptionId`, status `ACTIVE`, `currentPeriodEnd`.
  - `customer.subscription.updated` → sincronizar status (`ACTIVE`/`PAST_DUE`/`CANCELED`) e `currentPeriodEnd`.
  - `customer.subscription.deleted` → `CANCELED`.
  - `invoice.payment_failed` → `PAST_DUE` (+ e-mail).
  - `invoice.payment_succeeded` → `ACTIVE` + atualizar `currentPeriodEnd`.
- Mapear evento → user via `stripeCustomerId`.

Registrar `BillingModule` no `app.module.ts`.

---

## FASE 3 — Enforcement (paywall hard)

Acesso premium derivado por uma função única:

```
hasPremiumAccess(user) =
  user.subscriptionStatus === ACTIVE
  || (user.subscriptionStatus === TRIALING && trialEndsAt > now)
```

- **`PremiumGuard`** (NestJS) aplicado às rotas de escrita/uso: criar/editar transação, chat IA, etc.
  - Bloqueia leitura também? Paywall total → sim, exceto `/users/me`, `/billing/*`, `/auth/*`. Whitelist explícita.
  - Retorna `402 Payment Required` (ou `403` + código) para o front distinguir "expirado" de erro comum.
- **WhatsApp:** o `whatsapp.service` precisa checar acesso antes de registrar; se expirado, responde "Seu acesso expirou, assine em <link>" em vez de criar transação. (WhatsApp não tem como mostrar tela — manda link.)
- **Cron/alerts:** não enviar alertas/resumos a quem está `CANCELED` (evita "spam grátis").

---

## FASE 4 — Família cobre a assinatura

- O acesso efetivo de um usuário = `hasPremiumAccess(self)` **OU** `hasPremiumAccess(owner da família)`.
- `get-subscription-status` e o `PremiumGuard` resolvem via `FamilyContextService`: se o user é membro de uma família cujo OWNER é `ACTIVE`, ele tem acesso.
- Só o OWNER vê os botões de checkout/portal (membros veem "sua família tem Premium ativo").
- Cuidado: status do OWNER muda → reflete em todos os membros automaticamente (é derivado em request-time, não copiado).

---

## FASE 5 — Frontend (web)

- **`GET /users/me`** passa a incluir `subscriptionStatus`, `currentPeriodEnd` e um booleano efetivo `hasPremium` (já resolvido com família) — front não recalcula regra.
- **Nova aba "Assinatura"** em `configuracoes/page.tsx` (4ª tab):
  - Free/trial: status + botões "Assinar mensal" / "Assinar anual" → `POST /billing/checkout` → redireciona pra `url`.
  - Premium: "Plano ativo até <data>" + "Gerenciar assinatura" → `POST /billing/portal`.
  - Membro de família com OWNER premium: "Sua família tem Premium ativo" (sem botão de compra).
- **Paywall hard:** quando `GET /users/me` indicar expirado, o layout `(dashboard)` redireciona para uma tela `/assinar` (bloqueia o resto). Reaproveitar o estilo da landing `Pricing`.
- **Página de sucesso/retorno** do Checkout (`/assinar/sucesso`) que faz refetch do status.
- **Tratar `402`** no `lib/api.ts` → redirecionar para `/assinar`.
- **Landing `Pricing`:** manter CTA em `/register` (assina depois de logar). Adicionar toggle mensal/anual se quiser refletir os 2 preços.

---

## FASE 6 — E-mails de billing (Resend, já existe)

Adicionar métodos ao `MailService` (mesmo padrão, falha graciosa):
- Boas-vindas ao Premium (`checkout.session.completed`).
- Pagamento falhou / `PAST_DUE` (com link do portal).
- Assinatura cancelada.
- (Opcional) Aviso de fim de trial — hoje é só banner no app.

---

## FASE 7 — Config e operação

- `.env.example`: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_MONTHLY`, `STRIPE_PRICE_YEARLY`, `STRIPE_PORTAL_RETURN_URL`, `APP_URL`.
- Criar produtos/preços no dashboard do Stripe (test mode primeiro) → copiar os `price_id`.
- Webhook: registrar URL pública no Stripe; em dev usar `stripe listen --forward-to`.
- Testes: `stripe trigger` para cada evento; teste de idempotência (reenvio do mesmo `event.id`).

---

## Ordem de execução sugerida (PRs pequenos)

1. **PR 1 — Schema + status derivado:** migration dos campos Stripe + `hasPremiumAccess()` + `/users/me` expõe status. (Sem Stripe ainda; tudo segue funcionando, status = trial.)
2. **PR 2 — Módulo billing (checkout + portal + webhook):** integração Stripe completa, mas SEM bloquear nada ainda.
3. **PR 3 — Frontend de assinatura:** aba em Configurações + checkout/portal + página de sucesso. Já dá pra assinar de verdade.
4. **PR 4 — Família cobre assinatura:** resolução via FamilyContext.
5. **PR 5 — Enforcement (paywall hard):** PremiumGuard + WhatsApp + redirect `/assinar`. **Ativar por último**, quando o caminho de pagamento já funciona (senão tranca todo mundo sem saída).
6. **PR 6 — E-mails de billing.**

> Regra de segurança: o **enforcement (PR 5) é o último**. Ligar o paywall antes de o checkout funcionar deixaria os usuários travados sem como pagar.

## Riscos / pontos de atenção

- **Raw body do webhook** vs. parser global do Nest — fácil de quebrar; isolar.
- **Idempotência** do webhook (Stripe reenvia eventos).
- **Webhook é a fonte da verdade** do status, NÃO a resposta do checkout (que pode não chegar). Sempre confirmar via webhook.
- **Família:** status é derivado em request-time, nunca copiado entre usuários.
- **Mobile/iOS:** nunca colocar botão de compra dentro do app iOS — só web/WhatsApp. (ver plano mobile).
