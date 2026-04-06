import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { CategoriesRepository } from '../../categories/repositories/categories.repository';
import { GoalsRepository } from '../repositories/goals.repository';
import { FamilyContextService } from '../../families/services/family-context.service';
import { CreateGoalInput } from '../dtos/goal.dto';

@Injectable()
export class CreateGoalUseCase {
  constructor(
    private readonly goalsRepository: GoalsRepository,
    private readonly categoriesRepository: CategoriesRepository,
    private readonly familyContext: FamilyContextService,
  ) {}

  async execute(userId: string, input: CreateGoalInput) {
    const category = await this.categoriesRepository.findById(input.categoryId);
    if (!category) {
      throw new NotFoundException('Categoria nao encontrada');
    }

    const userIds = await this.familyContext.resolveUserIds(userId);
    const existing = await this.goalsRepository.findByCategory(userIds, input.categoryId);
    if (existing) {
      throw new ConflictException('Ja existe uma meta ativa para esta categoria');
    }

    return this.goalsRepository.create({ ...input, userId });
  }
}
