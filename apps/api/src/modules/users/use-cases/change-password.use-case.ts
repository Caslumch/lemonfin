import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { UsersRepository } from '../repositories/users.repository';
import { ChangePasswordInput } from '../dtos/change-password.dto';

@Injectable()
export class ChangePasswordUseCase {
  constructor(private readonly usersRepository: UsersRepository) {}

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

    return { success: true };
  }
}
