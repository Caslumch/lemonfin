import { ConflictException, Injectable } from '@nestjs/common';
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
    // Rejeita nome repetido (case-insensitive): sem isto, criar "Pet" duas vezes
    // gerava duas categorias visualmente idênticas (o slug se desambiguava, o
    // nome não). 409 para a UI avisar.
    if (await this.categoriesRepository.nameTaken(userId, input.name)) {
      throw new ConflictException('Já existe uma categoria com esse nome');
    }

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
