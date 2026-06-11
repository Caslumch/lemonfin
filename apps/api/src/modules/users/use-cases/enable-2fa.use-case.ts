import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { verify as verifyOtp } from 'otplib';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { UsersRepository } from '../repositories/users.repository';
import { encryptSecret } from '../../../common/crypto/totp-crypto';
import { EnableTwoFactorInput } from '../dtos/two-factor.dto';

@Injectable()
export class EnableTwoFactorUseCase {
  constructor(private readonly usersRepository: UsersRepository) {}

  async execute(userId: string, input: EnableTwoFactorInput) {
    const user = await this.usersRepository.findById(userId);
    if (!user) {
      throw new NotFoundException('Usuario nao encontrado');
    }
    if (user.twoFactorEnabled) {
      throw new BadRequestException('2FA já está ativo');
    }

    const result = await verifyOtp({
      token: input.code,
      secret: input.secret,
      epochTolerance: 30,
    });
    if (!result.valid) {
      throw new BadRequestException('Código inválido');
    }

    // Gera 8 backup codes no formato XXXX-XXXX (hex uppercase).
    const plainCodes = Array.from({ length: 8 }, () => {
      const hex = crypto.randomBytes(4).toString('hex').toUpperCase();
      return `${hex.slice(0, 4)}-${hex.slice(4, 8)}`;
    });
    const hashedCodes = await Promise.all(
      plainCodes.map((code) => bcrypt.hash(code, 10)),
    );

    await this.usersRepository.updateTwoFactor(userId, {
      twoFactorEnabled: true,
      twoFactorSecret: encryptSecret(input.secret),
      backupCodes: hashedCodes,
    });

    return { success: true, backupCodes: plainCodes };
  }
}
