## Problema

`formatCurrency` está redefinido inline em **9 arquivos** do frontend, e o helper de data ancorado em UTC também se repete. `lib/utils.ts` só tem `cn()`.

## Evidência (ocorrências)

`(dashboard)/page.tsx`, `insights`, `budget-card`, `evolution-chart`, `monthly-chart`, `summary-cards`, `category-breakdown`, `transaction-list`, `forecast-card`.

## Proposta

- Criar `formatBRL(value)` e `formatDateBR(date)` únicos em `apps/web/src/lib/format.ts` (ou `lib/utils.ts`), usando `Intl.NumberFormat("pt-BR", { style:"currency", currency:"BRL" })` e o padrão de `timeZone:"UTC"` já usado.
- Substituir as 9 cópias por imports.

## Critério de aceite

- Uma única definição de cada helper; zero redefinições inline.
- (Bônus) considerar mover para `packages/shared` se o backend também formatar valores para mensagens do WhatsApp — ver issue de `packages/shared`.
