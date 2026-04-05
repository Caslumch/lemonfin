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
}
