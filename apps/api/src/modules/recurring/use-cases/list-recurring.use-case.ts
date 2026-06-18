import { Injectable } from '@nestjs/common';
import { RecurringRepository } from '../repositories/recurring.repository';
import { FamilyContextService } from '../../families/services/family-context.service';
import { ListRecurringQuery } from '../dtos/recurring.dto';

@Injectable()
export class ListRecurringUseCase {
  constructor(
    private readonly recurringRepository: RecurringRepository,
    private readonly familyContext: FamilyContextService,
  ) {}

  async execute(userId: string, query: ListRecurringQuery) {
    const userIds = await this.familyContext.resolveScopedUserIds(
      userId,
      query.memberId,
    );
    const skip = (query.page - 1) * query.perPage;

    const { data, total, monthlyExpense, monthlyIncome } =
      await this.recurringRepository.findManyPaginated(userIds, {
        skip,
        take: query.perPage,
      });

    return {
      data: data.map((item) => ({
        ...item,
        amount: item.amount.toNumber(),
      })),
      meta: {
        total,
        page: query.page,
        perPage: query.perPage,
        totalPages: Math.ceil(total / query.perPage),
        // Totais agregados sobre todas as recorrentes ativas (não só a página).
        monthlyExpense,
        monthlyIncome,
      },
    };
  }
}
