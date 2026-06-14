-- AlterTable: guarda a última ação de registro da conversa (transação,
-- parcelamento ou lote) para "cancela"/"refaz" operarem sobre a ação inteira.
ALTER TABLE "conversation_states" ADD COLUMN "last_action" JSONB;
