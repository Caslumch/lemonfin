import { Injectable, NotFoundException } from '@nestjs/common';
import { BillingRepository } from '../repositories/billing.repository';
import {
  StripeClientService,
  type BillingCycle,
} from '../services/stripe-client.service';

@Injectable()
export class CreateCheckoutSessionUseCase {
  constructor(
    private readonly billing: BillingRepository,
    private readonly stripe: StripeClientService,
  ) {}

  async execute(userId: string, cycle: BillingCycle): Promise<{ url: string }> {
    const user = await this.billing.findById(userId);
    if (!user) throw new NotFoundException('Usuário não encontrado');

    const customerId = await this.stripe.ensureCustomer({
      existingCustomerId: user.stripeCustomerId,
      email: user.email,
      name: user.name,
      userId: user.id,
    });
    // Persiste o customerId na primeira vez para reuso e mapeamento no webhook.
    if (customerId !== user.stripeCustomerId) {
      await this.billing.setStripeCustomerId(user.id, customerId);
    }

    const url = await this.stripe.createCheckoutSession({
      customerId,
      cycle,
      userId: user.id,
    });
    return { url };
  }
}
