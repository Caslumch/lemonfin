## Problema (código contradiz o PRD)

O PRD §10 exige pedir confirmação ao usuário quando a confiança da interpretação for **< 80%**. O código gera confirmação apenas quando **< 60%**, e **só** olha a confiança da **categoria** — valor, tipo (entrada/saída) e intenção nunca são checados por confiança.

Efeito: transações com confiança 60–80% são registradas automaticamente sem confirmar; um valor/tipo mal interpretado nunca dispara confirmação.

## Evidência

- Gate: `apps/api/src/modules/whatsapp/whatsapp.service.ts:350` (`if (data.categoryConfidence < 0.6) askCategoryConfirmation`)
- Prompt instrui o modelo a emitir `< 0.6` para baixa confiança: `apps/api/src/modules/whatsapp/services/message-parser.service.ts:201`

## Decisão necessária

Escolher uma das duas (são mutuamente exclusivas):
1. **Alinhar o código ao PRD:** subir o threshold para 0.8 e estender a confiança para valor/tipo/intenção (não só categoria).
2. **Atualizar o PRD** para refletir a decisão de produto atual (60%, só categoria), documentando o porquê.

Recomendo (1) para o núcleo do produto — o registro correto é a proposta de valor central — possivelmente com thresholds distintos por campo.

## Critério de aceite

- Comportamento do gate e o texto do PRD §10 batem.
- Se optar por (1): confirmação disparada quando qualquer um de {valor, tipo, categoria} < 0.8; testes cobrindo os casos-limite.
