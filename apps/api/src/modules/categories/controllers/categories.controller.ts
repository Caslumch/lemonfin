import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe';
import { ListCategoriesUseCase } from '../use-cases/list-categories.use-case';
import { CreateCategoryUseCase } from '../use-cases/create-category.use-case';
import { UpdateCategoryUseCase } from '../use-cases/update-category.use-case';
import { DeleteCategoryUseCase } from '../use-cases/delete-category.use-case';
import {
  createCategorySchema,
  updateCategorySchema,
} from '../dtos/category.dto';
import type {
  CreateCategoryInput,
  UpdateCategoryInput,
} from '../dtos/category.dto';

@Controller('categories')
@UseGuards(JwtAuthGuard)
export class CategoriesController {
  constructor(
    private readonly listCategories: ListCategoriesUseCase,
    private readonly createCategory: CreateCategoryUseCase,
    private readonly updateCategory: UpdateCategoryUseCase,
    private readonly deleteCategory: DeleteCategoryUseCase,
  ) {}

  @Get()
  list(@CurrentUser() user: { id: string }) {
    return this.listCategories.execute(user.id);
  }

  @Post()
  create(
    @CurrentUser() user: { id: string },
    @Body(new ZodValidationPipe(createCategorySchema))
    body: CreateCategoryInput,
  ) {
    return this.createCategory.execute(user.id, body);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateCategorySchema))
    body: UpdateCategoryInput,
  ) {
    return this.updateCategory.execute(id, user.id, body);
  }

  @Delete(':id')
  remove(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.deleteCategory.execute(id, user.id);
  }
}
