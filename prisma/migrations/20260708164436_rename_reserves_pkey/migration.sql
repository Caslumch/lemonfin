-- Alinha o nome da primary key de "reserves" ao canônico do Prisma. A tabela
-- nasceu como "savings_goals" e foi renomeada, mas o Postgres não renomeia a
-- constraint junto — o nome antigo ficava como drift permanente no migrate dev.
-- Idempotente: só renomeia se o nome antigo ainda existir (em produção o
-- estado pode variar).
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'savings_goals_pkey' AND conrelid = '"reserves"'::regclass
  ) THEN
    ALTER TABLE "reserves" RENAME CONSTRAINT "savings_goals_pkey" TO "reserves_pkey";
  END IF;
END $$;
