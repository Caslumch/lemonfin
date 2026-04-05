import { Injectable } from '@nestjs/common';
import { TransactionsRepository } from '../repositories/transactions.repository';
import { FamilyContextService } from '../../families/services/family-context.service';

@Injectable()
export class GetSummaryUseCase {
  constructor(
    private readonly transactionsRepository: TransactionsRepository,
    private readonly familyContext: FamilyContextService,
  ) {}

  async execute(
    userId: string,
    startDate?: string,
    endDate?: string,
  ) {
    const userIds = await this.familyContext.resolveUserIds(userId);
    return this.transactionsRepository.getSummary(userIds, startDate, endDate);
  }
}
