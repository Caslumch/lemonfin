import { Injectable, Logger } from '@nestjs/common';
import { SubscriptionStatus } from '@prisma/client';
import { BillingRepository } from '../repositories/billing.repository';
import { ProcessedStripeEventsRepository } from '../repositories/processed-stripe-events.repository';
import {
  StripeClientService,
  type StripeEvent,
  type StripeSubscription,
  type StripeInvoice,
  type StripeCheckoutSession,
} from '../services/stripe-client.service';
import { MailService } from '../../mail/services/mail.service';

@Injectable()
export class HandleStripeWebhookUseCase {
  private readonly logger = new Logger(HandleStripeWebhookUseCase.name);

  constructor(
    private readonly billing: BillingRepository,
    private readonly stripe: StripeClientService,
    private readonly mail: MailService,
    private readonly processedEvents: ProcessedStripeEventsRepository,
  ) {}

  async execute(event: StripeEvent): Promise<void> {
    // Idempotência DURÁVEL por event.id: claim no banco ANTES de processar —
    // o dedupe anterior era cache em memória e morria a cada restart do
    // Render, então um retry do Stripe pós-restart duplicava e-mails de
    // billing. Também cobre entrega concorrente em 2 instâncias.
    const fresh = await this.processedEvents.claim(event.id, event.type);
    if (!fresh) {
      this.logger.log(`Evento ${event.id} já processado — ignorando.`);
      return;
    }

    try {
      switch (event.type) {
        case 'checkout.session.completed':
          await this.onCheckoutCompleted(
            event.data.object as StripeCheckoutSession,
          );
          break;
        case 'customer.subscription.updated':
        case 'customer.subscription.created':
          await this.syncSubscription(event.data.object as StripeSubscription);
          break;
        case 'customer.subscription.deleted':
          await this.onSubscriptionDeleted(
            event.data.object as StripeSubscription,
          );
          break;
        case 'invoice.payment_succeeded':
        case 'invoice.payment_failed':
          await this.onInvoice(event.data.object as StripeInvoice, event.type);
          break;
        default:
          this.logger.debug(`Evento não tratado: ${event.type}`);
      }
    } catch (error) {
      // Falhou no meio: solta o claim para o evento poder ser reprocessado
      // (reenvio manual pelo dashboard — devolvemos 200 mesmo em erro, então
      // o retry automático não vem). Sem o release, o evento ficaria
      // "processado" sem efeito nenhum.
      await this.processedEvents.release(event.id);
      throw error;
    }
  }

  private async onCheckoutCompleted(
    session: StripeCheckoutSession,
  ): Promise<void> {
    const subId =
      typeof session.subscription === 'string'
        ? session.subscription
        : session.subscription?.id;
    if (!subId) return;
    // Busca a subscription completa para extrair status e período.
    const subscription = await this.stripe.getSubscription(subId);
    await this.syncSubscription(subscription);

    // Boas-vindas: o checkout.session.completed ocorre uma vez por compra, então
    // é o ponto certo para o email (sem repetir a cada subscription.updated).
    const user = await this.resolveUser(subscription);
    if (user) {
      await this.mail.sendSubscriptionWelcome(user.email, user.name);
    }
  }

  private async onSubscriptionDeleted(
    subscription: StripeSubscription,
  ): Promise<void> {
    const user = await this.resolveUser(subscription);
    if (!user) return;
    await this.billing.updateSubscription(user.id, {
      subscriptionStatus: SubscriptionStatus.CANCELED,
      stripeSubscriptionId: subscription.id,
      currentPeriodEnd: this.periodEnd(subscription),
    });
    this.logger.log(`Assinatura cancelada para user ${user.id}`);
    await this.mail.sendSubscriptionCanceled(user.email, user.name);
  }

  private async onInvoice(
    invoice: StripeInvoice,
    type: 'invoice.payment_succeeded' | 'invoice.payment_failed',
  ): Promise<void> {
    const customerId =
      typeof invoice.customer === 'string'
        ? invoice.customer
        : invoice.customer?.id;
    if (!customerId) return;
    const user = await this.billing.findByStripeCustomerId(customerId);
    if (!user) return;

    const status =
      type === 'invoice.payment_failed'
        ? SubscriptionStatus.PAST_DUE
        : SubscriptionStatus.ACTIVE;
    await this.billing.updateSubscription(user.id, {
      subscriptionStatus: status,
    });
    this.logger.log(`Invoice ${type} → ${status} para user ${user.id}`);

    if (type === 'invoice.payment_failed') {
      await this.mail.sendPaymentFailed(user.email, user.name);
    }
  }

  /** Sincroniza status + período a partir de um objeto Subscription do Stripe. */
  private async syncSubscription(
    subscription: StripeSubscription,
  ): Promise<void> {
    // `incomplete` = primeiro pagamento ainda em curso (ex.: 3DS aguardando
    // autenticação). NÃO rebaixa o status do usuário: quem está no trial
    // continuaria no trial; se o pagamento concluir vem `active`, se falhar
    // de vez vem `incomplete_expired` (aí sim CANCELED). Antes, o comprador
    // era marcado CANCELED no meio da autenticação do cartão.
    if (subscription.status === 'incomplete') {
      this.logger.log(
        `Subscription ${subscription.id} incomplete (pagamento em curso) — status mantido.`,
      );
      return;
    }

    const user = await this.resolveUser(subscription);
    if (!user) {
      const customerId =
        typeof subscription.customer === 'string'
          ? subscription.customer
          : subscription.customer?.id;
      this.logger.warn(
        `Subscription ${subscription.id} sem user mapeável (customer ${customerId ?? 'desconhecido'}).`,
      );
      return;
    }
    await this.billing.updateSubscription(user.id, {
      subscriptionStatus: this.mapStatus(subscription.status),
      stripeSubscriptionId: subscription.id,
      currentPeriodEnd: this.periodEnd(subscription),
    });
    this.logger.log(
      `Subscription ${subscription.id} → ${subscription.status} para user ${user.id}`,
    );
  }

  /** Resolve o user via customerId; cai no metadata.userId se preciso. */
  private async resolveUser(subscription: StripeSubscription) {
    const customerId =
      typeof subscription.customer === 'string'
        ? subscription.customer
        : subscription.customer?.id;
    if (customerId) {
      const byCustomer = await this.billing.findByStripeCustomerId(customerId);
      if (byCustomer) return byCustomer;
    }
    const userId = subscription.metadata?.userId;
    if (userId) return this.billing.findById(userId);
    return null;
  }

  private mapStatus(status: StripeSubscription['status']): SubscriptionStatus {
    switch (status) {
      case 'active':
      case 'trialing':
        return SubscriptionStatus.ACTIVE;
      case 'past_due':
      case 'unpaid':
        return SubscriptionStatus.PAST_DUE;
      case 'canceled':
      case 'incomplete_expired':
        return SubscriptionStatus.CANCELED;
      default:
        // paused (e demais): não dá acesso, trata como cancelado.
        // `incomplete` nunca chega aqui — é curto-circuitado no
        // syncSubscription para não rebaixar quem está autenticando o cartão.
        return SubscriptionStatus.CANCELED;
    }
  }

  /**
   * Em Stripe API recente, current_period_end vive no item da subscription,
   * não no objeto raiz. Lemos do primeiro item.
   */
  private periodEnd(subscription: StripeSubscription): Date | null {
    const item = subscription.items?.data?.[0];
    const ts = item?.current_period_end;
    return ts ? new Date(ts * 1000) : null;
  }
}
