-- AlterTable
ALTER TABLE "users" ADD COLUMN     "trial_ends_at" TIMESTAMP(3);

-- Backfill: usuários existentes ganham 7 dias de trial a partir de AGORA
-- (a feature passa a valer para eles no momento do deploy desta migration).
UPDATE "users" SET "trial_ends_at" = NOW() + INTERVAL '7 days' WHERE "trial_ends_at" IS NULL;
