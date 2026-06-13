import { Injectable } from '@nestjs/common';
import { CategoriesRepository } from '../repositories/categories.repository';
import { FamilyContextService } from '../../families/services/family-context.service';

@Injectable()
export class ListCategoriesUseCase {
  constructor(
    private readonly categoriesRepository: CategoriesRepository,
    private readonly familyContext: FamilyContextService,
  ) {}

  // Categorias de sistema + da família. `editable` marca quais a UI pode
  // editar/excluir (as de sistema são read-only).
  async execute(userId: string) {
    const userIds = await this.familyContext.resolveUserIds(userId);
    const categories = await this.categoriesRepository.findForUser(userIds);

    return categories.map((c) => ({
      ...c,
      editable: c.userId !== null,
    }));
  }
}
