import {
  Controller,
  Get,
  Patch,
  Body,
  UseGuards,
  ConflictException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { UsersRepository } from '../repositories/users.repository';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersRepository: UsersRepository) {}

  @Get('me')
  async getProfile(@CurrentUser() user: { id: string }) {
    const found = await this.usersRepository.findById(user.id);
    if (!found) return null;
    return {
      id: found.id,
      name: found.name,
      email: found.email,
      phone: found.phone,
    };
  }

  @Patch('me')
  async updateProfile(
    @CurrentUser() user: { id: string },
    @Body() body: { name?: string; phone?: string | null },
  ) {
    // Validate phone uniqueness if changing
    if (body.phone) {
      const existing = await this.usersRepository.findByPhone(body.phone);
      if (existing && existing.id !== user.id) {
        throw new ConflictException('Telefone ja vinculado a outra conta');
      }
    }

    return this.usersRepository.update(user.id, {
      ...(body.name !== undefined && { name: body.name }),
      ...(body.phone !== undefined && { phone: body.phone || null }),
    });
  }
}
