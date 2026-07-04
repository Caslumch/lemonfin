## Problema

O aporte em reserva (via WhatsApp) cria uma transação de DESPESA na categoria `reservas` **e** incrementa `savedAmount`, mas **não registra `lastAction`** (ao contrário de todos os outros handlers de escrita).

Consequência: um `cancela` logo depois cai no fallback `findLastByUser` → deleta a despesa "Guardado", mas **não decrementa `savedAmount`**. A reserva passa a mostrar mais dinheiro guardado do que o rastro de caixa sobrevivente. Drift silencioso.

## Evidência

- `apps/api/src/modules/whatsapp/whatsapp.service.ts:2155-2169` (`resolveReserveContribution` — nunca chama `setLastAction`)
- `handleCancel` fallback: `whatsapp.service.ts:1564`
- Incremento atômico: `apps/api/src/modules/reserves/repositories/reserves.repository.ts:66-79`

## Proposta

1. `resolveReserveContribution` deve registrar `lastAction` (tipo aporte-reserva com `reserveId`, `transactionId` e `amount`).
2. `handleCancel`, ao desfazer um aporte, deve **decrementar `savedAmount`** além de deletar a transação.
3. (Relacionado — ver issue de atomicidade) idealmente envolver `tx.create` + `addContribution` numa transação de banco para não deixar os dois writes fora de sincronia num meio-erro.

## Critério de aceite

- "Guardei 200 na reserva X" seguido de "cancela" restaura `savedAmount` ao valor anterior e remove a despesa.
- Teste cobrindo o ciclo aporte→cancela para reserva.
