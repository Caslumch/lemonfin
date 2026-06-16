import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';

export type BillingCycle = 'monthly' | 'yearly';

// O empacotamento de tipos do SDK (CJS x ESM) torna `Stripe.Subscription` etc.
// instáveis pelo import default sob `module: nodenext` (o símbolo `Stripe`
// resolve ora como classe, ora como namespace). Para não depender disso,
// fixamos o tipo da instância via InstanceType e derivamos os tipos de recurso
// a partir do retorno dos próprios métodos — sempre resolve e segue a versão
// instalada do SDK.
type StripeClient = InstanceType<typeof Stripe>;
export type StripeEvent = ReturnType<
  StripeClient['webhooks']['constructEvent']
>;
export type StripeSubscription = Awaited<
  ReturnType<StripeClient['subscriptions']['retrieve']>
>;
export type StripeInvoice = Awaited<
  ReturnType<StripeClient['invoices']['retrieve']>
>;
export type StripeCheckoutSession = Awaited<
  ReturnType<StripeClient['checkout']['sessions']['retrieve']>
>;

/**
 * Cliente fino sobre o SDK do Stripe. Config-driven (lê tudo do ConfigService),
 * no mesmo espírito do ResendClientService. Concentra aqui o acesso ao SDK para
 * os use-cases não dependerem do Stripe diretamente.
 *
 * Se STRIPE_SECRET_KEY não estiver setada, `enabled` fica false e as operações
 * lançam erro explícito — em dev sem Stripe a app sobe normalmente (as rotas de
 * billing é que falham, não o boot).
 */
@Injectable()
export class StripeClientService {
  private readonly logger = new Logger(StripeClientService.name);
  private readonly stripe: StripeClient | null;
  private readonly priceMonthly: string;
  private readonly priceYearly: string;
  private readonly webhookSecret: string;
  private readonly frontendUrl: string;

  constructor(private readonly config: ConfigService) {
    const secretKey = this.config.get<string>('STRIPE_SECRET_KEY', '');
    this.stripe = secretKey ? new Stripe(secretKey) : null;
    if (!this.stripe) {
      this.logger.warn(
        'STRIPE_SECRET_KEY ausente — rotas de billing ficarão indisponíveis.',
      );
    }
    this.priceMonthly = this.config.get<string>('STRIPE_PRICE_MONTHLY', '');
    this.priceYearly = this.config.get<string>('STRIPE_PRICE_YEARLY', '');
    this.webhookSecret = this.config.get<string>('STRIPE_WEBHOOK_SECRET', '');
    this.frontendUrl = this.config.get<string>(
      'FRONTEND_URL',
      'http://localhost:3000',
    );
  }

  get enabled(): boolean {
    return this.stripe !== null;
  }

  private client(): StripeClient {
    if (!this.stripe) {
      throw new Error('Stripe não configurado (STRIPE_SECRET_KEY ausente).');
    }
    return this.stripe;
  }

  priceFor(cycle: BillingCycle): string {
    const price = cycle === 'yearly' ? this.priceYearly : this.priceMonthly;
    if (!price) {
      throw new Error(
        `Price do Stripe não configurado para o ciclo "${cycle}".`,
      );
    }
    return price;
  }

  /** Cria (ou recupera) o customer do Stripe e devolve o id. */
  async ensureCustomer(params: {
    existingCustomerId: string | null;
    email: string;
    name: string;
    userId: string;
  }): Promise<string> {
    if (params.existingCustomerId) return params.existingCustomerId;
    const customer = await this.client().customers.create({
      email: params.email,
      name: params.name,
      // metadata permite mapear evento → user mesmo sem o customerId salvo ainda.
      metadata: { userId: params.userId },
    });
    return customer.id;
  }

  async createCheckoutSession(params: {
    customerId: string;
    cycle: BillingCycle;
    userId: string;
  }): Promise<string> {
    const session = await this.client().checkout.sessions.create({
      mode: 'subscription',
      customer: params.customerId,
      line_items: [{ price: this.priceFor(params.cycle), quantity: 1 }],
      // userId no metadata da subscription criada — robustez extra para o webhook.
      subscription_data: { metadata: { userId: params.userId } },
      success_url: `${this.frontendUrl}/assinar/sucesso?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${this.frontendUrl}/assinar`,
      allow_promotion_codes: true,
    });
    if (!session.url) throw new Error('Stripe não retornou URL de checkout.');
    return session.url;
  }

  async createPortalSession(customerId: string): Promise<string> {
    const session = await this.client().billingPortal.sessions.create({
      customer: customerId,
      return_url: `${this.frontendUrl}/configuracoes`,
    });
    return session.url;
  }

  /** Valida a assinatura do webhook e devolve o evento já parseado. */
  constructWebhookEvent(rawBody: Buffer, signature: string): StripeEvent {
    if (!this.webhookSecret) {
      throw new Error('STRIPE_WEBHOOK_SECRET ausente.');
    }
    return this.client().webhooks.constructEvent(
      rawBody,
      signature,
      this.webhookSecret,
    );
  }

  async getSubscription(id: string): Promise<StripeSubscription> {
    return this.client().subscriptions.retrieve(id);
  }
}
