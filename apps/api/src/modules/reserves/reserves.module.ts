import { Module } from '@nestjs/common';
import { ReservesController } from './controllers/reserves.controller';
import { ReservesRepository } from './repositories/reserves.repository';
import { CreateReserveUseCase } from './use-cases/create-reserve.use-case';
import { ListReservesUseCase } from './use-cases/list-reserves.use-case';
import { FamiliesModule } from '../families/families.module';

@Module({
  imports: [FamiliesModule],
  controllers: [ReservesController],
  providers: [ReservesRepository, CreateReserveUseCase, ListReservesUseCase],
  exports: [ReservesRepository],
})
export class ReservesModule {}
