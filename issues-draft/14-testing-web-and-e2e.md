## Problema (QA)

- Frontend tem **0 testes** e não há **E2E**. O CI roda apenas `pnpm --filter api test` — web e integração não são barrados por nenhum gate.
- Backend tem 22 specs bem concentrados no núcleo de dinheiro, mas os "god-services" e módulos inteiros (budgets/goals/reserves/recurring, e os use-cases de relatório `get-insights`/`get-forecast`) estão sem cobertura; `alerts.service.ts` (558 linhas de heurística financeira) não tem spec.

## Proposta

- Adicionar suíte E2E do happy-path (Playwright): cadastro → login → registrar transação (manual) → ver no dashboard → assinar (Stripe test).
- Testes de componente/hook nos fluxos críticos do web (transações, filtros, chat).
- Fechar os buracos de teste de maior risco no backend: `alerts.service`, use-cases de relatório, budgets/goals/reserves.
- Estender o CI: rodar testes do web e o E2E (ao menos smoke) no gate de PR.

## Critério de aceite

- E2E happy-path verde no CI; CI cobre web além da api.
- Cobertura de testes nos módulos financeiros de maior risco hoje sem spec.
