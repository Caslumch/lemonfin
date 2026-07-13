import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../../prisma/prisma.service';
import { UsersRepository } from '../repositories/users.repository';
import { ChangePasswordInput } from '../dtos/change-password.dto';

@Injectable()
export class ChangePasswordUseCase {
  constructor(
    private readonly usersRepository: UsersRepository,
    // Prisma direto (padrão do delete-account) para revogar as sessões sem
    // importar o AuthModule — auth já importa users; seria ciclo de DI.
    private readonly prisma: PrismaService,
  ) {}

  async execute(userId: string, input: ChangePasswordInput) {
    const user = await this.usersRepository.findById(userId);
    if (!user) {
      throw new NotFoundException('Usuario nao encontrado');
    }

    const currentValid = await bcrypt.compare(
      input.currentPassword,
      user.passwordHash,
    );
    if (!currentValid) {
      throw new UnauthorizedException('Senha atual incorreta');
    }

    const isSame = await bcrypt.compare(input.newPassword, user.passwordHash);
    if (isSame) {
      throw new BadRequestException('A nova senha deve ser diferente da atual');
    }

    const passwordHash = await bcrypt.hash(input.newPassword, 10);
    await this.usersRepository.updatePassword(userId, passwordHash);

    // Trocou a senha → derruba TODAS as sessões de longa duração. Se a troca
    // foi por suspeita de invasão, o invasor não pode continuar renovando.
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date(), revokedReason: 'security' },
    });

    return { success: true };
  }
}
