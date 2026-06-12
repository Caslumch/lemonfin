import { Injectable } from '@nestjs/common';
import { ReservesRepository } from '../repositories/reserves.repository';
import { FamilyContextService } from '../../families/services/family-context.service';
import { computeReserveProgress } from '../reserve-progress';

@Injectable()
export class ListReservesUseCase {
  constructor(
    private readonly reservesRepository: ReservesRepository,
    private readonly familyContext: FamilyContextService,
  ) {}

  // Lista reservas ativas da família com progresso calculado. Decimal → number
  // para serializar limpo no JSON da API.
  async execute(userId: string) {
    const userIds = await this.familyContext.resolveUserIds(userId);
    const reserves = await this.reservesRepository.findManyActive(userIds);

    return reserves.map((reserve) => {
      const targetAmount = reserve.targetAmount.toNumber();
      const savedAmount = reserve.savedAmount.toNumber();
      return {
        ...reserve,
        targetAmount,
        savedAmount,
        progress: computeReserveProgress(
          targetAmount,
          savedAmount,
          reserve.deadline,
        ),
      };
    });
  }
}
