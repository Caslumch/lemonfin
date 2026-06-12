import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe';
import { CreateSavingsGoalUseCase } from '../use-cases/create-savings-goal.use-case';
import { ListSavingsGoalsUseCase } from '../use-cases/list-savings-goals.use-case';
import { createSavingsGoalSchema } from '../dtos/savings-goal.dto';
import type { CreateSavingsGoalInput } from '../dtos/savings-goal.dto';

@Controller('savings-goals')
@UseGuards(JwtAuthGuard)
export class SavingsGoalsController {
  constructor(
    private readonly createSavingsGoal: CreateSavingsGoalUseCase,
    private readonly listSavingsGoals: ListSavingsGoalsUseCase,
  ) {}

  @Post()
  create(
    @CurrentUser() user: { id: string },
    @Body(new ZodValidationPipe(createSavingsGoalSchema))
    body: CreateSavingsGoalInput,
  ) {
    return this.createSavingsGoal.execute(user.id, body);
  }

  @Get()
  list(@CurrentUser() user: { id: string }) {
    return this.listSavingsGoals.execute(user.id);
  }
}
