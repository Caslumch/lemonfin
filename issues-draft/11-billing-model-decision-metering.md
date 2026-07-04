## Problema (decisão de produto — código diverge do PRD)

O PRD §11 e a landing anunciam **freemium metered**: grátis = 30 transações/mês via WhatsApp + 5 mensagens de chat IA/mês; premium = ilimitado. **Esse metering não existe no código** — não há nenhum contador de quota. O modelo real é binário: **trial → paywall duro** (pós-trial sem pagar recebe zero acesso, não "30 grátis/mês").

Ou seja, a tabela de preços vende algo que o produto não entrega.

## Evidência

- Sem contadores de quota em `billing`/`whatsapp`/`chat` (grep vazio).
- Acesso é derivado por `hasPremiumAccess()` = `ACTIVE OU (TRIALING e trialEndsAt no futuro)` — `apps/api/src/common/billing/premium-access.ts:16-32`.
- Paywall no WhatsApp: `whatsapp.service.ts:112-127`; API/AI: `premium.guard.ts:60-71`.

## Decisão necessária (escolher uma)

1. **Construir o metering** que o PRD promete: contadores mensais (30 tx WhatsApp, 5 chat IA) por usuário, com reset mensal, e liberar o tier grátis metered.
2. **Simplificar a oferta** para "trial → 1 plano pago" e **atualizar PRD + landing** para remover o freemium metered.

## Critério de aceite

- Landing, PRD e comportamento em código **coincidem**.
- Se (1): quotas aplicadas e resetadas mensalmente, com mensagens claras ao atingir o limite; testes de borda (limite, reset, upgrade).
