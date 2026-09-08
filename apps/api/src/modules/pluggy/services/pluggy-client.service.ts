import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PluggyClient } from 'pluggy-sdk';

/**
 * Cliente fino sobre o SDK da Pluggy. Config-driven (PLUGGY_CLIENT_ID +
 * PLUGGY_CLIENT_SECRET), mesmo espírito do StripeClientService. Concentra o
 * acesso ao SDK para os use-cases não dependerem da Pluggy diretamente.
 *
 * Se as credenciais não estiverem setadas, `enabled` fica false e as
 * operações lançam erro — em dev sem Pluggy a app sobe normalmente.
 */
@Injectable()
export class PluggyClientService {
  private readonly logger = new Logger(PluggyClientService.name);
  private readonly clientId: string;
  private readonly clientSecret: string;

  constructor(private readonly config: ConfigService) {
    this.clientId = this.config.get<string>('PLUGGY_CLIENT_ID', '');
    this.clientSecret = this.config.get<string>('PLUGGY_CLIENT_SECRET', '');
    if (!this.clientId || !this.clientSecret) {
      this.logger.warn(
        'PLUGGY_CLIENT_ID/SECRET ausente — rotas de Open Finance ficarão indisponíveis.',
      );
    }
  }

  get enabled(): boolean {
    return Boolean(this.clientId && this.clientSecret);
  }

  /** Cria um client autenticado (API Key é gerada internamente pelo SDK). */
  private client(): PluggyClient {
    if (!this.enabled) {
      throw new Error(
        'Pluggy não configurado (PLUGGY_CLIENT_ID/SECRET ausente).',
      );
    }
    return new PluggyClient({
      clientId: this.clientId,
      clientSecret: this.clientSecret,
    });
  }

  /**
   * Gera um Connect Token para o widget do frontend. O token é single-session
   * (30min) e escopado — só permite acessar dados do Item criado por ele.
   *
   * SDK signature: createConnectToken(itemId?, options?)
   * - itemId: se passado, gera token para ATUALIZAR um Item existente
   * - options.clientUserId: mapeia o Item ao userId do LemonFin
   * - options.webhookUrl: onde receber notificações deste Item
   */
  async createConnectToken(params: {
    clientUserId: string;
    webhookUrl?: string;
    itemId?: string;
  }): Promise<string> {
    const client = this.client();
    const result = await client.createConnectToken(params.itemId, {
      clientUserId: params.clientUserId,
      webhookUrl: params.webhookUrl,
    });
    return result.accessToken;
  }

  /** Recupera um Item pelo ID. */
  async getItem(itemId: string) {
    const client = this.client();
    return client.fetchItem(itemId);
  }

  /** Remove um Item (desconecta a instituição). */
  async deleteItem(itemId: string): Promise<void> {
    const client = this.client();
    await client.deleteItem(itemId);
  }

  /** Força re-sync de um Item. */
  async updateItem(itemId: string) {
    const client = this.client();
    return client.updateItem(itemId);
  }

  /** Lista as contas de um Item. */
  async getAccounts(itemId: string) {
    const client = this.client();
    return client.fetchAccounts(itemId);
  }

  /**
   * Lista transações de uma conta (cursor-based). Usa fetchAllTransactions
   * para simplificar — ele já itera todas as páginas internamente.
   */
  async getAllTransactions(
    accountId: string,
    options?: { dateFrom?: string; dateTo?: string },
  ) {
    const client = this.client();
    return client.fetchAllTransactions(accountId, options);
  }
}
