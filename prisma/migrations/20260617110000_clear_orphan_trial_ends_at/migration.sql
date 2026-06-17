-- Limpa trialEndsAt órfão: usuários que converteram o trial em assinatura
-- paga (subscription_status = 'ACTIVE') mas mantiveram trial_ends_at preenchido.
-- Essa data órfã fazia o banner de trial avisar "teste grátis termina em N dias"
-- mesmo com o plano ACTIVE. A partir de agora o webhook do Stripe zera esse
-- campo na conversão; esta migration corrige os registros anteriores ao fix.
UPDATE "users"
SET "trial_ends_at" = NULL
WHERE "subscription_status" = 'ACTIVE'
  AND "trial_ends_at" IS NOT NULL;
