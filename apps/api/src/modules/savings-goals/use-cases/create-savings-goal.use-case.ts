import { Injectable } from '@nestjs/common';
import { SavingsGoalsRepository } from '../repositories/savings-goals.repository';
import { CreateSavingsGoalInput } from '../dtos/savings-goal.dto';

@Injectable()
export class CreateSavingsGoalUseCase {
  constructor(
    private readonly savingsGoalsRepository: SavingsGoalsRepository,
  ) {}

  // Dono é o usuário que cria (per-user). A listagem é family-wide.
  async execute(userId: string, input: CreateSavingsGoalInput) {
    return this.savingsGoalsRepository.create({ ...input, userId });
  }
}
