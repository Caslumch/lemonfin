## Problema (confiabilidade)

No webhook do WhatsApp, o `messageId` é marcado como processado (`claim`) **antes** do processamento, que roda detached (fire-and-forget, `.catch(log)`). Se o processamento lançar erro **depois** do claim, a mensagem fica permanentemente marcada como processada e o retry do WMode é rejeitado → **perda silenciosa** (um registro que nunca aconteceu).

É um trade-off consciente (prioriza não-duplicar sobre não-perder), mas está **não documentado como risco** e não tem recuperação.

## Evidência

- `apps/api/src/modules/whatsapp/webhook.controller.ts:91-104` (claim em `:92`, processamento detached em `:100-104`)
- Claim atômico: `apps/api/src/modules/whatsapp/repositories/processed-message.repository.ts:21-34`

## Proposta (opções)

- Fazer o claim **liberar/reverter** (deletar o `ProcessedMessage`) se o processamento falhar antes de qualquer efeito colateral, permitindo o retry do WMode; **ou**
- Mover para um padrão de "processar e só então marcar como concluído" com estado `PROCESSING`/`DONE`; **ou**
- No mínimo, capturar falhas pós-claim numa dead-letter/log estruturado + alerta (Sentry) para reprocessamento manual.

## Critério de aceite

- Uma falha de processamento não resulta em mensagem perdida sem rastro; comportamento documentado e testado.
