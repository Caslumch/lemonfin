-- Adiciona o valor WHATSAPP_TRANSCRIPTION ao enum AiFeature (transcrição de
-- áudio do WhatsApp via Whisper). ADD VALUE é a forma suportada pelo Postgres
-- para estender enums sem recriar o tipo.
ALTER TYPE "AiFeature" ADD VALUE IF NOT EXISTS 'WHATSAPP_TRANSCRIPTION';
