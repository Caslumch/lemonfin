import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

interface SendMessageParams {
  to: string;
  content: string;
}

/** Uma mensagem do lote. `ref` é opcional e devolvido intacto no resultado —
 * o chamador usa para casar o resultado de volta ao item de origem (ex.: as
 * dedupeKeys do claim, para dar release só no que foi recusado). */
export interface BulkMessageParams {
  to: string;
  content: string;
  ref?: unknown;
}

/** Resultado por destinatário devolvido pelo WMode, com o `ref` reanexado. */
export interface BulkItemResult {
  index: number;
  to: string;
  status: 'queued' | 'rejected';
  messageId?: string;
  statusCode?: number;
  reason?: string;
  retryAfterSeconds?: number;
  ref?: unknown;
}

export interface BulkResult {
  total: number;
  queued: number;
  rejected: number;
  results: BulkItemResult[];
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
   * Envio em LOTE: manda todos os destinatários numa única requisição e deixa o
   * WMode espaçar os envios com o próprio ritmo anti-ban. Substitui o loop de
   * `sendMessage` (uma chamada HTTP por usuário), que disparava em rajada e
   * furava o rate-limit do WMode.
   *
   * Devolve o resultado por item (queued/rejected). Em falha TOTAL (rede, 5xx,
   * sessão fora) devolve null — o chamador trata como "nada saiu" e mantém os
   * itens pendentes para o próximo cron. Cada item recusado (`rejected`, ex.:
   * 429 de rate-limit) traz o motivo e o `retryAfterSeconds`; o `ref` volta
   * intacto para o chamador reagir só aos recusados.
   */
  async sendBulk(messages: BulkMessageParams[]): Promise<BulkResult | null> {
    if (messages.length === 0) {
      return { total: 0, queued: 0, rejected: 0, results: [] };
    }
    const url = `${this.baseUrl}/api/v1/messages/bulk`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Api-Key': this.apiKey,
        },
        body: JSON.stringify({
          sessionId: this.sessionId,
          messages: messages.map(({ to, content }) => ({ to, content })),
        }),
      });

      if (!response.ok) {
        const body = await response.text();
        this.logger.error(`WMode bulk failed: ${response.status} - ${body}`);
        return null;
      }

      const data = (await response.json()) as BulkResult;
      // Reanexa o `ref` de cada item pela posição — o WMode preserva a ordem e
      // devolve `index`, mas casamos por índice do array de entrada por robustez.
      const results = data.results.map((r) => ({
        ...r,
        ref: messages[r.index]?.ref,
      }));
      this.logger.log(
        `WMode bulk: ${data.queued}/${data.total} enfileiradas, ${data.rejected} recusadas`,
      );
      return { ...data, results };
    } catch (error) {
      this.logger.error(`WMode bulk error: ${error}`);
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
