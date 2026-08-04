import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

interface SendMessageParams {
  to: string;
  content: string;
}

interface SendAudioParams {
  to: string;
  // áudio em base64 (qualquer formato legível pelo ffmpeg — mandamos webm/opus).
  // O WMode converte p/ OGG/Opus e envia como mensagem de voz (PTT).
  audio: string;
  // legenda opcional (vira descrição no painel do WMode; o áudio é a mensagem).
  caption?: string;
}

@Injectable()
export class WmodeClientService {
  private readonly logger = new Logger(WmodeClientService.name);
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly sessionId: string;

  constructor(private readonly config: ConfigService) {
    this.baseUrl = this.config.get<string>('WMODE_API_URL', '');
    this.apiKey = this.config.get<string>('WMODE_API_KEY', '');
    this.sessionId = this.config.get<string>('WMODE_SESSION_ID', '');
  }

  async sendMessage({ to, content }: SendMessageParams) {
    const url = `${this.baseUrl}/api/v1/messages/send`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Api-Key': this.apiKey,
        },
        body: JSON.stringify({
          sessionId: this.sessionId,
          to,
          content,
        }),
      });

      if (!response.ok) {
        const body = await response.text();
        this.logger.error(`WMode send failed: ${response.status} - ${body}`);
        return null;
      }

      const data = await response.json();
      this.logger.log(`Message sent to ${to}: ${data.id}`);
      return data;
    } catch (error) {
      this.logger.error(`WMode send error: ${error}`);
      return null;
    }
  }

  /**
   * Envia uma mensagem de VOZ (PTT). O WMode recebe o áudio em base64, converte
   * para OGG/Opus (formato do WhatsApp para voz) e envia via Baileys como PTT —
   * ele mesmo força o ptt, então não mandamos mimetype/ptt aqui. Contrato:
   * type='AUDIO' (enum, MAIÚSCULO) + media.data. Falha graciosa: retorna null
   * (o chamador cai para texto).
   */
  async sendAudio({ to, audio, caption }: SendAudioParams) {
    const url = `${this.baseUrl}/api/v1/messages/send`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Api-Key': this.apiKey,
        },
        body: JSON.stringify({
          sessionId: this.sessionId,
          to,
          type: 'AUDIO',
          media: { data: audio },
          ...(caption ? { content: caption } : {}),
        }),
      });

      if (!response.ok) {
        const body = await response.text();
        this.logger.error(`WMode sendAudio failed: ${response.status} - ${body}`);
        return null;
      }

      const data = await response.json();
      this.logger.log(`Audio sent to ${to}: ${data.id}`);
      return data;
    } catch (error) {
      this.logger.error(`WMode sendAudio error: ${error}`);
      return null;
    }
  }
}
