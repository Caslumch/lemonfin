import { Injectable, NotFoundException } from '@nestjs/common';
import { GoalsRepository } from '../repositories/goals.repository';
import { FamilyContextService } from '../../families/services/family-context.service';
import { UpdateGoalInput } from '../dtos/goal.dto';

@Injectable()
export class UpdateGoalUseCase {
  constructor(
    private readonly goalsRepository: GoalsRepository,
    private readonly familyContext: FamilyContextService,
  ) {}

  async execute(id: string, userId: string, input: UpdateGoalInput) {
    const userIds = await this.familyContext.resolveUserIds(userId);
    const goal = await this.goalsRepository.findById(id, userIds);
    if (!goal) {
      throw new NotFoundException('Meta nao encontrada');
    }

    return this.goalsRepository.update(id, input);
  }
}
