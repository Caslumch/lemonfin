import { Injectable, Logger } from '@nestjs/common';
import { PluggyClientService } from '../services/pluggy-client.service';
import { PluggySyncService } from '../services/pluggy-sync.service';
import { PluggyRepository } from '../repositories/pluggy.repository';

interface PluggyWebhookPayload {
  event: string;
  itemId?: string;
  triggeredBy?: string;
  clientUserId?: string;
}

@Injectable()
export class HandlePluggyWebhookUseCase {
  private readonly logger = new Logger(HandlePluggyWebhookUseCase.name);

  constructor(
    private readonly pluggyClient: PluggyClientService,
    private readonly syncService: PluggySyncService,
    private readonly pluggyRepo: PluggyRepository,
  ) {}

  async execute(payload: PluggyWebhookPayload): Promise<void> {
    const { event, itemId } = payload;
    this.logger.log(`Webhook Pluggy: ${event} (item=${itemId})`);

    if (!itemId) {
      this.logger.debug(`Evento ${event} sem itemId — ignorando.`);
      return;
    }

    switch (event) {
      case 'item/created':
        await this.onItemCreated(itemId, payload.clientUserId);
        break;

      case 'item/updated':
        await this.onItemUpdated(itemId);
        break;

      case 'item/error':
        await this.onItemError(itemId);
        break;

      case 'item/login_succeeded':
        await this.pluggyRepo.updateItemStatus(itemId, { status: 'UPDATING' });
        break;

      case 'item/waiting_user_input':
      case 'item/waiting_user_action':
        await this.pluggyRepo.updateItemStatus(itemId, { status: 'WAITING_USER' });
        break;

      case 'item/deleted':
        await this.onItemDeleted(itemId);
        break;

      default:
        this.logger.debug(`Evento não tratado: ${event}`);
    }
  }

  private async onItemCreated(
    pluggyItemId: string,
    clientUserId?: string,
  ): Promise<void> {
    // Se o Item já existe no banco, é um retry — só atualiza.
    const existing = await this.pluggyRepo.findItemByPluggyId(pluggyItemId);
    if (existing) {
      await this.syncService.syncItem(pluggyItemId);
      return;
    }

    // Precisamos do userId do LemonFin. clientUserId é o userId que passamos
    // ao criar o Connect Token.
    if (!clientUserId) {
      this.logger.warn(
        `item/created sem clientUserId para Item ${pluggyItemId} — impossível vincular.`,
      );
      return;
    }

    // Buscar dados do Item na Pluggy para obter nome/logo do conector.
    const itemData = await this.pluggyClient.getItem(pluggyItemId);

    await this.pluggyRepo.createItem({
      userId: clientUserId,
      pluggyItemId,
      connectorName: itemData.connector?.name ?? 'Desconhecido',
      connectorLogo: itemData.connector?.imageUrl ?? undefined,
    });

    // Sincronizar contas e transações
    await this.syncService.syncItem(pluggyItemId);
  }

  private async onItemUpdated(pluggyItemId: string): Promise<void> {
    await this.syncService.syncItem(pluggyItemId);
  }

  private async onItemError(pluggyItemId: string): Promise<void> {
    const existing = await this.pluggyRepo.findItemByPluggyId(pluggyItemId);
    if (!existing) return;

    // Checar na API se é erro de login (precisa reconectar)
    try {
      const itemData = await this.pluggyClient.getItem(pluggyItemId);
      const isLoginError = itemData.status === 'LOGIN_ERROR';
      await this.pluggyRepo.updateItemStatus(pluggyItemId, {
        status: isLoginError ? 'LOGIN_ERROR' : 'ERROR',
      });
    } catch {
      await this.pluggyRepo.updateItemStatus(pluggyItemId, { status: 'ERROR' });
    }
  }

  private async onItemDeleted(pluggyItemId: string): Promise<void> {
    const existing = await this.pluggyRepo.findItemByPluggyId(pluggyItemId);
    if (!existing) return;

    await this.pluggyRepo.deleteAccountsByItem(pluggyItemId);
    await this.pluggyRepo.deleteItem(pluggyItemId);
    this.logger.log(`Item ${pluggyItemId} removido (webhook item/deleted).`);
  }
}
