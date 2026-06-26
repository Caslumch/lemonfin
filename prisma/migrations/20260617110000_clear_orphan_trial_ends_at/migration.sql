-- Data migration: limpa o trial "órfão".
--
-- A migration add_trial_ends_at fez backfill de 7 dias de trial para TODOS os
-- usuários, inclusive os que já tinham assinatura ativa. Isso zera o trial de
-- quem já é assinante (ACTIVE) — o acesso premium deles vem da assinatura, não
-- do trial. Idempotente: rodar de novo não muda nada.
UPDATE "users"
SET "trial_ends_at" = NULL
WHERE "subscription_status" = 'ACTIVE'
  AND "trial_ends_at" IS NOT NULL;
