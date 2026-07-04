## Problema (bloqueador de lançamento — LGPD)

Não existe exclusão de conta/dados. O `users` controller só tem `DELETE /me/2fa`. A LGPD garante o **direito de eliminação** dos dados pessoais — obrigatório para um produto pago que lida com dados financeiros.

## Proposta

- Endpoint `DELETE /users/me` (autenticado) que apaga a conta e todos os dados relacionados.
- O schema já usa `onDelete: Cascade` na maioria das relações a partir de `User`, então a exclusão em cascata deve cobrir transactions/cards/goals/reserves/recurring/budgets/categories/verificationCodes/aiUsage; **verificar** casos com `SetNull` e famílias (transferência/again de ownership de `Family` onde o usuário é `owner`).
- Cancelar a assinatura no Stripe ao excluir (evitar cobrança órfã).
- UI em Configurações: fluxo de exclusão com confirmação forte.
- (Recomendado) exportação de dados (portabilidade) — pode ser issue separada.

## Critério de aceite

- Usuário consegue excluir a própria conta pela UI; todos os dados pessoais são removidos; assinatura Stripe cancelada.
- Famílias onde o usuário é owner tratadas (transferência ou dissolução definida).
- Teste de integração cobrindo a cascata.
