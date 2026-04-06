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
import { CreateGoalUseCase } from '../use-cases/create-goal.use-case';
import { ListGoalsUseCase } from '../use-cases/list-goals.use-case';
import { UpdateGoalUseCase } from '../use-cases/update-goal.use-case';
import { DeleteGoalUseCase } from '../use-cases/delete-goal.use-case';
import {
  createGoalSchema,
  updateGoalSchema,
} from '../dtos/goal.dto';
import type {
  CreateGoalInput,
  UpdateGoalInput,
} from '../dtos/goal.dto';

@Controller('goals')
@UseGuards(JwtAuthGuard)
export class GoalsController {
  constructor(
    private readonly createGoal: CreateGoalUseCase,
    private readonly listGoals: ListGoalsUseCase,
    private readonly updateGoal: UpdateGoalUseCase,
    private readonly deleteGoal: DeleteGoalUseCase,
  ) {}

  @Post()
  create(
    @CurrentUser() user: { id: string },
    @Body(new ZodValidationPipe(createGoalSchema)) body: CreateGoalInput,
  ) {
    return this.createGoal.execute(user.id, body);
  }

  @Get()
  list(@CurrentUser() user: { id: string }) {
    return this.listGoals.execute(user.id);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateGoalSchema)) body: UpdateGoalInput,
  ) {
    return this.updateGoal.execute(id, user.id, body);
  }

  @Delete(':id')
  remove(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
  ) {
    return this.deleteGoal.execute(id, user.id);
  }
}
