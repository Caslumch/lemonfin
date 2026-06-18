import { ConflictException, NotFoundException } from '@nestjs/common';
import { JoinFamilyUseCase } from './join-family.use-case';
import { MAX_FAMILY_MEMBERS } from '../family.constants';

// Constrói o use-case com um repositório mockado. `members` controla quantos
// membros a família-alvo tem; `inFamily` se o usuário já pertence a uma.
function buildUseCase(opts: { members?: number; inFamily?: boolean }) {
  const family = {
    id: 'fam1',
    code: 'ABC12345',
    members: Array.from({ length: opts.members ?? 1 }, (_, i) => ({
      user: { id: `u${i}` },
    })),
  };

  const repo = {
    findByUserId: jest
      .fn()
      .mockResolvedValue(opts.inFamily ? { id: 'other' } : null),
    findByCode: jest.fn().mockResolvedValue(family),
    addMember: jest.fn().mockResolvedValue(undefined),
  };

  const useCase = new JoinFamilyUseCase(repo as never);
  return { useCase, repo };
}

describe('JoinFamilyUseCase', () => {
  it('adiciona o membro quando a familia esta abaixo do limite', async () => {
    const { useCase, repo } = buildUseCase({ members: 2 });
    await useCase.execute('newUser', 'ABC12345');
    expect(repo.addMember).toHaveBeenCalledWith('fam1', 'newUser');
  });

  it('bloqueia quando a familia ja atingiu o limite de membros', async () => {
    const { useCase, repo } = buildUseCase({ members: MAX_FAMILY_MEMBERS });
    await expect(useCase.execute('newUser', 'ABC12345')).rejects.toThrow(
      ConflictException,
    );
    expect(repo.addMember).not.toHaveBeenCalled();
  });

  it('rejeita quando o usuario ja faz parte de uma familia', async () => {
    const { useCase, repo } = buildUseCase({ inFamily: true });
    await expect(useCase.execute('newUser', 'ABC12345')).rejects.toThrow(
      ConflictException,
    );
    expect(repo.addMember).not.toHaveBeenCalled();
  });

  it('rejeita codigo de convite invalido', async () => {
    const { useCase, repo } = buildUseCase({ members: 1 });
    repo.findByCode.mockResolvedValueOnce(null);
    await expect(useCase.execute('newUser', 'BADCODE')).rejects.toThrow(
      NotFoundException,
    );
    expect(repo.addMember).not.toHaveBeenCalled();
  });
});
