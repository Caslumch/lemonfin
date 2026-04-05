import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { FamiliesRepository } from '../repositories/families.repository';

@Injectable()
export class JoinFamilyUseCase {
  constructor(private readonly familiesRepository: FamiliesRepository) {}

  async execute(userId: string, code: string) {
    const currentFamily = await this.familiesRepository.findByUserId(userId);
    if (currentFamily) {
      throw new ConflictException('Voce ja faz parte de uma familia');
    }

    const family = await this.familiesRepository.findByCode(code);
    if (!family) {
      throw new NotFoundException('Codigo de convite invalido');
    }

    await this.familiesRepository.addMember(family.id, userId);

    return this.familiesRepository.findByCode(code);
  }
}
