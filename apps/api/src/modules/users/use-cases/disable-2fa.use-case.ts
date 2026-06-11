import {
  Injectable,
  UnauthorizedException,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { UsersRepository } from '../repositories/users.repository';
import { DisableTwoFactorInput } from '../dtos/two-factor.dto';

@Injectable()
export class DisableTwoFactorUseCase {
  constructor(private readonly usersRepository: UsersRepository) {}

  async execute(userId: string, input: DisableTwoFactorInput) {
    const user = await this.usersRepository.findById(userId);
    if (!user) {
      throw new NotFoundException('Usuario nao encontrado');
    }

    const passwordValid = await bcrypt.compare(
      input.password,
      user.passwordHash,
    );
    if (!passwordValid) {
      throw new UnauthorizedException('Senha incorreta');
    }

    await this.usersRepository.updateTwoFactor(userId, {
      twoFactorEnabled: false,
      twoFactorSecret: null,
      backupCodes: [],
    });

    return { success: true };
  }
}
