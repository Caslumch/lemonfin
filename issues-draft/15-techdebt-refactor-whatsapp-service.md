## Problema (dívida arquitetural)

`whatsapp.service.ts` é um god-service: **2.661 linhas, 21 dependências, ~40 métodos, sem camada de use-cases**. Reimplementa inline lógica de transação/consulta/cartão/reserva/lote, violando a convenção Controller→UseCase→Repository que o resto do backend segue (PRD §8). É ~18% do LOC não-teste do backend e o maior alvo de refatoração.

Funções críticas muito longas: `handleIncomingMessage` (~248 linhas), `handleTransaction` (~230).

## Evidência

- `apps/api/src/modules/whatsapp/whatsapp.service.ts` (2.661 linhas)
- Roteamento de intents inline: `handleTransaction:339`, `handleQuery:805`, `handleCardQuery:975`, `handleBatch:2226`, `handleRedo:2302`
- Positivo: já reusa use-cases reais de outros módulos (`CreateInstallmentsUseCase`, `PayInvoiceUseCase`, `ChatCompletionUseCase`) — seguir esse padrão para o resto.

## Proposta (incremental, sem big-bang)

- Extrair o roteamento de intents para um dispatcher fino + um use-case por intent (`handle-transaction`, `handle-query`, `handle-card-query`, `handle-cancel`, `handle-redo`, `handle-reserve-contribution`...).
- Cada use-case testável isoladamente (isso também destrava a issue de cobertura de testes).
- Fazer em fatias pequenas com specs acompanhando cada extração.

## Critério de aceite

- `whatsapp.service.ts` reduzido a orquestração/dispatch; regra de negócio em use-cases testados.
- Sem regressão nos specs de fluxo existentes (cancel/redo/unregistered/parser).

> Nota: item grande — pode virar épico com sub-issues por intent. Não é bloqueador de lançamento, mas reduz risco de manutenção no núcleo do produto.
