-- CreateTable
CREATE TABLE "reminder_settings" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "bills_enabled" BOOLEAN NOT NULL DEFAULT true,
    "days_before" INTEGER NOT NULL DEFAULT 3,
    "alerts_enabled" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "reminder_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reminder_logs" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "ref_id" TEXT,
    "dedupe_key" TEXT NOT NULL,
    "sent_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "channel" TEXT NOT NULL,

    CONSTRAINT "reminder_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "reminder_settings_user_id_key" ON "reminder_settings"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "reminder_logs_dedupe_key_key" ON "reminder_logs"("dedupe_key");

-- CreateIndex
CREATE INDEX "reminder_logs_user_id_kind_sent_at_idx" ON "reminder_logs"("user_id", "kind", "sent_at");

-- RenameForeignKey
ALTER TABLE "reserves" RENAME CONSTRAINT "savings_goals_user_id_fkey" TO "reserves_user_id_fkey";

-- AddForeignKey
ALTER TABLE "reminder_settings" ADD CONSTRAINT "reminder_settings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reminder_logs" ADD CONSTRAINT "reminder_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

