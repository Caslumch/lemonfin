import { Injectable, ConflictException } from '@nestjs/common';
import { FamiliesRepository } from '../repositories/families.repository';
import { CreateFamilyInput } from '../dtos/family.dto';
import { randomBytes } from 'crypto';

@Injectable()
export class CreateFamilyUseCase {
  constructor(private readonly familiesRepository: FamiliesRepository) {}

  async execute(userId: string, input: CreateFamilyInput) {
    const existing = await this.familiesRepository.findByUserId(userId);
    if (existing) {
      throw new ConflictException('Voce ja faz parte de uma familia');
    }

    const code = randomBytes(4).toString('hex').toUpperCase();

    return this.familiesRepository.create({
      name: input.name,
      code,
      ownerId: userId,
    });
  }
}
