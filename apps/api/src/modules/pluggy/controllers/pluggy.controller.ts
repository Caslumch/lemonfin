import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
  NotFoundException,
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
import { createConnectTokenSchema } from '../dtos/pluggy.dto';
import type { CreateConnectTokenInput } from '../dtos/pluggy.dto';

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

  /** Faturas de um cartão de crédito (Pluggy). */
  @Get('accounts/:pluggyAccountId/bills')
  async listBills(
    @CurrentUser() user: { id: string },
    @Param('pluggyAccountId') pluggyAccountId: string,
  ) {
    // Verificar que a conta pertence ao usuário
    const userIds = await this.familyContext.resolveUserIds(user.id);
    const accounts = await this.pluggyRepo.findAccountsByUser(userIds);
    const account = accounts.find((a) => a.pluggyAccountId === pluggyAccountId);
    if (!account) throw new NotFoundException('Conta não encontrada.');

    const bills = await this.pluggyClient.getCreditCardBills(pluggyAccountId);
    return bills.results ?? [];
  }

  /** Transações importadas da Pluggy para um cartão de crédito. */
  @Get('accounts/:pluggyAccountId/transactions')
  async listAccountTransactions(
    @CurrentUser() user: { id: string },
    @Param('pluggyAccountId') pluggyAccountId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const userIds = await this.familyContext.resolveUserIds(user.id);
    const accounts = await this.pluggyRepo.findAccountsByUser(userIds);
    const account = accounts.find((a) => a.pluggyAccountId === pluggyAccountId);
    if (!account) throw new NotFoundException('Conta não encontrada.');
    if (!account.linkedCardId) return [];

    return this.pluggyRepo.findCardTransactions({
      userIds,
      cardId: account.linkedCardId,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    });
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

    // Tenta disparar update na Pluggy. Items do MeuPluggy (proxy) não
    // aceitam update — nesse caso, apenas re-importa os dados existentes.
    try {
      await this.pluggyClient.updateItem(pluggyItemId);
    } catch {
      // MeuPluggy item ou outro erro — segue para sync local
    }

    await this.pluggyRepo.updateItemStatus(pluggyItemId, { status: 'UPDATING' });
    const result = await this.syncService.syncItem(pluggyItemId);

    return {
      message: `Sincronizado: ${result.accounts} contas, ${result.transactions} transações.`,
      ...result,
    };
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
