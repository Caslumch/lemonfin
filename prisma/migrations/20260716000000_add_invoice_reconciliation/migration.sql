-- CreateTable
CREATE TABLE "invoice_reconciliations" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "card_id" TEXT NOT NULL,
    "cycle" TEXT NOT NULL,
    "informed_total" DECIMAL(12,2) NOT NULL,
    "adjustment_id" TEXT,
    "reconciled_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invoice_reconciliations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "invoice_reconciliations_adjustment_id_key" ON "invoice_reconciliations"("adjustment_id");

-- CreateIndex
CREATE INDEX "invoice_reconciliations_user_id_idx" ON "invoice_reconciliations"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "invoice_reconciliations_card_id_cycle_key" ON "invoice_reconciliations"("card_id", "cycle");

-- AddForeignKey
ALTER TABLE "invoice_reconciliations" ADD CONSTRAINT "invoice_reconciliations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_reconciliations" ADD CONSTRAINT "invoice_reconciliations_card_id_fkey" FOREIGN KEY ("card_id") REFERENCES "cards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_reconciliations" ADD CONSTRAINT "invoice_reconciliations_adjustment_id_fkey" FOREIGN KEY ("adjustment_id") REFERENCES "transactions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
