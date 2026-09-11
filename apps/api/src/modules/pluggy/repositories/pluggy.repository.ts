import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class PluggyRepository {
  constructor(private readonly prisma: PrismaService) {}

  // ── PluggyItem ────────────────────────────────────────────────────────

  async createItem(data: {
    userId: string;
    pluggyItemId: string;
    connectorName: string;
    connectorLogo?: string;
  }) {
    return this.prisma.pluggyItem.create({
      data: {
        userId: data.userId,
        pluggyItemId: data.pluggyItemId,
        connectorName: data.connectorName,
        connectorLogo: data.connectorLogo,
      },
      include: { accounts: true },
    });
  }

  async findItemByPluggyId(pluggyItemId: string) {
    return this.prisma.pluggyItem.findUnique({
      where: { pluggyItemId },
      include: { accounts: true },
    });
  }

  async findItemsByUser(userIds: string[]) {
    return this.prisma.pluggyItem.findMany({
      where: { userId: { in: userIds } },
      include: {
        accounts: {
          include: {
            linkedCard: { select: { id: true, name: true, brand: true, closingDay: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateItemStatus(
    pluggyItemId: string,
    data: {
      status?: 'CONNECTED' | 'UPDATING' | 'WAITING_USER' | 'LOGIN_ERROR' | 'ERROR';
      lastSyncAt?: Date;
      connectorName?: string;
      connectorLogo?: string;
    },
  ) {
    return this.prisma.pluggyItem.update({
      where: { pluggyItemId },
      data,
      include: { accounts: true },
    });
  }

  async deleteItem(pluggyItemId: string) {
    return this.prisma.pluggyItem.delete({
      where: { pluggyItemId },
    });
  }

  // ── BankAccount ───────────────────────────────────────────────────────

  async upsertAccount(data: {
    userId: string;
    pluggyItemId: string;
    pluggyAccountId: string;
    name: string;
    type: string;
    subtype?: string;
    number?: string;
    balance: number;
    currencyCode: string;
    linkedCardId?: string;
    creditLimit?: number;
    availableCreditLimit?: number;
    balanceDueDate?: Date;
    balanceCloseDate?: Date;
    minimumPayment?: number;
  }) {
    const creditFields = {
      creditLimit: data.creditLimit != null ? new Prisma.Decimal(data.creditLimit) : null,
      availableCreditLimit: data.availableCreditLimit != null ? new Prisma.Decimal(data.availableCreditLimit) : null,
      balanceDueDate: data.balanceDueDate ?? null,
      balanceCloseDate: data.balanceCloseDate ?? null,
      minimumPayment: data.minimumPayment != null ? new Prisma.Decimal(data.minimumPayment) : null,
    };

    return this.prisma.bankAccount.upsert({
      where: { pluggyAccountId: data.pluggyAccountId },
      create: {
        userId: data.userId,
        pluggyItemId: data.pluggyItemId,
        pluggyAccountId: data.pluggyAccountId,
        name: data.name,
        type: data.type,
        subtype: data.subtype,
        number: data.number,
        balance: new Prisma.Decimal(data.balance),
        currencyCode: data.currencyCode,
        linkedCardId: data.linkedCardId,
        ...creditFields,
      },
      update: {
        name: data.name,
        type: data.type,
        subtype: data.subtype,
        number: data.number,
        balance: new Prisma.Decimal(data.balance),
        currencyCode: data.currencyCode,
        ...creditFields,
        // Não sobrescreve linkedCardId se já foi setado manualmente
        ...(data.linkedCardId && { linkedCardId: data.linkedCardId }),
      },
    });
  }

  async findAccountByPluggyId(pluggyAccountId: string) {
    return this.prisma.bankAccount.findUnique({
      where: { pluggyAccountId },
    });
  }

  async updateAccountLinkedCard(pluggyAccountId: string, linkedCardId: string | null) {
    return this.prisma.bankAccount.update({
      where: { pluggyAccountId },
      data: { linkedCardId },
    });
  }

  async findAccountsByUser(userIds: string[]) {
    return this.prisma.bankAccount.findMany({
      where: { userId: { in: userIds } },
      include: {
        pluggyItem: { select: { connectorName: true, connectorLogo: true, status: true } },
        linkedCard: { select: { id: true, name: true, brand: true, closingDay: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async deleteAccountsByItem(pluggyItemId: string) {
    return this.prisma.bankAccount.deleteMany({
      where: { pluggyItemId },
    });
  }

  // ── Transaction (dedup por externalId) ────────────────────────────────

  async findTransactionByExternalId(externalId: string) {
    return this.prisma.transaction.findUnique({
      where: { externalId },
    });
  }

  async upsertTransaction(data: {
    externalId: string;
    amount: number;
    type: 'INCOME' | 'EXPENSE';
    description?: string;
    date: Date;
    userId: string;
    categoryId: string;
    cardId?: string;
  }) {
    return this.prisma.transaction.upsert({
      where: { externalId: data.externalId },
      create: {
        externalId: data.externalId,
        amount: new Prisma.Decimal(Math.abs(data.amount)),
        type: data.type,
        description: data.description,
        date: data.date,
        source: 'PLUGGY',
        userId: data.userId,
        categoryId: data.categoryId,
        cardId: data.cardId,
      },
      update: {
        amount: new Prisma.Decimal(Math.abs(data.amount)),
        type: data.type,
        description: data.description,
        date: data.date,
        categoryId: data.categoryId,
        cardId: data.cardId,
      },
    });
  }

  /** Transações importadas pela Pluggy para um cartão num período.
   *  Só EXPENSE + source=PLUGGY: exclui manuais e pagamentos de fatura. */
  async findCardTransactions(params: {
    userIds: string[];
    cardId: string;
    startDate?: Date;
    endDate?: Date;
    take?: number;
  }) {
    return this.prisma.transaction.findMany({
      where: {
        userId: { in: params.userIds },
        cardId: params.cardId,
        source: 'PLUGGY',
        type: 'EXPENSE',
        ...(params.startDate || params.endDate
          ? {
              date: {
                ...(params.startDate && { gte: params.startDate }),
                ...(params.endDate && { lte: params.endDate }),
              },
            }
          : {}),
      },
      include: { category: true },
      orderBy: { date: 'desc' },
      ...(params.take && { take: params.take }),
    });
  }

  // Procura uma transação manual (sem externalId) com mesmo valor, tipo e
  // data próxima (±2 dias) — candidata a duplicata de uma importação Pluggy.
  async findPossibleManualDuplicate(params: {
    userId: string;
    amount: number;
    type: 'INCOME' | 'EXPENSE';
    date: Date;
  }) {
    const dayMs = 24 * 60 * 60 * 1000;
    const dateBefore = new Date(params.date.getTime() - 2 * dayMs);
    const dateAfter = new Date(params.date.getTime() + 2 * dayMs);

    return this.prisma.transaction.findFirst({
      where: {
        userId: params.userId,
        externalId: null, // só transações manuais
        amount: new Prisma.Decimal(Math.abs(params.amount)),
        type: params.type,
        date: { gte: dateBefore, lte: dateAfter },
      },
      orderBy: { date: 'desc' },
    });
  }
}
