import { FamilyContextService } from './family-context.service';
import { FamiliesRepository } from '../repositories/families.repository';

describe('FamilyContextService.resolveMemberByName', () => {
  let service: FamilyContextService;
  let families: jest.Mocked<Pick<FamiliesRepository, 'findByUserId'>>;

  // Monta uma "família" no formato de findByUserId (members[].user).
  function familyWith(users: { id: string; name: string }[]) {
    return {
      members: users.map((u) => ({ user: { ...u, email: `${u.id}@x.com` } })),
    };
  }

  beforeEach(() => {
    families = { findByUserId: jest.fn() };
    service = new FamilyContextService(
      families as unknown as FamiliesRepository,
    );
  });

  it('resolve um membro pelo primeiro nome (case-insensitive)', async () => {
    families.findByUserId.mockResolvedValue(
      familyWith([
        { id: 'u1', name: 'Lucas Machado' },
        { id: 'u2', name: 'Danielle Souza' },
      ]) as never,
    );
    const res = await service.resolveMemberByName('u1', 'danielle');
    expect(res).toEqual({ status: 'ok', userId: 'u2', name: 'Danielle Souza' });
  });

  it('retorna not_found quando ninguém bate', async () => {
    families.findByUserId.mockResolvedValue(
      familyWith([{ id: 'u1', name: 'Lucas Machado' }]) as never,
    );
    const res = await service.resolveMemberByName('u1', 'Pedro');
    expect(res.status).toBe('not_found');
  });

  it('retorna ambiguous quando 2 membros têm o mesmo primeiro nome', async () => {
    families.findByUserId.mockResolvedValue(
      familyWith([
        { id: 'u1', name: 'João Silva' },
        { id: 'u2', name: 'João Pereira' },
      ]) as never,
    );
    const res = await service.resolveMemberByName('u3', 'joão');
    expect(res.status).toBe('ambiguous');
    if (res.status === 'ambiguous') {
      expect(res.names).toEqual(['João Silva', 'João Pereira']);
    }
  });

  it('usuário sem família → not_found', async () => {
    families.findByUserId.mockResolvedValue(null);
    const res = await service.resolveMemberByName('solo', 'qualquer');
    expect(res.status).toBe('not_found');
  });

  it('listMembers devolve primeiro nome e id de cada membro', async () => {
    families.findByUserId.mockResolvedValue(
      familyWith([
        { id: 'u1', name: 'Lucas Machado' },
        { id: 'u2', name: 'Danielle Souza' },
      ]) as never,
    );
    const members = await service.listMembers('u1');
    expect(members).toEqual([
      { id: 'u1', firstName: 'Lucas', name: 'Lucas Machado' },
      { id: 'u2', firstName: 'Danielle', name: 'Danielle Souza' },
    ]);
  });
});
