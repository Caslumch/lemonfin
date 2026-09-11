import { Injectable, Logger } from '@nestjs/common';
import { PluggyClientService } from './pluggy-client.service';
import { PluggyRepository } from '../repositories/pluggy.repository';
import { CategoriesRepository } from '../../categories/repositories/categories.repository';
import { CardsRepository } from '../../cards/repositories/cards.repository';
import { FamilyContextService } from '../../families/services/family-context.service';

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
    private readonly cardsRepo: CardsRepository,
    private readonly familyContext: FamilyContextService,
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
      // Resolver IDs da família para buscar cartões
      const userIds = await this.familyContext.resolveUserIds(userId);
      const userCards = await this.cardsRepo.findMany(userIds);

      // 1. Sincronizar contas
      const accountsResponse = await this.pluggyClient.getAccounts(pluggyItemId);
      const accounts = accountsResponse.results ?? [];

      for (const acc of accounts) {
        // Auto-link: se a conta é de crédito, tenta encontrar o Card do
        // LemonFin correspondente por nome fuzzy (ex: "VISA SIGNATURE" →
        // card "Bradesco" com brand "Visa"). Só faz auto-link se a conta
        // ainda não tem linkedCardId.
        const existing = await this.pluggyRepo.findAccountByPluggyId(acc.id);
        let linkedCardId = existing?.linkedCardId ?? undefined;

        if (!linkedCardId && acc.type === 'CREDIT') {
          linkedCardId = this.matchCard(acc.name, acc.number ?? '', userCards) ?? undefined;
          if (linkedCardId) {
            this.logger.log(
              `Auto-link: conta "${acc.name}" (···${acc.number}) → card ${linkedCardId}`,
            );
          }
        }

        // Extrair dados de crédito (creditData) se for conta de cartão
        const cd = acc.creditData;

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
          linkedCardId,
          creditLimit: cd?.creditLimit ?? undefined,
          availableCreditLimit: cd?.availableCreditLimit ?? undefined,
          balanceDueDate: cd?.balanceDueDate ? new Date(cd.balanceDueDate) : undefined,
          balanceCloseDate: cd?.balanceCloseDate ? new Date(cd.balanceCloseDate) : undefined,
          minimumPayment: cd?.minimumPayment ?? undefined,
        });
        totalAccounts++;

        // 2. Sincronizar transações de cada conta
        const txCount = await this.syncAccountTransactions(
          acc.id,
          userId,
          linkedCardId,
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
    cardId?: string,
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
      const amount = Math.abs(tx.amount);
      const date = new Date(tx.date);

      // Dedup: se já existe pelo externalId, o upsert cuida. Mas se existe
      // uma transação MANUAL com mesmo valor+tipo+data próxima, pula a
      // importação para evitar duplicata (o usuário já registrou no WhatsApp
      // ou manualmente).
      const alreadyImported = await this.pluggyRepo.findTransactionByExternalId(tx.id);
      if (!alreadyImported) {
        const manualDup = await this.pluggyRepo.findPossibleManualDuplicate({
          userId,
          amount,
          type,
          date,
        });
        if (manualDup) {
          this.logger.debug(
            `Duplicata manual detectada para tx ${tx.id} (${tx.description}) — vinculando externalId.`,
          );
          // Vincula o externalId à transação manual existente para evitar
          // reimportação em syncs futuros, sem criar duplicata.
          await this.pluggyRepo.upsertTransaction({
            externalId: tx.id,
            amount: manualDup.amount.toNumber(),
            type: manualDup.type as 'INCOME' | 'EXPENSE',
            description: manualDup.description ?? undefined,
            date: manualDup.date,
            userId,
            categoryId: manualDup.categoryId,
            cardId: manualDup.cardId ?? cardId,
          });
          count++;
          continue;
        }
      }

      // Resolver categoria
      const categorySlug = this.resolveCategory(tx.category ?? undefined);
      const category = await this.categoriesRepo.findBySlug(categorySlug);
      if (!category) {
        this.logger.warn(`Categoria '${categorySlug}' não encontrada — pulando tx ${tx.id}`);
        continue;
      }

      await this.pluggyRepo.upsertTransaction({
        externalId: tx.id,
        amount,
        type,
        description: tx.description || tx.descriptionRaw || undefined,
        date,
        userId,
        categoryId: category.id,
        cardId,
      });
      count++;
    }

    return count;
  }

  /**
   * Tenta encontrar o Card do LemonFin correspondente a uma conta de crédito
   * da Pluggy. Estratégias em ordem de prioridade:
   * 1. Match por nome do conector no nome do card (ex: "Bradesco" no card name)
   * 2. Match por brand extraída do nome da conta (ex: "VISA" → brand "Visa")
   * Retorna o cardId ou null se não encontrou.
   */
  private matchCard(
    accountName: string,
    accountNumber: string,
    cards: Array<{ id: string; name: string; brand: string | null }>,
  ): string | null {
    if (cards.length === 0) return null;
    const nameLower = accountName.toLowerCase();

    // 1. Match direto: nome do card contido no nome da conta ou vice-versa
    // Ex: conta "VISA SIGNATURE" vs card "Bradesco" — não bate.
    // Ex: conta "Nubank Ultravioleta" vs card "Nubank" — bate.
    for (const card of cards) {
      const cardLower = card.name.toLowerCase();
      if (nameLower.includes(cardLower) || cardLower.includes(nameLower)) {
        return card.id;
      }
    }

    // 2. Match por brand: extrair bandeira do nome da conta da Pluggy
    // Ex: conta "VISA SIGNATURE" → brand "visa" → card com brand "Visa"
    const brands = ['visa', 'mastercard', 'elo', 'amex', 'hipercard'];
    for (const brand of brands) {
      if (nameLower.includes(brand)) {
        const match = cards.find(
          (c) => c.brand && c.brand.toLowerCase().includes(brand),
        );
        if (match) return match.id;
      }
    }

    return null;
  }

  private resolveCategory(pluggyCategory?: string): string {
    if (!pluggyCategory) return 'outros';
    return PLUGGY_CATEGORY_MAP[pluggyCategory] ?? 'outros';
  }
}
