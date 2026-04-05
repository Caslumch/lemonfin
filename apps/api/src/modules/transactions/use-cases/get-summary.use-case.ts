import { Injectable } from '@nestjs/common';
import { TransactionsRepository } from '../repositories/transactions.repository';

@Injectable()
export class GetSummaryUseCase {
  constructor(
    private readonly transactionsRepository: TransactionsRepository,
  ) {}

  async execute(
    userId: string,
    startDate?: string,
    endDate?: string,
  ) {
    return this.transactionsRepository.getSummary(userId, startDate, endDate);
  }
}
