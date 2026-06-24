-- Adiciona o valor WHATSAPP_RECEIPT ao enum AiFeature (leitura de comprovante/
-- nota por imagem no WhatsApp via gpt-4o-mini). ADD VALUE é a forma suportada
-- pelo Postgres para estender enums sem recriar o tipo.
ALTER TYPE "AiFeature" ADD VALUE IF NOT EXISTS 'WHATSAPP_RECEIPT';
