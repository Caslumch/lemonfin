-- DropIndex
DROP INDEX "transactions_user_id_category_id_idx";

-- CreateIndex
CREATE INDEX "transactions_user_id_category_id_date_idx" ON "transactions"("user_id", "category_id", "date");

-- CreateIndex
CREATE INDEX "transactions_card_id_date_idx" ON "transactions"("card_id", "date");
