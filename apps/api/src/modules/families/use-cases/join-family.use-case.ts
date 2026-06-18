import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { FamiliesRepository } from '../repositories/families.repository';
import { MAX_FAMILY_MEMBERS } from '../family.constants';

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

    // Teto de membros: a assinatura do dono cobre todos, então limitamos para
    // evitar compartilhamento indefinido do código de convite.
    if (family.members.length >= MAX_FAMILY_MEMBERS) {
      throw new ConflictException(
        `Esta familia ja atingiu o limite de ${MAX_FAMILY_MEMBERS} membros`,
      );
    }

    await this.familiesRepository.addMember(family.id, userId);

    return this.familiesRepository.findByCode(code);
  }
}
