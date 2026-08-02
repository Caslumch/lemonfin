-- AlterTable
ALTER TABLE "users" ADD COLUMN     "tts_pitch" TEXT NOT NULL DEFAULT 'default',
ADD COLUMN     "tts_rate" TEXT NOT NULL DEFAULT 'default',
ADD COLUMN     "tts_voice" TEXT NOT NULL DEFAULT 'pt-BR-FranciscaNeural',
ADD COLUMN     "tts_volume" TEXT NOT NULL DEFAULT 'default';
