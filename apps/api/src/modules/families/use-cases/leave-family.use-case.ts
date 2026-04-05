import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { FamiliesRepository } from '../repositories/families.repository';

@Injectable()
export class LeaveFamilyUseCase {
  constructor(private readonly familiesRepository: FamiliesRepository) {}

  async execute(userId: string) {
    const family = await this.familiesRepository.findByUserId(userId);
    if (!family) {
      throw new NotFoundException('Voce nao faz parte de nenhuma familia');
    }

    const role = await this.familiesRepository.getMemberRole(family.id, userId);
    if (role === 'OWNER') {
      throw new ForbiddenException('O dono da familia nao pode sair. Transfira a posse primeiro.');
    }

    await this.familiesRepository.removeMember(family.id, userId);
  }
}
