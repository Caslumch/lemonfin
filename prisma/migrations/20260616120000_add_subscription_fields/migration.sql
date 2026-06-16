-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('TRIALING', 'ACTIVE', 'PAST_DUE', 'CANCELED');

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "stripe_customer_id" TEXT;
ALTER TABLE "users" ADD COLUMN     "stripe_subscription_id" TEXT;
ALTER TABLE "users" ADD COLUMN     "subscription_status" "SubscriptionStatus" NOT NULL DEFAULT 'TRIALING';
ALTER TABLE "users" ADD COLUMN     "current_period_end" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "users_stripe_customer_id_key" ON "users"("stripe_customer_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_stripe_subscription_id_key" ON "users"("stripe_subscription_id");
