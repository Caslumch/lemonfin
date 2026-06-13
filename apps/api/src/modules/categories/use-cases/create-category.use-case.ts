import { Injectable } from '@nestjs/common';
import { CategoriesRepository } from '../repositories/categories.repository';
import {
  CreateCategoryInput,
  CATEGORY_COLOR_PRESETS,
  CategoryColorPreset,
  slugify,
} from '../dtos/category.dto';

@Injectable()
export class CreateCategoryUseCase {
  constructor(private readonly categoriesRepository: CategoriesRepository) {}

  // Dono é quem cria (per-user); a listagem é family-wide. O slug é gerado a
  // partir do nome e recebe sufixo numérico se já existir (sistema ou próprias).
  async execute(userId: string, input: CreateCategoryInput) {
    const taken = await this.categoriesRepository.getTakenSlugs(userId);

    const base = slugify(input.name) || 'categoria';
    let slug = base;
    let n = 2;
    while (taken.has(slug)) {
      slug = `${base}-${n++}`;
    }

    const palette =
      CATEGORY_COLOR_PRESETS[input.colorPreset as CategoryColorPreset];

    return this.categoriesRepository.create({
      name: input.name,
      slug,
      icon: input.icon,
      colorBg: palette.colorBg,
      colorText: palette.colorText,
      userId,
    });
  }
}
