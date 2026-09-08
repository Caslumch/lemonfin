import { Injectable, Logger } from '@nestjs/common';
import { PluggyClientService } from './pluggy-client.service';
import { PluggyRepository } from '../repositories/pluggy.repository';
import { CategoriesRepository } from '../../categories/repositories/categories.repository';

/**
 * Mapa de categoria da Pluggy → slug de categoria do LemonFin. A Pluggy
 * retorna `category` como string livre (ex: "Transfers", "Bills", "Food").
 * Quando não há match, cai em "outros".
 */
const PLUGGY_CATEGORY_MAP: Record<string, string> = {
  // Alimentação
  'Food': 'alimentacao',
  'Restaurants': 'alimentacao',
  'Groceries': 'alimentacao',
  'Food & Groceries': 'alimentacao',

  // Transporte
  'Transportation': 'transporte',
  'Travel': 'transporte',
  'Gas': 'transporte',

  // Moradia
  'Housing': 'moradia',
  'Rent': 'moradia',
  'Utilities': 'moradia',

  // Saúde
  'Health': 'saude',
  'Healthcare': 'saude',
  'Pharmacy': 'saude',

  // Lazer
  'Entertainment': 'lazer',
  'Recreation': 'lazer',
  'Sports': 'lazer',

  // Educação
  'Education': 'educacao',

  // Compras
  'Shopping': 'compras',
  'Clothing': 'compras',
  'Electronics': 'compras',
  'Online Services': 'compras',

  // Salário / Receita
  'Salary': 'salario',
  'Income': 'salario',
  'Deposits': 'salario',

  // Outros / sem match
  'Transfers': 'outros',
  'Fees': 'outros',
  'Taxes': 'outros',
  'Insurance': 'outros',
  'Investments': 'outros',
};

@Injectable()
export class PluggySyncService {
  private readonly logger = new Logger(PluggySyncService.name);

  constructor(
    private readonly pluggyClient: PluggyClientService,
    private readonly pluggyRepo: PluggyRepository,
    private readonly categoriesRepo: CategoriesRepository,
  ) {}

  /**
   * Sincroniza contas e transações de um Item. Chamado pelo webhook handler
   * quando a Pluggy notifica `item/updated` ou `item/created`.
   */
  async syncItem(pluggyItemId: string): Promise<{
    accounts: number;
    transactions: number;
  }> {
    const item = await this.pluggyRepo.findItemByPluggyId(pluggyItemId);
    if (!item) {
      this.logger.warn(`Item ${pluggyItemId} não encontrado no banco — ignorando sync.`);
      return { accounts: 0, transactions: 0 };
    }

    const userId = item.userId;
    let totalAccounts = 0;
    let totalTransactions = 0;

    try {
      // 1. Sincronizar contas
      const accountsResponse = await this.pluggyClient.getAccounts(pluggyItemId);
      const accounts = accountsResponse.results ?? [];

      for (const acc of accounts) {
        await this.pluggyRepo.upsertAccount({
          userId,
          pluggyItemId,
          pluggyAccountId: acc.id,
          name: acc.name,
          type: acc.type,
          subtype: acc.subtype ?? undefined,
          number: acc.number ?? undefined,
          balance: acc.balance ?? 0,
          currencyCode: acc.currencyCode ?? 'BRL',
        });
        totalAccounts++;

        // 2. Sincronizar transações de cada conta
        const txCount = await this.syncAccountTransactions(
          acc.id,
          userId,
        );
        totalTransactions += txCount;
      }

      // 3. Atualizar status do Item
      await this.pluggyRepo.updateItemStatus(pluggyItemId, {
        status: 'CONNECTED',
        lastSyncAt: new Date(),
      });
    } catch (error) {
      this.logger.error(
        `Erro ao sincronizar Item ${pluggyItemId}: ${String(error)}`,
      );
      await this.pluggyRepo.updateItemStatus(pluggyItemId, {
        status: 'ERROR',
      });
      throw error;
    }

    this.logger.log(
      `Sync Item ${pluggyItemId}: ${totalAccounts} contas, ${totalTransactions} transações.`,
    );
    return { accounts: totalAccounts, transactions: totalTransactions };
  }

  private async syncAccountTransactions(
    pluggyAccountId: string,
    userId: string,
  ): Promise<number> {
    let count = 0;

    // Busca transações dos últimos 90 dias (janela razoável para sync incremental).
    // fetchAllTransactions já itera todas as páginas internamente.
    const from = new Date();
    from.setDate(from.getDate() - 90);
    const dateFrom = from.toISOString().split('T')[0];

    const transactions = await this.pluggyClient.getAllTransactions(
      pluggyAccountId,
      { dateFrom },
    );

    for (const tx of transactions) {
      // Determinar tipo: Pluggy usa DEBIT (saída) e CREDIT (entrada)
      const type = tx.type === 'CREDIT' ? 'INCOME' : 'EXPENSE';

      // Resolver categoria
      const categorySlug = this.resolveCategory(tx.category ?? undefined);
      const category = await this.categoriesRepo.findBySlug(categorySlug);
      if (!category) {
        this.logger.warn(`Categoria '${categorySlug}' não encontrada — pulando tx ${tx.id}`);
        continue;
      }

      await this.pluggyRepo.upsertTransaction({
        externalId: tx.id,
        amount: Math.abs(tx.amount),
        type,
        description: tx.description || tx.descriptionRaw || undefined,
        date: new Date(tx.date),
        userId,
        categoryId: category.id,
      });
      count++;
    }

    return count;
  }

  private resolveCategory(pluggyCategory?: string): string {
    if (!pluggyCategory) return 'outros';
    return PLUGGY_CATEGORY_MAP[pluggyCategory] ?? 'outros';
  }
}
