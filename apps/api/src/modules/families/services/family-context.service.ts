import { ForbiddenException, Injectable } from '@nestjs/common';
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

  /**
   * Like {@link resolveUserIds}, but optionally narrows the scope to a single
   * family member. If `memberId` is provided it must belong to the caller's
   * family, otherwise a ForbiddenException is thrown. When omitted, the full
   * family scope is returned (same as resolveUserIds).
   */
  async resolveScopedUserIds(
    userId: string,
    memberId?: string,
  ): Promise<string[]> {
    const userIds = await this.resolveUserIds(userId);
    if (!memberId) return userIds;
    if (!userIds.includes(memberId)) {
      throw new ForbiddenException('Membro não pertence à sua família');
    }
    return [memberId];
  }
}
