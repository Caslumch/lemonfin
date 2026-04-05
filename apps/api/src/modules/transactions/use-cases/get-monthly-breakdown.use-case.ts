import { Injectable } from '@nestjs/common';
import { TransactionsRepository } from '../repositories/transactions.repository';
import { FamilyContextService } from '../../families/services/family-context.service';

@Injectable()
export class GetMonthlyBreakdownUseCase {
  constructor(
    private readonly transactionsRepository: TransactionsRepository,
    private readonly familyContext: FamilyContextService,
  ) {}

  async execute(userId: string, months?: number) {
    const userIds = await this.familyContext.resolveUserIds(userId);
    return this.transactionsRepository.getMonthlyBreakdown(userIds, months);
  }
}
