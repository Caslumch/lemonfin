## Problema

O handler de correção de valor no WhatsApp (`handleCorrection`, ex.: _"o último era 45, não 50"_) usa `findLastByUser(userId)` — a transação mais recente por `createdAt` — e atualiza **apenas essa linha**. Isso é incoerente com o modelo de "ação inteira" que `cancela`/`refaz`/correção-de-cartão já usam (via `ConversationState.lastAction`).

Num **parcelamento**, isso reescreve só o valor da última parcela criada, deixando o grupo internamente inconsistente: uma parcela ≠ as outras e `soma(parcelas) ≠ total da compra`.

## Evidência

- `apps/api/src/modules/whatsapp/whatsapp.service.ts:1594-1636` (`handleCorrection` → `findLastByUser`)
- Contraste: `handleCancel` (`:1528`), `handleRedo` (`:2302`), `handleCorrectionCard` (`:1387`) operam sobre `lastAction.transactionIds`.

## Proposta

Fazer `handleCorrection` ler `ConversationState.lastAction` (union discriminada já existente) e:
- Se a última ação foi um parcelamento/lote, recalcular e aplicar a correção sobre **todas** as transações do grupo (mantendo o resíduo de arredondamento na última parcela, como em `create-installments`).
- Manter o fallback de transação única quando não houver `lastAction`.

## Critério de aceite

- "o último era X" após um parcelamento de N parcelas atualiza o grupo inteiro e preserva `soma == total`.
- Teste unitário cobrindo correção sobre parcelamento e sobre transação avulsa.
