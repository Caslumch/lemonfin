-- CreateEnum
CREATE TYPE "PluggyItemStatus" AS ENUM ('CONNECTED', 'UPDATING', 'WAITING_USER', 'LOGIN_ERROR', 'ERROR');

-- AlterEnum
ALTER TYPE "TransactionSource" ADD VALUE 'PLUGGY';

-- AlterTable
ALTER TABLE "transactions" ADD COLUMN "external_id" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "transactions_external_id_key" ON "transactions"("external_id");

-- CreateTable
CREATE TABLE "pluggy_items" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "pluggy_item_id" TEXT NOT NULL,
    "connector_name" TEXT NOT NULL,
    "connector_logo" TEXT,
    "status" "PluggyItemStatus" NOT NULL DEFAULT 'UPDATING',
    "last_sync_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pluggy_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bank_accounts" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "pluggy_item_id" TEXT NOT NULL,
    "pluggy_account_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "subtype" TEXT,
    "number" TEXT,
    "balance" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "currency_code" TEXT NOT NULL DEFAULT 'BRL',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bank_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "pluggy_items_pluggy_item_id_key" ON "pluggy_items"("pluggy_item_id");

-- CreateIndex
CREATE INDEX "pluggy_items_user_id_idx" ON "pluggy_items"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "bank_accounts_pluggy_account_id_key" ON "bank_accounts"("pluggy_account_id");

-- CreateIndex
CREATE INDEX "bank_accounts_user_id_idx" ON "bank_accounts"("user_id");

-- CreateIndex
CREATE INDEX "bank_accounts_pluggy_item_id_idx" ON "bank_accounts"("pluggy_item_id");

-- AddForeignKey
ALTER TABLE "pluggy_items" ADD CONSTRAINT "pluggy_items_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bank_accounts" ADD CONSTRAINT "bank_accounts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bank_accounts" ADD CONSTRAINT "bank_accounts_pluggy_item_id_fkey" FOREIGN KEY ("pluggy_item_id") REFERENCES "pluggy_items"("pluggy_item_id") ON DELETE CASCADE ON UPDATE CASCADE;
