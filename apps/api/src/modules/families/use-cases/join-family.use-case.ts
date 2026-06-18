import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { FamiliesRepository } from '../repositories/families.repository';
import { MAX_FAMILY_MEMBERS } from '../family.constants';
import { UsersRepository } from '../../users/repositories/users.repository';
import { MailService } from '../../mail/services/mail.service';
import { WmodeClientService } from '../../whatsapp/services/wmode-client.service';

@Injectable()
export class JoinFamilyUseCase {
  private readonly logger = new Logger(JoinFamilyUseCase.name);

  constructor(
    private readonly familiesRepository: FamiliesRepository,
    private readonly usersRepository: UsersRepository,
    private readonly mail: MailService,
    private readonly wmodeClient: WmodeClientService,
  ) {}

  async execute(userId: string, code: string) {
    const currentFamily = await this.familiesRepository.findByUserId(userId);
    if (currentFamily) {
      throw new ConflictException('Voce ja faz parte de uma familia');
    }

    const family = await this.familiesRepository.findByCode(code);
    if (!family) {
      throw new NotFoundException('Codigo de convite invalido');
    }

    // Teto de membros: a assinatura do dono cobre todos, então limitamos para
    // evitar compartilhamento indefinido do código de convite.
    if (family.members.length >= MAX_FAMILY_MEMBERS) {
      throw new ConflictException(
        `Esta familia ja atingiu o limite de ${MAX_FAMILY_MEMBERS} membros`,
      );
    }

    await this.familiesRepository.addMember(family.id, userId);

    // Notifica (boas-vindas ao novo membro + aviso ao dono) sem bloquear nem
    // derrubar a entrada — qualquer falha de e-mail/WhatsApp só é logada.
    this.notifyJoin(userId, family.ownerId, family.name).catch((err) =>
      this.logger.error(`Falha ao notificar entrada na familia: ${err}`),
    );

    return this.familiesRepository.findByCode(code);
  }

  private async notifyJoin(
    newMemberId: string,
    ownerId: string,
    familyName: string,
  ) {
    const newMember = await this.usersRepository.findById(newMemberId);
    if (!newMember) return;

    // 1) Boas-vindas ao novo membro — e-mail.
    if (newMember.email) {
      await this.mail
        .sendFamilyWelcome(newMember.email, newMember.name, familyName)
        .catch((err) =>
          this.logger.error(`Falha no e-mail de boas-vindas: ${err}`),
        );
    }

    // 2) Boas-vindas ao novo membro — WhatsApp (se tiver telefone).
    if (newMember.phone) {
      const firstName = newMember.name.split(' ')[0];
      await this.wmodeClient
        .sendMessage({
          to: newMember.phone,
          content:
            `Tudo certo, ${firstName}! Você entrou na família *${familyName}* no LemonFin 🍋\n\n` +
            `Agora vocês compartilham as finanças por aqui. Se a família tem Premium, você já aproveita também.`,
        })
        .catch((err) =>
          this.logger.error(`Falha no WhatsApp ao novo membro: ${err}`),
        );
    }

    // 3) Avisa o dono da família (por WhatsApp) que alguém entrou.
    if (ownerId !== newMemberId) {
      const owner = await this.usersRepository.findById(ownerId);
      if (owner?.phone) {
        await this.wmodeClient
          .sendMessage({
            to: owner.phone,
            content:
              `Novidade na sua família *${familyName}*: *${newMember.name}* acabou de entrar 🎉\n\n` +
              `Os lançamentos de vocês agora aparecem juntos no LemonFin.`,
          })
          .catch((err) =>
            this.logger.error(`Falha no WhatsApp ao dono: ${err}`),
          );
      }
    }
  }
}
