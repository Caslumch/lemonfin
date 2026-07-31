-- AlterEnum
ALTER TYPE "AiFeature" ADD VALUE 'WHATSAPP_TTS';

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "tts_enabled" BOOLEAN NOT NULL DEFAULT false;
