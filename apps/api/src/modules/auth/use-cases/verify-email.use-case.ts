import { Injectable, BadRequestException } from '@nestjs/common';
import { UsersRepository } from '../../users/repositories/users.repository';
import { VerificationService } from '../../verification/services/verification.service';

/**
 * Confirma o email a partir do OTP. Em sucesso, marca emailVerifiedAt. Como a
 * confirmação NÃO bloqueia o login, este fluxo só "liga" o estado verificado
 * (e some o banner no front).
 */
@Injectable()
export class VerifyEmailUseCase {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly verification: VerificationService,
  ) {}

  async execute(email: string, code: string) {
    const result = await this.verification.verify(
      email,
      'EMAIL_VERIFICATION',
      code,
    );

    if (!result.ok) {
      throw new BadRequestException(this.messageFor(result.reason));
    }

    const user = result.userId
      ? await this.usersRepository.findById(result.userId)
      : await this.usersRepository.findByEmail(email);

    // Idempotente: se por algum motivo já estava verificado, não falha.
    if (user && !user.emailVerifiedAt) {
      await this.usersRepository.markEmailVerified(user.id);
    }

    return { verified: true };
  }

  private messageFor(reason: string): string {
    switch (reason) {
      case 'TOO_MANY_ATTEMPTS':
        return 'Muitas tentativas. Solicite um novo código.';
      case 'EXPIRED':
      case 'NOT_FOUND':
        return 'Código expirado ou inexistente. Solicite um novo código.';
      default:
        return 'Código inválido.';
    }
  }
}
