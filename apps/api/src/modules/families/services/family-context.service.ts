import { Injectable } from '@nestjs/common';
import { FamiliesRepository } from '../repositories/families.repository';

@Injectable()
export class FamilyContextService {
  constructor(private readonly familiesRepository: FamiliesRepository) {}

  /**
   * Returns all user IDs that share data with the given user.
   * If the user is in a family, returns all family member IDs.
   * Otherwise, returns just the user's own ID.
   */
  async resolveUserIds(userId: string): Promise<string[]> {
    const family = await this.familiesRepository.findByUserId(userId);
    if (!family) return [userId];
    return family.members.map((m) => m.user.id);
  }
}
