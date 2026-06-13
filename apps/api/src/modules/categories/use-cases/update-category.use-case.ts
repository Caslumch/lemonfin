import { Injectable, NotFoundException } from '@nestjs/common';
import { CategoriesRepository } from '../repositories/categories.repository';
import { FamilyContextService } from '../../families/services/family-context.service';
import {
  UpdateCategoryInput,
  CATEGORY_COLOR_PRESETS,
  CategoryColorPreset,
} from '../dtos/category.dto';

@Injectable()
export class UpdateCategoryUseCase {
  constructor(
    private readonly categoriesRepository: CategoriesRepository,
    private readonly familyContext: FamilyContextService,
  ) {}

  // O slug NÃO muda no rename: é estável após a criação (mantém referências do
  // parser e dispensa recalcular unicidade).
  async execute(id: string, userId: string, input: UpdateCategoryInput) {
    const userIds = await this.familyContext.resolveUserIds(userId);
    // Categorias de sistema (userId null) não entram em findOwned → NotFound,
    // o que bloqueia edição delas.
    const category = await this.categoriesRepository.findOwned(id, userIds);
    if (!category) {
      throw new NotFoundException('Categoria nao encontrada');
    }

    const data: {
      name?: string;
      icon?: string;
      colorBg?: string;
      colorText?: string;
    } = {};
    if (input.name !== undefined) data.name = input.name;
    if (input.icon !== undefined) data.icon = input.icon;
    if (input.colorPreset !== undefined) {
      const palette =
        CATEGORY_COLOR_PRESETS[input.colorPreset as CategoryColorPreset];
      data.colorBg = palette.colorBg;
      data.colorText = palette.colorText;
    }

    return this.categoriesRepository.update(id, data);
  }
}
