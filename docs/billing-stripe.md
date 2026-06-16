# Billing (Stripe) — Estado, configuração e testes

**Status:** implementado (PRs #44–#49, mergeados) e **validado em modo teste** (jun/2026).
**Paywall:** atrás da flag `BILLING_ENFORCEMENT` — **desligado por padrão** (`off`).
**Plano de implementação original:** ver `docs/plano-stripe.md`.

---

## 1. O que foi feito

Frente entregue em 6 PRs (um por etapa):

| PR | Conteúdo |
|----|----------|
| #44 | Schema + status derivado (`SubscriptionStatus`, campos Stripe no `User`, `hasPremiumAccess`) |
| #45 | Módulo `billing/` — checkout, portal e webhook |
| #46 | Frontend — aba "Assinatura" em Configurações + página `/assinar/sucesso` |
| #47 | Família cobre a assinatura (`PremiumAccessService`, acesso derivado do OWNER) |
| #48 | Enforcement — paywall hard atrás de flag (`PremiumGuard`, WhatsApp, `/assinar`, `PaywallGuard`) |
| #49 | E-mails de billing (boas-vindas / pagamento falhou / cancelamento) via Resend |

### Decisões de produto travadas
- **Pós-trial = paywall hard:** expirado sem assinar → app bloqueado, só `/assinar` e `/configuracoes`.
- **Preço:** mensal **R$ 14,90** + anual **R$ 149** (BRL).
- **Família:** assinatura do OWNER cobre todos os membros; acesso **derivado em request-time** (nunca copiado).
- **Cobrança fora do app iOS** (modelo reader app) — relevante para o futuro app mobile.

### Como o acesso é decidido
`hasPremiumAccess(user)` = `subscriptionStatus === ACTIVE` **OU** (`TRIALING` e `trialEndsAt` no futuro).
A cobertura por família é resolvida pelo `PremiumAccessService` (self → senão dono da família).
Fonte autoritativa do status no front: **`GET /billing/status`** (family-aware). O `GET /users/me` traz um `hasPremium` self-only para o banner de trial.

### Webhook é a fonte da verdade
O status NÃO vem da resposta do checkout (que pode não chegar) — vem dos eventos do webhook. Handler é **idempotente** por `event.id` e responde 200 mesmo em erro de processamento (evita retry-loop); 400 só em assinatura inválida.

---

## 2. Endpoints

| Método | Rota | Auth | O que faz |
|--------|------|------|-----------|
| POST | `/billing/checkout` | JWT | Cria Checkout Session (`{cycle: 'monthly'|'yearly'}`) → `{url}` |
| POST | `/billing/portal` | JWT | Abre o Customer Portal do Stripe → `{url}` |
| GET | `/billing/status` | JWT | Status efetivo (family-aware) + `accessSource` |
| POST | `/billing/webhook` | assinatura Stripe | Sincroniza status a partir dos eventos |

Eventos do webhook tratados: `checkout.session.completed`, `customer.subscription.created/updated/deleted`, `invoice.payment_succeeded`, `invoice.payment_failed`.

---

## 3. Configuração no Stripe (modo TESTE — feito)

- **Produto:** `LemonFin Premium` com **2 preços**:
  - Mensal R$ 14,90 → `STRIPE_PRICE_MONTHLY`
  - Anual R$ 149 → `STRIPE_PRICE_YEARLY`
- **Webhook:** endpoint `lemon-fin` → `https://lemonfin-api.onrender.com/billing/webhook`, escutando os 6 eventos acima. O signing secret (`whsec_...`) vai em `STRIPE_WEBHOOK_SECRET`.
- **Customer Portal:** ativado (Configurações → Faturamento → Portal do cliente). Necessário para `/billing/portal`.

> Os `price_id` não são secretos (vão no `.env`). As chaves `sk_...` e `whsec_...` SÃO secretas.

---

## 4. Variáveis de ambiente

Onde mora cada coisa:
- **API publicada (Render):** é quem o webhook do Stripe chama e quem cria checkout/portal → precisa de TODAS as envs de billing.
- **`.env` local:** só para rodar/testar na máquina.
- **Front (Vercel):** não precisa de chave Stripe; usa `NEXT_PUBLIC_API_URL` para falar com a API.

Envs de billing (no Render → serviço `lemonfin-api` → Environment):

```
STRIPE_SECRET_KEY=sk_test_...        # Desenvolvedores → Chaves de API (Secret key)
STRIPE_WEBHOOK_SECRET=whsec_...      # tela do webhook → "Segredo da assinatura" (olho 👁️)
STRIPE_PRICE_MONTHLY=price_...       # preço R$ 14,90/mês
STRIPE_PRICE_YEARLY=price_...        # preço R$ 149/ano
FRONTEND_URL=https://lemonfin-web.vercel.app   # CORS + success_url/cancel_url + links dos e-mails
BILLING_ENFORCEMENT=off              # off = não bloqueia ninguém; on = paywall hard ativo
RESEND_API_KEY=...                   # e-mails de billing (sem ela, loga "ausente" e segue)
```

Notas:
- **`FRONTEND_URL` é dupla função:** libera o CORS para o front E monta os redirects/links. Sem ela, o checkout falha por CORS.
- **Render free dorme:** o 1º webhook pode chegar enquanto a API acorda (~30s) → Stripe marca falha e **reenvia**; o handler é idempotente, não duplica.

---

## 5. Como testar (modo teste, paywall off)

### Caminho feliz — VALIDADO ✅
Selecionar plano → pagar no Stripe (`4242 4242 4242 4242`, validade futura, CVC qualquer) → redireciona para `/assinar/sucesso` → mostra "Premium ativo" em Configurações → e-mail de boas-vindas recebido.

### Ainda a validar
- **Cancelamento:** aba Assinatura → "Gerenciar assinatura" → cancelar no portal → confirmar que o "Premium ativo" some (evento `customer.subscription.deleted` → status `CANCELED` + e-mail de cancelamento).
- **Pagamento falho:** cartões de teste `4000 0000 0000 0341` / `4000 0000 0000 9995` → status `PAST_DUE` + e-mail "problema com pagamento".
- **Webhook saudável:** Stripe → webhook → "Entregas de eventos" → tudo com **200**.

### Testar o PAYWALL (só você/contas de teste → seguro ligar)
1. Expirar um trial de uma conta de teste (SQL no Neon):
   ```sql
   UPDATE users
   SET trial_ends_at = NOW() - INTERVAL '1 day', subscription_status = 'TRIALING'
   WHERE email = 'conta-de-teste@exemplo.com';
   ```
2. No Render: `BILLING_ENFORCEMENT=on` → redeploy.
3. Verificar, logado na conta expirada:
   - **Web:** qualquer rota redireciona para `/assinar` (exceto `/configuracoes`).
   - **API:** tentar criar transação → **402** → front leva para `/assinar`.
   - **WhatsApp:** mensagem do número da conta → bot responde com o link de assinatura.
4. Assinar pela conta bloqueada → vira `ACTIVE` → paywall some.
5. Voltar `BILLING_ENFORCEMENT=off` enquanto não for cobrar pra valer.

### Cartões de teste úteis
- `4242 4242 4242 4242` — aprova.
- `4000 0000 0000 9995` — recusado (fundos insuficientes).
- `4000 0000 0000 0341` — falha na renovação.

---

## 6. Tirar do modo teste e ter cobranças REAIS

O modo teste e o modo live (produção) são **mundos separados** no Stripe: produtos, preços, webhooks, clientes e chaves NÃO são compartilhados. Tudo o que você configurou em teste precisa ser refeito em live. Passo a passo:

### 6.1. Ativar a conta Stripe (pré-requisito — só precisa uma vez)
Para **receber dinheiro de verdade**, a conta precisa estar ativada:
1. No dashboard, clique em **"Alternar para conta de produção"** (banner roxo do topo) / **"Ativar conta"**.
2. Preencher os dados exigidos pelo Stripe:
   - **Dados da empresa / pessoa** (CNPJ ou CPF, endereço).
   - **Conta bancária** para receber os repasses (payouts).
   - Dados do responsável.
3. Aguardar a verificação do Stripe (normalmente rápida; às vezes pede documento).
> Sem a conta ativada, o modo live não processa pagamentos reais.

### 6.2. Recriar a configuração em modo Live
Com a conta ativada, **desligue o "Test mode"** (modo de produção) e refaça:
1. **Produto + 2 preços** (`LemonFin Premium`, R$ 14,90/mês e R$ 149/ano) → anote os novos `price_id` **live** (são diferentes dos de teste).
2. **Webhook**: novo endpoint apontando para a MESMA URL `https://lemonfin-api.onrender.com/billing/webhook`, escutando os mesmos 6 eventos → copie o novo `whsec_...` **live**.
3. **Customer Portal**: ativar também no modo live (a config de teste não vale em live).
4. **Chave secreta**: Desenvolvedores → Chaves de API (em modo live) → `sk_live_...`.

### 6.3. Trocar as envs do Render para LIVE
No Render → `lemonfin-api` → Environment, substituir os valores de teste pelos **live**:
```
STRIPE_SECRET_KEY=sk_live_...        # era sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...      # o whsec do webhook LIVE (diferente do de teste)
STRIPE_PRICE_MONTHLY=price_...       # price_id LIVE do mensal
STRIPE_PRICE_YEARLY=price_...        # price_id LIVE do anual
# FRONTEND_URL e RESEND_API_KEY continuam iguais
BILLING_ENFORCEMENT=off              # ainda OFF — ligar só após validar (6.4)
```
Salvar → redeploy.

### 6.4. Validar em live com um pagamento real pequeno
- Em live **não funciona** o cartão `4242...` — precisa de um cartão de verdade.
- Faça **um** checkout real (pode ser o mensal de R$ 14,90), confirme que vira `ACTIVE` e que o webhook live entrega com 200.
- Depois, **cancele/reembolse** esse teste pelo dashboard se quiser (dá pra estornar).

### 6.5. Ligar a cobrança (paywall)
- Só agora: `BILLING_ENFORCEMENT=on` no Render → redeploy.
- A partir daqui, trials expirados sem assinatura são bloqueados (web + WhatsApp) e precisam assinar — com cobrança real.

### Sobre o dinheiro (payouts)
- O Stripe acumula o saldo e **repassa para sua conta bancária** automaticamente, conforme o cronograma de payout configurado (Configurações → Saldos/Payouts). No Brasil costuma haver um prazo de liberação.
- Taxas do Stripe são descontadas por transação (consulte a tabela vigente no painel).

> ⚠️ **Regras de ouro:**
> - Nunca ligar `BILLING_ENFORCEMENT=on` com chaves de teste em produção (pagamentos não são reais → prende usuários).
> - Nunca ligar o enforcement antes de validar um checkout live de verdade.
> - Test e live têm `price_id`/`whsec`/`sk` diferentes — não misturar (ex: `sk_live` com `whsec` de teste faz o webhook falhar a verificação).

---

## 7. Pendências / próximos passos da frente

- [ ] Validar cancelamento e pagamento-falho (modo teste).
- [ ] Validar o paywall ligando a flag numa conta de teste expirada.
- [ ] Migrar para Live e ligar a cobrança quando for lançar.
- [ ] (Relacionado, fora desta frente) Rastrear custo de IA por usuário; painel admin com métricas de assinatura.

Infra publicada: **API** em `https://lemonfin-api.onrender.com` (Render), **Front** em `https://lemonfin-web.vercel.app` (Vercel), **Banco** Neon.
