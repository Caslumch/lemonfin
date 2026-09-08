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
      include: { accounts: true },
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
  }) {
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
      },
      update: {
        name: data.name,
        type: data.type,
        subtype: data.subtype,
        number: data.number,
        balance: new Prisma.Decimal(data.balance),
        currencyCode: data.currencyCode,
      },
    });
  }

  async findAccountsByUser(userIds: string[]) {
    return this.prisma.bankAccount.findMany({
      where: { userId: { in: userIds } },
      include: { pluggyItem: { select: { connectorName: true, connectorLogo: true, status: true } } },
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
      },
      update: {
        amount: new Prisma.Decimal(Math.abs(data.amount)),
        type: data.type,
        description: data.description,
        date: data.date,
        categoryId: data.categoryId,
      },
    });
  }
}
