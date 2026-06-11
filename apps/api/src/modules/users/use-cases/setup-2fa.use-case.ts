import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { generateSecret, generateURI } from 'otplib';
import * as QRCode from 'qrcode';
import { UsersRepository } from '../repositories/users.repository';

@Injectable()
export class SetupTwoFactorUseCase {
  constructor(private readonly usersRepository: UsersRepository) {}

  async execute(userId: string) {
    const user = await this.usersRepository.findById(userId);
    if (!user) {
      throw new NotFoundException('Usuario nao encontrado');
    }
    if (user.twoFactorEnabled) {
      throw new BadRequestException('2FA já está ativo');
    }

    const secret = generateSecret();
    const otpauth = generateURI({
      issuer: 'LemonFin',
      label: user.email,
      secret,
    });
    const qrCodeDataUrl = await QRCode.toDataURL(otpauth);

    // O secret volta em claro apenas nesta resposta, para o passo de enable.
    // O front guarda temporariamente e reenvia em /me/2fa/enable.
    return { secret, qrCodeDataUrl };
  }
}
