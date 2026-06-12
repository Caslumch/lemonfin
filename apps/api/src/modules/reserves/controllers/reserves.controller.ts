import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe';
import { CreateReserveUseCase } from '../use-cases/create-reserve.use-case';
import { ListReservesUseCase } from '../use-cases/list-reserves.use-case';
import { createReserveSchema } from '../dtos/reserve.dto';
import type { CreateReserveInput } from '../dtos/reserve.dto';

@Controller('reserves')
@UseGuards(JwtAuthGuard)
export class ReservesController {
  constructor(
    private readonly createReserve: CreateReserveUseCase,
    private readonly listReserves: ListReservesUseCase,
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
}
