import { Controller, Get, UseGuards } from '@nestjs/common';
import { CategoriesRepository } from '../repositories/categories.repository';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';

@Controller('categories')
@UseGuards(JwtAuthGuard)
export class CategoriesController {
  constructor(private readonly categoriesRepository: CategoriesRepository) {}

  @Get()
  findAll() {
    return this.categoriesRepository.findAll();
  }
}
