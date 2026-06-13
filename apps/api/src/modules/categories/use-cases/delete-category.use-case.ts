import { Injectable, NotFoundException } from '@nestjs/common';
import { CategoriesRepository } from '../repositories/categories.repository';
import { FamilyContextService } from '../../families/services/family-context.service';

@Injectable()
export class DeleteCategoryUseCase {
  constructor(
    private readonly categoriesRepository: CategoriesRepository,
    private readonly familyContext: FamilyContextService,
  ) {}

  async execute(id: string, userId: string) {
    const userIds = await this.familyContext.resolveUserIds(userId);
    // Só categorias do escopo da família; de sistema não entram (userId null).
    const category = await this.categoriesRepository.findOwned(id, userIds);
    if (!category) {
      throw new NotFoundException('Categoria nao encontrada');
    }

    // Transações/recorrentes vão para "Outros"; metas vinculadas são removidas.
    await this.categoriesRepository.deleteAndReassign(id);
    return { success: true };
  }
}
