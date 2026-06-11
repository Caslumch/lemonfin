-- CreateTable
CREATE TABLE "conversation_states" (
    "phone" TEXT NOT NULL,
    "pending" JSONB,
    "history" JSONB NOT NULL DEFAULT '[]',
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "conversation_states_pkey" PRIMARY KEY ("phone")
);
