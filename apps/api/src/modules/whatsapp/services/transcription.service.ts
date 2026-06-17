import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AiFeature } from '@prisma/client';
import OpenAI, { toFile } from 'openai';
import { AiUsageService } from '../../ai-usage/ai-usage.service';

const MODEL = 'whisper-1';
// Whisper cobra por minuto (US$ 0,006/min), não por token. Para reaproveitar a
// tabela AiUsage (tokens) sem distorcer o custo, gravamos 0 tokens e custo $0
// aqui — o que importa para o painel é o registro da chamada e a feature. Se um
// dia o custo de áudio for relevante, dá para passar a duração e somar à parte.
export interface TranscriptionInput {
  // bytes do áudio (já decodificados de base64).
  buffer: Buffer;
  // mimetype vindo do WMode, ex: "audio/ogg; codecs=opus".
  mimetype?: string;
  userId: string | null;
}

@Injectable()
export class TranscriptionService {
  private readonly logger = new Logger(TranscriptionService.name);
  private readonly openai: OpenAI;

  constructor(
    private readonly config: ConfigService,
    private readonly aiUsage: AiUsageService,
  ) {
    this.openai = new OpenAI({
      apiKey: this.config.getOrThrow<string>('OPENAI_API_KEY'),
    });
  }

  /**
   * Transcreve um áudio para texto (pt-BR) com o Whisper. Retorna null em caso
   * de falha ou transcrição vazia — o chamador decide a mensagem de fallback.
   */
  async transcribe({
    buffer,
    mimetype,
    userId,
  }: TranscriptionInput): Promise<string | null> {
    try {
      // O WhatsApp manda áudio como ogg/opus. O Whisper infere o formato pela
      // extensão do arquivo, então derivamos uma do mimetype (default ogg).
      const ext = this.extensionFromMimetype(mimetype);
      const file = await toFile(buffer, `audio.${ext}`, {
        type: mimetype?.split(';')[0]?.trim() || 'audio/ogg',
      });

      const result = await this.openai.audio.transcriptions.create({
        model: MODEL,
        file,
        language: 'pt',
      });

      // Registro de uso (falha graciosa). Whisper é por minuto; gravamos a
      // chamada sem tokens (ver nota no topo do arquivo).
      await this.aiUsage.record({
        userId,
        feature: AiFeature.WHATSAPP_TRANSCRIPTION,
        model: MODEL,
        promptTokens: 0,
        completionTokens: 0,
      });

      const text = result.text?.trim() ?? '';
      if (!text) {
        this.logger.warn('Whisper retornou transcrição vazia');
        return null;
      }
      return text;
    } catch (err) {
      this.logger.error(`Erro ao transcrever áudio: ${String(err)}`);
      return null;
    }
  }

  private extensionFromMimetype(mimetype?: string): string {
    if (!mimetype) return 'ogg';
    const base = mimetype.split(';')[0].trim().toLowerCase();
    const map: Record<string, string> = {
      'audio/ogg': 'ogg',
      'audio/opus': 'ogg',
      'audio/mpeg': 'mp3',
      'audio/mp3': 'mp3',
      'audio/mp4': 'm4a',
      'audio/m4a': 'm4a',
      'audio/x-m4a': 'm4a',
      'audio/wav': 'wav',
      'audio/webm': 'webm',
      'audio/amr': 'amr',
    };
    return map[base] ?? 'ogg';
  }
}
