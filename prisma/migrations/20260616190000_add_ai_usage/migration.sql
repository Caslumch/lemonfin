-- CreateEnum
CREATE TYPE "AiFeature" AS ENUM ('CHAT', 'WHATSAPP_PARSER');

-- CreateTable
CREATE TABLE "ai_usage" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "feature" "AiFeature" NOT NULL,
    "model" TEXT NOT NULL,
    "prompt_tokens" INTEGER NOT NULL,
    "completion_tokens" INTEGER NOT NULL,
    "total_tokens" INTEGER NOT NULL,
    "cost_usd" DECIMAL(12,6) NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_usage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ai_usage_created_at_idx" ON "ai_usage"("created_at");

-- CreateIndex
CREATE INDEX "ai_usage_user_id_created_at_idx" ON "ai_usage"("user_id", "created_at");

-- AddForeignKey
ALTER TABLE "ai_usage" ADD CONSTRAINT "ai_usage_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
