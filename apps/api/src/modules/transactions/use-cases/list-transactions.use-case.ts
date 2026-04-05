import { Injectable } from '@nestjs/common';
import { TransactionsRepository } from '../repositories/transactions.repository';
import { ListTransactionsQuery } from '../dtos/transaction.dto';

@Injectable()
export class ListTransactionsUseCase {
  constructor(
    private readonly transactionsRepository: TransactionsRepository,
  ) {}

  async execute(userId: string, query: ListTransactionsQuery) {
    const skip = (query.page - 1) * query.perPage;

    const { data, total } = await this.transactionsRepository.findMany({
      userId,
      type: query.type,
      categoryId: query.categoryId,
      startDate: query.startDate,
      endDate: query.endDate,
      orderBy: query.orderBy,
      order: query.order,
      skip,
      take: query.perPage,
    });

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
