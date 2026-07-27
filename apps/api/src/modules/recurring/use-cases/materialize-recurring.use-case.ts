import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { RecurringRepository } from '../repositories/recurring.repository';
import { RecurringMaterializerService } from '../services/recurring-materializer.service';
import { FamilyContextService } from '../../families/services/family-context.service';

@Injectable()
export class MaterializeRecurringUseCase {
  constructor(
    private readonly recurringRepository: RecurringRepository,
    private readonly materializer: RecurringMaterializerService,
    private readonly familyContext: FamilyContextService,
  ) {}

  // "Lançar agora": materializa a recorrência como transação HOJE, sem esperar o
  // cron. Data ancorada ao meio-dia UTC (convenção noon-UTC do app — evita
  // deslocar o dia civil no fuso do Brasil). Idempotente por mês: se a recorrência
  // já foi lançada neste mês (pelo cron ou por um clique anterior), NÃO duplica —
  // 409 para a UI avisar "já lançada este mês".
  async execute(id: string, userId: string) {
    const userIds = await this.familyContext.resolveUserIds(userId);

    const recurring = await this.recurringRepository.findById(id, userIds);
    if (!recurring) {
      throw new NotFoundException('Recorrencia nao encontrada');
    }
    if (!recurring.active) {
      throw new ConflictException('Recorrencia pausada — reative para lancar');
    }

    const now = new Date();
    const today = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 12),
    );

    const { created } = await this.materializer.materializeOne(
      recurring,
      today,
    );
    if (!created) {
      throw new ConflictException('Essa recorrencia ja foi lancada este mes');
    }

    return { ok: true };
  }
}
