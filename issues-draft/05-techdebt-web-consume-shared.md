## Problema

`packages/shared` contém schemas Zod (user, transaction) e constantes de categoria, mas o frontend **não importa nada de lá** (0 hits para `@lemonfin/shared`/`packages/shared`). Os tipos em `apps/web/src/types/*` redefinem o contrato da API à mão, podendo **divergir silenciosamente** do backend (fonte da verdade).

## Proposta

- Fazer o web consumir os schemas/constantes de `packages/shared` (categorias, contratos de transaction/user) em vez de redefinir tipos.
- Onde o backend e o web precisam do mesmo shape (ex.: payloads de transação/categoria), derivar os tipos do schema Zod compartilhado (`z.infer`).
- Verificar a config do workspace (`pnpm-workspace.yaml`, `turbo.json`, paths do tsconfig) para o import resolver corretamente.

## Critério de aceite

- Pelo menos os tipos de transação/categoria/usuário no web vêm de `packages/shared`.
- Nenhuma redefinição duplicada do mesmo contrato entre `types/*` e `packages/shared`.
