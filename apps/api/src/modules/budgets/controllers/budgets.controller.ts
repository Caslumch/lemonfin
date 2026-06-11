import {
  Controller,
  Get,
  Put,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe';
import { UpsertBudgetUseCase } from '../use-cases/upsert-budget.use-case';
import { GetBudgetUseCase } from '../use-cases/get-budget.use-case';
import { upsertBudgetSchema } from '../dtos/budget.dto';
import type { UpsertBudgetInput } from '../dtos/budget.dto';

@Controller('budgets')
@UseGuards(JwtAuthGuard)
export class BudgetsController {
  constructor(
    private readonly upsertBudget: UpsertBudgetUseCase,
    private readonly getBudget: GetBudgetUseCase,
  ) {}

  @Get()
  get(
    @CurrentUser() user: { id: string },
    @Query('month') month?: string,
  ) {
    return this.getBudget.execute(user.id, month);
  }

  @Put()
  upsert(
    @CurrentUser() user: { id: string },
    @Body(new ZodValidationPipe(upsertBudgetSchema)) body: UpsertBudgetInput,
  ) {
    return this.upsertBudget.execute(user.id, body);
  }
}
