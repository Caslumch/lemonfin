import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  UseGuards,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { PremiumGuard } from '../../../common/billing/premium.guard';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe';
import { FamilyContextService } from '../../families/services/family-context.service';
import { CreateConnectTokenUseCase } from '../use-cases/create-connect-token.use-case';
import { PluggyClientService } from '../services/pluggy-client.service';
import { PluggySyncService } from '../services/pluggy-sync.service';
import { PluggyRepository } from '../repositories/pluggy.repository';
import { createConnectTokenSchema, linkItemSchema } from '../dtos/pluggy.dto';
import type { CreateConnectTokenInput, LinkItemInput } from '../dtos/pluggy.dto';

@Controller('pluggy')
@UseGuards(JwtAuthGuard, PremiumGuard)
export class PluggyController {
  constructor(
    private readonly createConnectToken: CreateConnectTokenUseCase,
    private readonly pluggyClient: PluggyClientService,
    private readonly syncService: PluggySyncService,
    private readonly pluggyRepo: PluggyRepository,
    private readonly familyContext: FamilyContextService,
  ) {}

  /** Gera Connect Token para abrir o widget no frontend. */
  @Post('connect-token')
  async connectToken(
    @CurrentUser() user: { id: string },
    @Body(new ZodValidationPipe(createConnectTokenSchema))
    body: CreateConnectTokenInput,
  ) {
    return this.createConnectToken.execute(user.id, body.itemId);
  }

  /**
   * Vincula um Item já existente na Pluggy ao usuário do LemonFin.
   * Útil para Items criados via Demo App ou MeuPluggy OAuth.
   */
  @Post('items/link')
  async linkItem(
    @CurrentUser() user: { id: string },
    @Body(new ZodValidationPipe(linkItemSchema))
    body: LinkItemInput,
  ) {
    // Verificar se já existe
    const existing = await this.pluggyRepo.findItemByPluggyId(body.pluggyItemId);
    if (existing) throw new ConflictException('Este Item já está vinculado.');

    // Buscar dados do Item na Pluggy para validar que existe e obter info
    const itemData = await this.pluggyClient.getItem(body.pluggyItemId);

    await this.pluggyRepo.createItem({
      userId: user.id,
      pluggyItemId: body.pluggyItemId,
      connectorName: itemData.connector?.name ?? 'Desconhecido',
      connectorLogo: itemData.connector?.imageUrl ?? undefined,
    });

    // Sincronizar contas e transações
    const result = await this.syncService.syncItem(body.pluggyItemId);
    return {
      message: `Item vinculado. ${result.accounts} contas e ${result.transactions} transações importadas.`,
      ...result,
    };
  }

  /** Lista conexões (Items) do usuário/família. */
  @Get('items')
  async listItems(@CurrentUser() user: { id: string }) {
    const userIds = await this.familyContext.resolveUserIds(user.id);
    return this.pluggyRepo.findItemsByUser(userIds);
  }

  /** Lista contas bancárias reais do usuário/família. */
  @Get('accounts')
  async listAccounts(@CurrentUser() user: { id: string }) {
    const userIds = await this.familyContext.resolveUserIds(user.id);
    return this.pluggyRepo.findAccountsByUser(userIds);
  }

  /** Força re-sync de um Item. */
  @Post('items/:pluggyItemId/sync')
  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  async syncItem(
    @CurrentUser() user: { id: string },
    @Param('pluggyItemId') pluggyItemId: string,
  ) {
    const userIds = await this.familyContext.resolveUserIds(user.id);
    const items = await this.pluggyRepo.findItemsByUser(userIds);
    const item = items.find((i) => i.pluggyItemId === pluggyItemId);
    if (!item) throw new NotFoundException('Conexão não encontrada.');

    // Dispara update na Pluggy (que depois notifica via webhook)
    await this.pluggyClient.updateItem(pluggyItemId);
    await this.pluggyRepo.updateItemStatus(pluggyItemId, { status: 'UPDATING' });

    return { message: 'Sincronização iniciada.' };
  }

  /** Remove uma conexão. */
  @Delete('items/:pluggyItemId')
  async deleteItem(
    @CurrentUser() user: { id: string },
    @Param('pluggyItemId') pluggyItemId: string,
  ) {
    const userIds = await this.familyContext.resolveUserIds(user.id);
    const items = await this.pluggyRepo.findItemsByUser(userIds);
    const item = items.find((i) => i.pluggyItemId === pluggyItemId);
    if (!item) throw new NotFoundException('Conexão não encontrada.');

    // Remove na Pluggy e depois localmente
    try {
      await this.pluggyClient.deleteItem(pluggyItemId);
    } catch {
      // Se já foi removido na Pluggy, continua a limpeza local
    }
    await this.pluggyRepo.deleteAccountsByItem(pluggyItemId);
    await this.pluggyRepo.deleteItem(pluggyItemId);

    return { message: 'Conexão removida.' };
  }
}
