import { Injectable, NotFoundException } from '@nestjs/common';
import { ReservesRepository } from '../repositories/reserves.repository';
import { FamilyContextService } from '../../families/services/family-context.service';

@Injectable()
export class DeleteReserveUseCase {
  constructor(
    private readonly reservesRepository: ReservesRepository,
    private readonly familyContext: FamilyContextService,
  ) {}

  async execute(id: string, userId: string) {
    const userIds = await this.familyContext.resolveUserIds(userId);
    const reserve = await this.reservesRepository.findById(id, userIds);
    if (!reserve) {
      throw new NotFoundException('Reserva nao encontrada');
    }

    return this.reservesRepository.delete(id);
  }
}
