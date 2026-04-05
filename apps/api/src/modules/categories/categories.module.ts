import { Module } from '@nestjs/common';
import { CategoriesController } from './controllers/categories.controller';
import { CategoriesRepository } from './repositories/categories.repository';

@Module({
  controllers: [CategoriesController],
  providers: [CategoriesRepository],
  exports: [CategoriesRepository],
})
export class CategoriesModule {}
