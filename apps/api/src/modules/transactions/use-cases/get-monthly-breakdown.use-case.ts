import { Injectable } from '@nestjs/common';
import { TransactionsRepository } from '../repositories/transactions.repository';

@Injectable()
export class GetMonthlyBreakdownUseCase {
  constructor(
    private readonly transactionsRepository: TransactionsRepository,
  ) {}

  async execute(userId: string, months?: number) {
    return this.transactionsRepository.getMonthlyBreakdown(userId, months);
  }
}
