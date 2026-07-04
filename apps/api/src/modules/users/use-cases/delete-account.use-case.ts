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

    // Cancela a assinatura no Stripe — best-effort: a exclusão prossegue mesmo
    // se falhar (Stripe pode estar sem chave, em test mode, ou o usuário sem
    // assinatura).
    if (user.stripeSubscriptionId) {
      const key = this.config.get<string>('STRIPE_SECRET_KEY');
      if (key) {
        try {
          await new Stripe(key).subscriptions.cancel(user.stripeSubscriptionId);
        } catch (err) {
          this.logger.warn(
            `Falha ao cancelar assinatura ${user.stripeSubscriptionId} na exclusao: ${err}`,
          );
        }
      }
    }

    // Dissolve as famílias das quais o usuário é DONO — a relação owner NÃO tem
    // onDelete Cascade, então deletar o usuário direto violaria a FK. Deletar a
    // família cascateia os FamilyMember. Em seguida deleta o usuário, cujo
    // cascade cuida de transações, cartões, metas, reservas, recorrentes,
    // categorias, orçamentos, membros de outras famílias, etc.
    await this.prisma.$transaction([
      this.prisma.family.deleteMany({ where: { ownerId: userId } }),
      this.prisma.user.delete({ where: { id: userId } }),
    ]);

    this.logger.log(`Conta excluida [user:${userId}]`);
    return { deleted: true };
  }
}
