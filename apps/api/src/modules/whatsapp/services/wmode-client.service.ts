import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

interface SendMessageParams {
  to: string;
  content: string;
}

interface SendAudioParams {
  to: string;
  // áudio em base64 (webm/opus). O WMode remuxa p/ ogg/opus e envia como PTT.
  audio: string;
  mimetype: string;
  // legenda opcional (não é PTT-friendly em todo cliente; default sem legenda).
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
   * Envia uma mensagem de VOZ (PTT). O WMode recebe o áudio em base64, remuxa
   * para ogg/opus (contêiner que o WhatsApp usa para voz) e envia via Baileys
   * com `ptt: true`. Falha graciosa: retorna null (o chamador cai para texto).
   */
  async sendAudio({ to, audio, mimetype, caption }: SendAudioParams) {
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
          type: 'audio',
          ptt: true,
          media: { data: audio, mimetype },
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
