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
import { PremiumGuard } from '../../../common/billing/premium.guard';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe';
import { CreateRecurringUseCase } from '../use-cases/create-recurring.use-case';
import { ListRecurringUseCase } from '../use-cases/list-recurring.use-case';
import { UpdateRecurringUseCase } from '../use-cases/update-recurring.use-case';
import { DeleteRecurringUseCase } from '../use-cases/delete-recurring.use-case';
import { MaterializeRecurringUseCase } from '../use-cases/materialize-recurring.use-case';
import {
  createRecurringSchema,
  updateRecurringSchema,
  listRecurringQuerySchema,
} from '../dtos/recurring.dto';
import type {
  CreateRecurringInput,
  UpdateRecurringInput,
  ListRecurringQuery,
} from '../dtos/recurring.dto';

@Controller('recurring')
@UseGuards(JwtAuthGuard, PremiumGuard)
export class RecurringController {
  constructor(
    private readonly createRecurring: CreateRecurringUseCase,
    private readonly listRecurring: ListRecurringUseCase,
    private readonly updateRecurring: UpdateRecurringUseCase,
    private readonly deleteRecurring: DeleteRecurringUseCase,
    private readonly materializeRecurring: MaterializeRecurringUseCase,
  ) {}

  @Post()
  create(
    @CurrentUser() user: { id: string },
    @Body(new ZodValidationPipe(createRecurringSchema))
    body: CreateRecurringInput,
  ) {
    return this.createRecurring.execute(user.id, body);
  }

  @Get()
  list(
    @CurrentUser() user: { id: string },
    @Query(new ZodValidationPipe(listRecurringQuerySchema))
    query: ListRecurringQuery,
  ) {
    return this.listRecurring.execute(user.id, query);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateRecurringSchema))
    body: UpdateRecurringInput,
  ) {
    return this.updateRecurring.execute(id, user.id, body);
  }

  @Delete(':id')
  remove(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.deleteRecurring.execute(id, user.id);
  }

  // "Lançar agora": materializa a recorrência como transação de hoje, sem
  // esperar o cron diário. 409 se já foi lançada este mês (idempotência).
  @Post(':id/materialize')
  materialize(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.materializeRecurring.execute(id, user.id);
  }
}
