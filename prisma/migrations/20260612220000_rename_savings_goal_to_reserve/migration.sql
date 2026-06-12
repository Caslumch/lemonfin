-- Renomeia SavingsGoal -> Reserve preservando dados.
-- Tabela, índice e a categoria de aportes mudam de nome; nada é recriado.

-- 1) Tabela e índice.
ALTER TABLE "savings_goals" RENAME TO "reserves";
ALTER INDEX "savings_goals_user_id_idx" RENAME TO "reserves_user_id_idx";

-- 2) Categoria dos aportes: poupanca-metas -> reservas (preserva transações já
--    vinculadas, que apontam por categoryId).
UPDATE "categories"
SET "slug" = 'reservas', "name" = 'Reservas'
WHERE "slug" = 'poupanca-metas';
