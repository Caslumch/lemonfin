import { Injectable } from '@nestjs/common';
import { TransactionsRepository } from '../repositories/transactions.repository';

@Injectable()
export class GetCategoryBreakdownUseCase {
  constructor(
    private readonly transactionsRepository: TransactionsRepository,
  ) {}

  async execute(userId: string, startDate?: string, endDate?: string) {
    return this.transactionsRepository.getCategoryBreakdown(
      userId,
      startDate,
      endDate,
    );
  }
}
