import { Injectable, BadRequestException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { UsersRepository } from '../../users/repositories/users.repository';
import { VerificationService } from '../../verification/services/verification.service';

/**
 * Conclui o reset: valida o OTP de PASSWORD_RESET e troca a senha. O código é de
 * uso único (consumido dentro do verify), então não pode ser reutilizado.
 */
@Injectable()
export class ResetPasswordUseCase {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly verification: VerificationService,
  ) {}

  async execute(email: string, code: string, newPassword: string) {
    const result = await this.verification.verify(
      email,
      'PASSWORD_RESET',
      code,
    );

    if (!result.ok) {
      throw new BadRequestException(this.messageFor(result.reason));
    }

    const user = result.userId
      ? await this.usersRepository.findById(result.userId)
      : await this.usersRepository.findByEmail(email);

    if (!user) {
      // Não deveria acontecer (o código foi emitido para uma conta existente),
      // mas evita prosseguir sem usuário.
      throw new BadRequestException('Não foi possível redefinir a senha.');
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await this.usersRepository.updatePassword(user.id, passwordHash);

    return { reset: true };
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
