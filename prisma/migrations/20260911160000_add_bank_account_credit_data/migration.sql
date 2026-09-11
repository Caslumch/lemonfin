-- AlterTable
ALTER TABLE "bank_accounts" ADD COLUMN "credit_limit" DECIMAL(12,2),
ADD COLUMN "available_credit_limit" DECIMAL(12,2),
ADD COLUMN "balance_due_date" TIMESTAMP(3),
ADD COLUMN "balance_close_date" TIMESTAMP(3),
ADD COLUMN "minimum_payment" DECIMAL(12,2);
