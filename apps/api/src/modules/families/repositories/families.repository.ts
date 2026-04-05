import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class FamiliesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: { name: string; code: string; ownerId: string }) {
    return this.prisma.family.create({
      data: {
        ...data,
        members: {
          create: { userId: data.ownerId, role: 'OWNER' },
        },
      },
      include: {
        members: {
          include: { user: { select: { id: true, name: true, email: true } } },
        },
      },
    });
  }

  async findByCode(code: string) {
    return this.prisma.family.findUnique({
      where: { code },
      include: {
        members: {
          include: { user: { select: { id: true, name: true, email: true } } },
        },
      },
    });
  }

  async findByUserId(userId: string) {
    const membership = await this.prisma.familyMember.findFirst({
      where: { userId },
      include: {
        family: {
          include: {
            members: {
              include: {
                user: { select: { id: true, name: true, email: true } },
              },
              orderBy: { joinedAt: 'asc' },
            },
          },
        },
      },
    });
    return membership?.family ?? null;
  }

  async addMember(familyId: string, userId: string) {
    return this.prisma.familyMember.create({
      data: { familyId, userId, role: 'MEMBER' },
    });
  }

  async removeMember(familyId: string, userId: string) {
    return this.prisma.familyMember.delete({
      where: { userId_familyId: { userId, familyId } },
    });
  }

  async isMember(familyId: string, userId: string) {
    const member = await this.prisma.familyMember.findUnique({
      where: { userId_familyId: { userId, familyId } },
    });
    return !!member;
  }

  async getMemberRole(familyId: string, userId: string) {
    const member = await this.prisma.familyMember.findUnique({
      where: { userId_familyId: { userId, familyId } },
    });
    return member?.role ?? null;
  }
}
