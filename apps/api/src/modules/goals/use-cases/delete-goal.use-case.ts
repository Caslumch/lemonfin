import { Injectable, NotFoundException } from '@nestjs/common';
import { GoalsRepository } from '../repositories/goals.repository';
import { FamilyContextService } from '../../families/services/family-context.service';

@Injectable()
export class DeleteGoalUseCase {
  constructor(
    private readonly goalsRepository: GoalsRepository,
    private readonly familyContext: FamilyContextService,
  ) {}

  async execute(id: string, userId: string) {
    const userIds = await this.familyContext.resolveUserIds(userId);
    const goal = await this.goalsRepository.findById(id, userIds);
    if (!goal) {
      throw new NotFoundException('Meta nao encontrada');
    }

    return this.goalsRepository.delete(id);
  }
}
