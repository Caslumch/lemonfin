import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { ReservesRepository } from '../repositories/reserves.repository';
import { TransactionsRepository } from '../../transactions/repositories/transactions.repository';
import { CategoriesRepository } from '../../categories/repositories/categories.repository';
import { FamilyContextService } from '../../families/services/family-context.service';

@Injectable()
export class ContributeReserveUseCase {
  constructor(
    private readonly reservesRepository: ReservesRepository,
    private readonly transactionsRepository: TransactionsRepository,
    private readonly categoriesRepository: CategoriesRepository,
    private readonly familyContext: FamilyContextService,
  ) {}

  // Aporte numa reserva pelo app web. Espelha EXATAMENTE o fluxo do WhatsApp
  // (handleReserveContribution): o aporte (1) vira uma DESPESA na categoria
  // "reservas" — sai do disponível do mês — e (2) incrementa o savedAmount da
  // reserva (atômico, desativa ao completar). Manter os dois caminhos idênticos
  // evita divergência: guardar pelo web e pelo zap tem o mesmo efeito no saldo.
  async execute(id: string, userId: string, amount: number) {
    const userIds = await this.familyContext.resolveUserIds(userId);
    const reserve = await this.reservesRepository.findById(id, userIds);
    if (!reserve) {
      throw new NotFoundException('Reserva nao encontrada');
    }

    const category = await this.categoriesRepository.findBySlug('reservas');
    if (!category) {
      throw new InternalServerErrorException(
        'Categoria de reservas nao encontrada',
      );
    }

    // 1) Aporte vira DESPESA (saiu do disponível do mês). Lançado no nome do
    //    dono do aporte (userId), não do dono da reserva.
    await this.transactionsRepository.create({
      amount,
      type: 'EXPENSE',
      description: `Guardado: ${reserve.name}`,
      source: 'MANUAL',
      userId,
      categoryId: category.id,
    });

    // 2) Incrementa o acumulado da reserva (desativa se completou).
    return this.reservesRepository.addContribution(id, amount);
  }
}
