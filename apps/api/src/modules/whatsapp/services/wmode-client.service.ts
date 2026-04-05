import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

interface SendMessageParams {
  to: string;
  content: string;
}

@Injectable()
export class WmodeClientService {
  private readonly logger = new Logger(WmodeClientService.name);
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly sessionId: string;

  constructor(private readonly config: ConfigService) {
    this.baseUrl = this.config.getOrThrow<string>('WMODE_API_URL');
    this.apiKey = this.config.getOrThrow<string>('WMODE_API_KEY');
    this.sessionId = this.config.getOrThrow<string>('WMODE_SESSION_ID');
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
}
