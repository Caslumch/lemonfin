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

  /**
   * Membros da família do usuário, com primeiro nome (para o parser do WhatsApp
   * oferecer ao modelo a lista de nomes válidos). Vazio se não está em família.
   */
  async listMembers(
    userId: string,
  ): Promise<{ id: string; firstName: string; name: string }[]> {
    const family = await this.familiesRepository.findByUserId(userId);
    if (!family) return [];
    return family.members.map((m) => ({
      id: m.user.id,
      firstName: (m.user.name ?? '').trim().split(/\s+/)[0] || '',
      name: m.user.name ?? '',
    }));
  }

  /**
   * Resolve um PRIMEIRO NOME falado ("Danielle") para o membro da família.
   * Retorna:
   *  - { status: 'ok', userId } quando há exatamente um membro com aquele nome;
   *  - { status: 'ambiguous', names } quando 2+ membros compartilham o nome;
   *  - { status: 'not_found' } quando ninguém bate.
   * Comparação case-insensitive pelo primeiro nome. Usado pela consulta por
   * membro no WhatsApp para filtrar a busca a uma única pessoa.
   */
  async resolveMemberByName(
    userId: string,
    firstName: string,
  ): Promise<
    | { status: 'ok'; userId: string; name: string }
    | { status: 'ambiguous'; names: string[] }
    | { status: 'not_found' }
  > {
    const members = await this.listMembers(userId);
    const target = firstName.trim().toLowerCase();
    const matches = members.filter((m) => m.firstName.toLowerCase() === target);
    if (matches.length === 0) return { status: 'not_found' };
    if (matches.length > 1) {
      return { status: 'ambiguous', names: matches.map((m) => m.name) };
    }
    return { status: 'ok', userId: matches[0].id, name: matches[0].name };
  }
}
