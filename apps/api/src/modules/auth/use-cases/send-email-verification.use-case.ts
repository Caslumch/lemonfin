import { Injectable, Logger } from '@nestjs/common';
import { UsersRepository } from '../../users/repositories/users.repository';
import { VerificationService } from '../../verification/services/verification.service';
import { MailService } from '../../mail/services/mail.service';

/**
 * Dispara (ou redispara) o OTP de confirmação de email. Resposta sempre genérica:
 * não revela se o email existe nem se já está confirmado (anti-enumeração).
 */
@Injectable()
export class SendEmailVerificationUseCase {
  private readonly logger = new Logger(SendEmailVerificationUseCase.name);

  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly verification: VerificationService,
    private readonly mail: MailService,
  ) {}

  async execute(email: string) {
    const user = await this.usersRepository.findByEmail(email);

    // Só emite se a conta existe e ainda não confirmou. Em qualquer caso a
    // resposta é a mesma, para não vazar existência/estado da conta.
    if (user && !user.emailVerifiedAt) {
      const code = await this.verification.issue(
        user.email,
        'EMAIL_VERIFICATION',
        user.id,
      );
      const sent = await this.mail.sendEmailVerificationCode(
        user.email,
        user.name,
        code,
      );
      if (!sent) {
        this.logger.warn(`Falha ao enviar OTP de verificação para ${email}`);
      }
    }

    return {
      message:
        'Se houver uma conta com este e-mail aguardando confirmação, enviamos um código.',
    };
  }
}
