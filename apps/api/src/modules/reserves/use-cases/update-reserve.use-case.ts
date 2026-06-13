import { Injectable, NotFoundException } from '@nestjs/common';
import { ReservesRepository } from '../repositories/reserves.repository';
import { FamilyContextService } from '../../families/services/family-context.service';
import { UpdateReserveInput } from '../dtos/reserve.dto';

@Injectable()
export class UpdateReserveUseCase {
  constructor(
    private readonly reservesRepository: ReservesRepository,
    private readonly familyContext: FamilyContextService,
  ) {}

  async execute(id: string, userId: string, input: UpdateReserveInput) {
    const userIds = await this.familyContext.resolveUserIds(userId);
    const reserve = await this.reservesRepository.findById(id, userIds);
    if (!reserve) {
      throw new NotFoundException('Reserva nao encontrada');
    }

    return this.reservesRepository.update(id, input);
  }
}
