# Plano — Gateway de IA / Integrações

> Objetivo: transformar a API do LemonFin num **gateway** consumível por
> agentes de IA e integrações externas, sem reescrever a lógica de negócio (que
> já vive isolada em use-cases). Adicionamos apenas cascas finas por cima:
> autenticação de máquina, um namespace REST versionado, contrato OpenAPI e um
> servidor MCP.

## Contexto / motivação

Hoje a API é REST protegida por `JwtAuthGuard + PremiumGuard`, desenhada para o
browser logado. Um agente externo não consegue usar isso porque:

- **Não há auth de máquina** — só JWT de sessão de usuário.
- **Não há contrato legível por LLM** — sem OpenAPI publicado, sem MCP.
- **Respostas não são auto-explicativas.** Ex.: `GET /transactions/summary`
  retorna `expense: 0` para um mês em que só houve gasto no cartão — o valor
  real está em `cardExpense`/`cardInvoice`. Um humano (ou agente) que lê o JSON
  cru conclui, erradamente, que "sumiram" transações. (Foi exatamente o que
  motivou este plano.) O gateway precisa expor os números de forma que não
  exija conhecer as convenções internas.

O que joga a favor: **toda a lógica está em use-cases** (`GetSummaryUseCase`,
`CreateTransactionUseCase`, etc.). O gateway os reaproveita — nada de duplicar
regra de negócio.

## Decisões

- **Formato:** os dois — REST `/v1` (para qualquer integração HTTP/OpenAPI) e
  servidor MCP (para agentes nativos MCP). O MCP é um cliente fino do REST.
- **Auth de máquina:** API key por conta (`lmn_live_...`). Padrão de fintech/dev
  tools; a key resolve o `userId` e herda o status premium do dono.
- **MCP host:** remoto (HTTP/SSE), hospedado no Render, para servir qualquer
  cliente sem instalação local.

## Camadas / ordem de entrega (PRs empilhados)

### PR1 — Autenticação por API key (fundação)

Tudo depende disto.

- **Schema Prisma** — nova tabela `ApiKey`:
  - `id`, `userId` (→ `User.apiKeys`), `name` (rótulo do usuário),
    `keyHash` (só o hash — nunca o segredo em claro), `prefix`
    (ex. `lmn_live_a1b2`, para exibir/identificar), `scopes`
    (`String[]`, default `["read","write"]`), `lastUsedAt`, `revokedAt`,
    `createdAt`.
  - Migration em `prisma/migrations/<timestamp>_add_api_keys`.
- **Geração** — `lmn_live_<32 bytes base62>`. O valor completo é exibido
  **uma única vez** na criação; o banco guarda só o hash + prefix.
- **`ApiKeyGuard`** — lê `Authorization: Bearer lmn_...` (ou `X-API-Key`),
  resolve a key pelo hash, valida `revokedAt == null`, popula
  `request.user = { id: userId }` (mesmo contrato do `CurrentUser` atual → os
  controllers não mudam), atualiza `lastUsedAt` (com throttle). **Mantém** a
  checagem premium (a key herda o status do dono).
- **Painel** — seção em `/config` (ou `/admin`) para criar/nomear/revogar keys
  e ver `lastUsedAt`.

### PR2 — Namespace REST `/v1`

- Novo `GatewayModule` que reexpõe os use-cases sob `/v1`, protegido por
  `ApiKeyGuard` (no lugar do `JwtAuthGuard`).
- Rotas: `/v1/transactions` (GET/POST), `/v1/summary`, `/v1/insights`,
  `/v1/forecast`, `/v1/cards`, `/v1/budgets`, `/v1/reserves`.
- **Respostas enriquecidas** — campos com nomes claros + um bloco `_meta` que
  explica as convenções que hoje confundem. Ex. no `/v1/summary`:
  `_meta` documentando que gasto no cartão está em `cardExpense`/`cardInvoice`
  e **não** em `expense` (que é só consumo pix/débito). Resolve na raiz o
  problema que motivou o plano.

### PR3 — OpenAPI / Swagger

- Adiciona `@nestjs/swagger`, decora os DTOs, publica `/v1/openapi.json` +
  Swagger UI. Um LLM lê o schema e sabe usar sem glue code.

### PR4 — Servidor MCP remoto (HTTP/SSE)

- Pacote separado (`apps/mcp` ou `packages/mcp-server`), **cliente fino** do
  REST `/v1`. Cada use-case vira uma tool MCP (`get_summary`,
  `create_transaction`, `list_transactions`, `get_insights`, …) com descrições
  que ensinam o agente as convenções (cartão vs. consumo, etc.).
- Transporte HTTP/SSE, hospedado no Render. Auth via API key do usuário.
- Depende de PR1–PR3.

## Escopo mínimo útil

PR1–PR3 já entregam um gateway consumível por **qualquer** agente que fale
HTTP+OpenAPI. PR4 é o açúcar para clientes MCP nativos.
