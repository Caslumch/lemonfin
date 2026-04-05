import { Injectable, NotFoundException } from '@nestjs/common';
import { CategoriesRepository } from '../../categories/repositories/categories.repository';
import { TransactionsRepository } from '../repositories/transactions.repository';
import { CreateTransactionInput } from '../dtos/transaction.dto';

@Injectable()
export class CreateTransactionUseCase {
  constructor(
    private readonly transactionsRepository: TransactionsRepository,
    private readonly categoriesRepository: CategoriesRepository,
  ) {}

  async execute(userId: string, input: CreateTransactionInput) {
    const category = await this.categoriesRepository.findById(input.categoryId);
    if (!category) {
      throw new NotFoundException('Categoria nao encontrada');
    }

    return this.transactionsRepository.create({
      ...input,
      userId,
    });
  }
}
