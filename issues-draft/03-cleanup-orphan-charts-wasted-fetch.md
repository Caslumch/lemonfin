## Problema

Dois componentes de gráfico do dashboard existem mas **não são renderizados em lugar nenhum** (dead code), e o dashboard ainda dispara um fetch cujo resultado é **descartado** a cada carga.

- `apps/web/src/components/dashboard/evolution-chart.tsx` (132 linhas, LineChart do recharts) — sem import/uso.
- `apps/web/src/components/dashboard/category-breakdown.tsx` (80 linhas) — sem import/uso.
- `useDashboardData` faz `fetch /transactions/by-category` e retorna `categories`, mas `(dashboard)/page.tsx` **nunca lê `data.categories`** → um request de rede por load, desperdiçado.

Observação de produto: a "pizza por categoria" e a "linha de evolução mensal" do PRD §6.5 **existem como componentes mas não estão na tela** (só o gráfico de barras é renderizado).

## Evidência

- `apps/web/src/hooks/use-dashboard-data.ts:97` (fetch/retorno de `categories`)
- `apps/web/src/app/(dashboard)/page.tsx` (não consome `data.categories`)

## Decisão necessária

**Ou** (a) remover os dois componentes + o fetch descartado; **ou** (b) wireá-los na tela (fechando a lacuna do PRD §6.5). Recomendo decidir com base no design atual do dashboard.

## Critério de aceite

- Nenhum componente órfão e nenhum fetch cujo resultado não é usado; **ou** os dois gráficos renderizando com dados reais.
