import { Injectable } from '@nestjs/common';
import { ReservesRepository } from '../repositories/reserves.repository';
import { CreateReserveInput } from '../dtos/reserve.dto';

@Injectable()
export class CreateReserveUseCase {
  constructor(private readonly reservesRepository: ReservesRepository) {}

  // Dono é o usuário que cria (per-user). A listagem é family-wide.
  async execute(userId: string, input: CreateReserveInput) {
    return this.reservesRepository.create({ ...input, userId });
  }
}
