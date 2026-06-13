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

  // Lista as reservas da família (ativas + concluídas) com progresso calculado.
  // Decimal → number para serializar limpo no JSON da API. O WhatsApp usa
  // findManyActive direto no repo; a tela web quer ver tudo.
  async execute(userId: string) {
    const userIds = await this.familyContext.resolveUserIds(userId);
    const reserves = await this.reservesRepository.findMany(userIds);

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
