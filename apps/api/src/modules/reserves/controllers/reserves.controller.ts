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
import { PremiumGuard } from '../../../common/billing/premium.guard';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe';
import { CreateReserveUseCase } from '../use-cases/create-reserve.use-case';
import { ListReservesUseCase } from '../use-cases/list-reserves.use-case';
import { UpdateReserveUseCase } from '../use-cases/update-reserve.use-case';
import { DeleteReserveUseCase } from '../use-cases/delete-reserve.use-case';
import { createReserveSchema, updateReserveSchema } from '../dtos/reserve.dto';
import type {
  CreateReserveInput,
  UpdateReserveInput,
} from '../dtos/reserve.dto';

@Controller('reserves')
@UseGuards(JwtAuthGuard, PremiumGuard)
export class ReservesController {
  constructor(
    private readonly createReserve: CreateReserveUseCase,
    private readonly listReserves: ListReservesUseCase,
    private readonly updateReserve: UpdateReserveUseCase,
    private readonly deleteReserve: DeleteReserveUseCase,
  ) {}

  @Post()
  create(
    @CurrentUser() user: { id: string },
    @Body(new ZodValidationPipe(createReserveSchema))
    body: CreateReserveInput,
  ) {
    return this.createReserve.execute(user.id, body);
  }

  @Get()
  list(@CurrentUser() user: { id: string }) {
    return this.listReserves.execute(user.id);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateReserveSchema))
    body: UpdateReserveInput,
  ) {
    return this.updateReserve.execute(id, user.id, body);
  }

  @Delete(':id')
  remove(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.deleteReserve.execute(id, user.id);
  }
}
