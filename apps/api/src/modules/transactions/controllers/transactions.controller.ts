import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe';
import { CreateTransactionUseCase } from '../use-cases/create-transaction.use-case';
import { ListTransactionsUseCase } from '../use-cases/list-transactions.use-case';
import { UpdateTransactionUseCase } from '../use-cases/update-transaction.use-case';
import { DeleteTransactionUseCase } from '../use-cases/delete-transaction.use-case';
import { GetSummaryUseCase } from '../use-cases/get-summary.use-case';
import { GetMonthlyBreakdownUseCase } from '../use-cases/get-monthly-breakdown.use-case';
import { GetCategoryBreakdownUseCase } from '../use-cases/get-category-breakdown.use-case';
import { GetInsightsUseCase } from '../use-cases/get-insights.use-case';
import {
  createTransactionSchema,
  updateTransactionSchema,
  listTransactionsQuerySchema,
} from '../dtos/transaction.dto';
import type {
  CreateTransactionInput,
  UpdateTransactionInput,
  ListTransactionsQuery,
} from '../dtos/transaction.dto';

@Controller('transactions')
@UseGuards(JwtAuthGuard)
export class TransactionsController {
  constructor(
    private readonly createTransaction: CreateTransactionUseCase,
    private readonly listTransactions: ListTransactionsUseCase,
    private readonly updateTransaction: UpdateTransactionUseCase,
    private readonly deleteTransaction: DeleteTransactionUseCase,
    private readonly getSummary: GetSummaryUseCase,
    private readonly getMonthlyBreakdown: GetMonthlyBreakdownUseCase,
    private readonly getCategoryBreakdown: GetCategoryBreakdownUseCase,
    private readonly getInsights: GetInsightsUseCase,
  ) {}

  @Post()
  create(
    @CurrentUser() user: { id: string },
    @Body(new ZodValidationPipe(createTransactionSchema)) body: CreateTransactionInput,
  ) {
    return this.createTransaction.execute(user.id, body);
  }

  @Get()
  list(
    @CurrentUser() user: { id: string },
    @Query(new ZodValidationPipe(listTransactionsQuerySchema))
    query: ListTransactionsQuery,
  ) {
    return this.listTransactions.execute(user.id, query);
  }

  @Get('summary')
  summary(
    @CurrentUser() user: { id: string },
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.getSummary.execute(user.id, startDate, endDate);
  }

  @Get('monthly')
  monthly(
    @CurrentUser() user: { id: string },
    @Query('months') months?: string,
  ) {
    return this.getMonthlyBreakdown.execute(
      user.id,
      months ? parseInt(months, 10) : undefined,
    );
  }

  @Get('insights')
  insights(@CurrentUser() user: { id: string }) {
    return this.getInsights.execute(user.id);
  }

  @Get('by-category')
  byCategory(
    @CurrentUser() user: { id: string },
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.getCategoryBreakdown.execute(user.id, startDate, endDate);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateTransactionSchema))
    body: UpdateTransactionInput,
  ) {
    return this.updateTransaction.execute(id, user.id, body);
  }

  @Delete(':id')
  remove(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
  ) {
    return this.deleteTransaction.execute(id, user.id);
  }
}
