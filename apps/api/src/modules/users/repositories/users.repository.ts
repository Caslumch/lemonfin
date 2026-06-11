import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class UsersRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } });
  }

  async findById(id: string) {
    return this.prisma.user.findUnique({ where: { id } });
  }

  async findByPhone(phone: string) {
    return this.prisma.user.findUnique({ where: { phone } });
  }

  async findAllWithPhone() {
    return this.prisma.user.findMany({
      where: { phone: { not: null } },
      select: { id: true, name: true, phone: true },
    });
  }

  async create(data: { name: string; email: string; passwordHash: string; phone?: string }) {
    return this.prisma.user.create({ data });
  }

  async update(id: string, data: { name?: string; phone?: string | null }) {
    return this.prisma.user.update({
      where: { id },
      data,
      select: { id: true, name: true, email: true, phone: true },
    });
  }

  async markOnboarded(id: string) {
    return this.prisma.user.update({
      where: { id },
      data: { onboardedAt: new Date() },
      select: { id: true, onboardedAt: true },
    });
  }

  async updatePassword(id: string, passwordHash: string) {
    return this.prisma.user.update({
      where: { id },
      data: { passwordHash },
      select: { id: true },
    });
  }

  async updateTwoFactor(
    id: string,
    data: {
      twoFactorEnabled?: boolean;
      twoFactorSecret?: string | null;
      backupCodes?: string[];
    },
  ) {
    return this.prisma.user.update({
      where: { id },
      data,
      select: {
        id: true,
        twoFactorEnabled: true,
      },
    });
  }
}
