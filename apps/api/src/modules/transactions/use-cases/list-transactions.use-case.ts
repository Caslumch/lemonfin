import { Injectable } from '@nestjs/common';
import { TransactionsRepository } from '../repositories/transactions.repository';
import { FamilyContextService } from '../../families/services/family-context.service';
import { ListTransactionsQuery } from '../dtos/transaction.dto';

@Injectable()
export class ListTransactionsUseCase {
  constructor(
    private readonly transactionsRepository: TransactionsRepository,
    private readonly familyContext: FamilyContextService,
  ) {}

  async execute(userId: string, query: ListTransactionsQuery) {
    const userIds = await this.familyContext.resolveScopedUserIds(
      userId,
      query.memberId,
    );
    const skip = (query.page - 1) * query.perPage;

    const opts = {
      userIds,
      type: query.type,
      categoryId: query.categoryId,
      search: query.search,
      startDate: query.startDate,
      endDate: query.endDate,
      orderBy: query.orderBy,
      order: query.order,
      skip,
      take: query.perPage,
    };

    // Por padrão a listagem AGRUPA compras parceladas numa linha só (a compra),
    // ancorada no mês da 1ª parcela. `grouped=false` volta ao modo "uma linha
    // por parcela" (cada parcela no seu mês).
    const { data, total } =
      query.grouped === false
        ? await this.transactionsRepository.findMany(opts)
        : await this.transactionsRepository.findManyGrouped(opts);

    return {
      data,
      meta: {
        total,
        page: query.page,
        perPage: query.perPage,
        totalPages: Math.ceil(total / query.perPage),
      },
    };
  }
}
