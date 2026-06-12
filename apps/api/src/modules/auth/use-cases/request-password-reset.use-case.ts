import { Injectable, Logger } from '@nestjs/common';
import { UsersRepository } from '../../users/repositories/users.repository';
import { VerificationService } from '../../verification/services/verification.service';
import { MailService } from '../../mail/services/mail.service';

/**
 * Inicia o fluxo "esqueci a senha". Resposta SEMPRE genérica (anti-enumeração):
 * não revela se existe conta com aquele email. Só emite/envia o OTP se a conta
 * existir de fato.
 */
@Injectable()
export class RequestPasswordResetUseCase {
  private readonly logger = new Logger(RequestPasswordResetUseCase.name);

  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly verification: VerificationService,
    private readonly mail: MailService,
  ) {}

  async execute(email: string) {
    const user = await this.usersRepository.findByEmail(email);

    if (user) {
      const code = await this.verification.issue(
        user.email,
        'PASSWORD_RESET',
        user.id,
      );
      const sent = await this.mail.sendPasswordResetCode(
        user.email,
        user.name,
        code,
      );
      if (!sent) {
        this.logger.warn(`Falha ao enviar OTP de reset para ${email}`);
      }
    }

    return {
      message:
        'Se houver uma conta com este e-mail, enviamos um código para redefinir a senha.',
    };
  }
}
