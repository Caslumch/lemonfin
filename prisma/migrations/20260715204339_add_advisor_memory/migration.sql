-- CreateTable
CREATE TABLE "advisor_memories" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "advisor_memories_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "advisor_memories_user_id_created_at_idx" ON "advisor_memories"("user_id", "created_at");

-- AddForeignKey
ALTER TABLE "advisor_memories" ADD CONSTRAINT "advisor_memories_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
