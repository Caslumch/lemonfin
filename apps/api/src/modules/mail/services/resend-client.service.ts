import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
  text: string;
}

/**
 * Cliente HTTP do Resend (https://resend.com/docs/api-reference/emails/send-email).
 *
 * Usa fetch direto em vez do SDK para não adicionar dependência e seguir o mesmo
 * padrão do WmodeClientService (provider externo, logger, falha graciosa: retorna
 * null em erro em vez de derrubar o fluxo que disparou o email).
 */
@Injectable()
export class ResendClientService {
  private readonly logger = new Logger(ResendClientService.name);
  private readonly apiKey: string;
  private readonly from: string;

  constructor(private readonly config: ConfigService) {
    this.apiKey = this.config.get<string>('RESEND_API_KEY', '');
    // Remetente verificado no Resend. Ex: "LemonFin <nao-responda@lemonfin.app>".
    this.from = this.config.get<string>(
      'MAIL_FROM',
      'LemonFin <onboarding@resend.dev>',
    );
  }

  async send({ to, subject, html, text }: SendEmailParams): Promise<boolean> {
    if (!this.apiKey) {
      // Sem chave (ex: dev local sem Resend), não falha o fluxo: loga e segue.
      // O código OTP fica salvo no banco; em dev dá pra ler de lá se preciso.
      this.logger.warn(
        `RESEND_API_KEY ausente — email "${subject}" para ${to} NÃO enviado (dev?).`,
      );
      return false;
    }

    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({ from: this.from, to, subject, html, text }),
      });

      if (!response.ok) {
        const body = await response.text();
        this.logger.error(`Resend send failed: ${response.status} - ${body}`);
        return false;
      }

      const data = (await response.json()) as { id?: string };
      this.logger.log(`Email "${subject}" enviado para ${to} [id:${data.id}]`);
      return true;
    } catch (error) {
      this.logger.error(`Resend send error: ${error}`);
      return false;
    }
  }
}
