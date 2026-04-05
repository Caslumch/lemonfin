import { Injectable } from '@nestjs/common';
import { FamiliesRepository } from '../repositories/families.repository';

@Injectable()
export class GetMyFamilyUseCase {
  constructor(private readonly familiesRepository: FamiliesRepository) {}

  async execute(userId: string) {
    return this.familiesRepository.findByUserId(userId);
  }
}
