import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { BillingRepository } from '../repositories/billing.repository';
import { StripeClientService } from '../services/stripe-client.service';

@Injectable()
export class CreatePortalSessionUseCase {
  constructor(
    private readonly billing: BillingRepository,
    private readonly stripe: StripeClientService,
  ) {}

  async execute(userId: string): Promise<{ url: string }> {
    const user = await this.billing.findById(userId);
    if (!user) throw new NotFoundException('Usuário não encontrado');
    if (!user.stripeCustomerId) {
      throw new BadRequestException(
        'Usuário ainda não possui assinatura para gerenciar.',
      );
    }
    const url = await this.stripe.createPortalSession(user.stripeCustomerId);
    return { url };
  }
}
