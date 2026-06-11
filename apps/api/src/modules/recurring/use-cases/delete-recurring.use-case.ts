import { Injectable, NotFoundException } from '@nestjs/common';
import { RecurringRepository } from '../repositories/recurring.repository';
import { FamilyContextService } from '../../families/services/family-context.service';

@Injectable()
export class DeleteRecurringUseCase {
  constructor(
    private readonly recurringRepository: RecurringRepository,
    private readonly familyContext: FamilyContextService,
  ) {}

  async execute(id: string, userId: string) {
    const userIds = await this.familyContext.resolveUserIds(userId);
    const recurring = await this.recurringRepository.findById(id, userIds);
    if (!recurring) {
      throw new NotFoundException('Recorrencia nao encontrada');
    }

    return this.recurringRepository.delete(id);
  }
}
