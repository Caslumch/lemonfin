-- AlterTable
ALTER TABLE "bank_accounts" ADD COLUMN "linked_card_id" TEXT;

-- AddForeignKey
ALTER TABLE "bank_accounts" ADD CONSTRAINT "bank_accounts_linked_card_id_fkey" FOREIGN KEY ("linked_card_id") REFERENCES "cards"("id") ON DELETE SET NULL ON UPDATE CASCADE;
