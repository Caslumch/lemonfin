-- CreateTable
CREATE TABLE "processed_messages" (
    "message_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "processed_messages_pkey" PRIMARY KEY ("message_id")
);

-- CreateIndex
CREATE INDEX "processed_messages_created_at_idx" ON "processed_messages"("created_at");
