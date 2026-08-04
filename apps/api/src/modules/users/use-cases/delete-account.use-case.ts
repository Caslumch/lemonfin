import {
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import Stripe from 'stripe';
import { PrismaService } from '../../../prisma/prisma.service';
import { phoneCandidates } from '../../whatsapp/services/phone-candidates';

// Exclusão de conta (LGPD — direito de eliminação). Re-autentica por senha,
// cancela a assinatura no Stripe (best-effort) e apaga o usuário + todos os
// dados relacionados.
@Injectable()
export class DeleteAccountUseCase {
  private readonly logger = new Logger(DeleteAccountUseCase.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async execute(userId: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('Usuario nao encontrado');
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('Senha incorreta');
    }

    // Stripe — best-effort: a exclusão prossegue mesmo se falhar (Stripe pode
    // estar sem chave, em test mode, ou o usuário sem assinatura). Além de
    // cancelar a assinatura, DELETA o customer: o direito de eliminação (LGPD)
    // alcança as cópias nos operadores, e o customer guarda nome/e-mail.
    const stripeKey = this.config.get<string>('STRIPE_SECRET_KEY');
    if (stripeKey && user.stripeSubscriptionId) {
      try {
        await new Stripe(stripeKey).subscriptions.cancel(
          user.stripeSubscriptionId,
        );
      } catch (err) {
        this.logger.warn(
          `Falha ao cancelar assinatura ${user.stripeSubscriptionId} na exclusao: ${err}`,
        );
      }
    }
    if (stripeKey && user.stripeCustomerId) {
      try {
        await new Stripe(stripeKey).customers.del(user.stripeCustomerId);
      } catch (err) {
        this.logger.warn(
          `Falha ao deletar customer ${user.stripeCustomerId} na exclusao: ${err}`,
        );
      }
    }

    // Dissolve as famílias das quais o usuário é DONO — a relação owner NÃO tem
    // onDelete Cascade, então deletar o usuário direto violaria a FK. Deletar a
    // família cascateia os FamilyMember. Em seguida deleta o usuário, cujo
    // cascade cuida de transações, cartões, metas, reservas, recorrentes,
    // categorias, orçamentos, membros de outras famílias, etc.
    //
    // ConversationState (estado/histórico da conversa do WhatsApp) é chaveado
    // por PHONE, sem FK — sem a limpeza explícita, a conversa sobreviveria à
    // exclusão da conta. Apaga por todas as formas equivalentes do número
    // (com/sem 9º dígito, com/sem 55).
    const phones = user.phone ? phoneCandidates(user.phone) : [];
    await this.prisma.$transaction([
      ...(phones.length > 0
        ? [
            this.prisma.conversationState.deleteMany({
              where: { phone: { in: phones } },
            }),
          ]
        : []),
      this.prisma.family.deleteMany({ where: { ownerId: userId } }),
      this.prisma.user.delete({ where: { id: userId } }),
    ]);

    this.logger.log(`Conta excluida [user:${userId}]`);
    return { deleted: true };
  }
}
