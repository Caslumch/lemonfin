-- AlterTable: campos de parcelamento.
-- installment_group_id agrupa todas as parcelas de uma mesma compra; nulo em
-- transações avulsas e em parcelas criadas antes desta migration.
ALTER TABLE "transactions" ADD COLUMN "installment_group_id" TEXT;
ALTER TABLE "transactions" ADD COLUMN "installment_number" INTEGER;
ALTER TABLE "transactions" ADD COLUMN "installment_total" INTEGER;

-- CreateIndex: excluir/agrupar todas as parcelas de uma mesma compra.
CREATE INDEX "transactions_installment_group_id_idx" ON "transactions"("installment_group_id");
