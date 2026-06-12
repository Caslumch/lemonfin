import { Injectable } from '@nestjs/common';
import { SavingsGoalsRepository } from '../repositories/savings-goals.repository';
import { FamilyContextService } from '../../families/services/family-context.service';
import { computeSavingsProgress } from '../savings-goal-progress';

@Injectable()
export class ListSavingsGoalsUseCase {
  constructor(
    private readonly savingsGoalsRepository: SavingsGoalsRepository,
    private readonly familyContext: FamilyContextService,
  ) {}

  // Lista metas ativas da família com progresso calculado. Decimal → number
  // para serializar limpo no JSON da API.
  async execute(userId: string) {
    const userIds = await this.familyContext.resolveUserIds(userId);
    const goals = await this.savingsGoalsRepository.findManyActive(userIds);

    return goals.map((goal) => {
      const targetAmount = goal.targetAmount.toNumber();
      const savedAmount = goal.savedAmount.toNumber();
      return {
        ...goal,
        targetAmount,
        savedAmount,
        progress: computeSavingsProgress(
          targetAmount,
          savedAmount,
          goal.deadline,
        ),
      };
    });
  }
}
