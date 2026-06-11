import { Injectable } from '@nestjs/common';
import { RecurringRepository } from '../repositories/recurring.repository';
import { FamilyContextService } from '../../families/services/family-context.service';

@Injectable()
export class ListRecurringUseCase {
  constructor(
    private readonly recurringRepository: RecurringRepository,
    private readonly familyContext: FamilyContextService,
  ) {}

  async execute(userId: string) {
    const userIds = await this.familyContext.resolveUserIds(userId);
    const items = await this.recurringRepository.findMany(userIds);

    return items.map((item) => ({
      ...item,
      amount: item.amount.toNumber(),
    }));
  }
}
