## Problema (bloqueador de lançamento — pagamentos)

O Stripe está completo em código (checkout/portal/webhook idempotente, trial→paywall, cobertura de família, e-mails de billing), mas:
- Está em **modo teste**; o modo **Live nunca foi ativado**.
- Fluxos de **cancelamento** e **falha de pagamento** não foram validados (ver `docs/billing-stripe.md §7`).
- O enforcement está **desligado por padrão** (`BILLING_ENFORCEMENT=off`), então nenhuma regra de billing é aplicada hoje.

## Proposta

- Ativar Stripe Live (chaves, price IDs, webhook endpoint de produção com signing secret).
- Validar ponta-a-ponta: assinatura nova, renovação, **cancelamento**, **falha de pagamento** (PAST_DUE) e retorno de dunning.
- Ligar `BILLING_ENFORCEMENT` em produção após validação.
- (Relacionado) tornar a idempotência do webhook do Stripe durável (hoje é in-memory com TTL de 24h — inconsistente com o dedupe durável do WhatsApp). Ver `handle-stripe-webhook.use-case.ts:33-62`.

## Depende de

Issue de "modelo de cobrança" (metering vs oferta única) — decidir o que o enforcement vai aplicar antes de ligá-lo.

## Critério de aceite

- Cobrança real funcionando; cancelamento e falha de pagamento testados; enforcement ligado e coerente com o plano escolhido.
