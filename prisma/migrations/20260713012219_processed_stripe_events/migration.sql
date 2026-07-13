-- CreateTable
CREATE TABLE "processed_stripe_events" (
    "id" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "processed_stripe_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "processed_stripe_events_event_id_key" ON "processed_stripe_events"("event_id");

-- CreateIndex
CREATE INDEX "processed_stripe_events_created_at_idx" ON "processed_stripe_events"("created_at");
