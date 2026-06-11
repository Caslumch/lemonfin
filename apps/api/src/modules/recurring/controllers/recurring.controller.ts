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
import { CreateRecurringUseCase } from '../use-cases/create-recurring.use-case';
import { ListRecurringUseCase } from '../use-cases/list-recurring.use-case';
import { UpdateRecurringUseCase } from '../use-cases/update-recurring.use-case';
import { DeleteRecurringUseCase } from '../use-cases/delete-recurring.use-case';
import {
  createRecurringSchema,
  updateRecurringSchema,
} from '../dtos/recurring.dto';
import type {
  CreateRecurringInput,
  UpdateRecurringInput,
} from '../dtos/recurring.dto';

@Controller('recurring')
@UseGuards(JwtAuthGuard)
export class RecurringController {
  constructor(
    private readonly createRecurring: CreateRecurringUseCase,
    private readonly listRecurring: ListRecurringUseCase,
    private readonly updateRecurring: UpdateRecurringUseCase,
    private readonly deleteRecurring: DeleteRecurringUseCase,
  ) {}

  @Post()
  create(
    @CurrentUser() user: { id: string },
    @Body(new ZodValidationPipe(createRecurringSchema)) body: CreateRecurringInput,
  ) {
    return this.createRecurring.execute(user.id, body);
  }

  @Get()
  list(@CurrentUser() user: { id: string }) {
    return this.listRecurring.execute(user.id);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateRecurringSchema)) body: UpdateRecurringInput,
  ) {
    return this.updateRecurring.execute(id, user.id, body);
  }

  @Delete(':id')
  remove(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.deleteRecurring.execute(id, user.id);
  }
}
