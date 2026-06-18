import { ConflictException, NotFoundException } from '@nestjs/common';
import { JoinFamilyUseCase } from './join-family.use-case';
import { MAX_FAMILY_MEMBERS } from '../family.constants';

// Constrói o use-case com um repositório mockado. `members` controla quantos
// membros a família-alvo tem; `inFamily` se o usuário já pertence a uma.
function buildUseCase(opts: { members?: number; inFamily?: boolean }) {
  const family = {
    id: 'fam1',
    code: 'ABC12345',
    name: 'Casa',
    ownerId: 'owner1',
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

  const users = {
    findById: jest.fn().mockImplementation((id: string) =>
      Promise.resolve({
        id,
        name: id === 'owner1' ? 'Lucas' : 'Danielle',
        email: `${id}@x.com`,
        phone: '5511999999999',
      }),
    ),
  };
  const mail = { sendFamilyWelcome: jest.fn().mockResolvedValue(true) };
  const wmode = { sendMessage: jest.fn().mockResolvedValue({ id: 'm1' }) };

  const useCase = new JoinFamilyUseCase(
    repo as never,
    users as never,
    mail as never,
    wmode as never,
  );
  return { useCase, repo, users, mail, wmode };
}

// Aguarda os envios de notificação disparados em background (não-aguardados).
const flush = () => new Promise((r) => setImmediate(r));

describe('JoinFamilyUseCase', () => {
  it('adiciona o membro quando a familia esta abaixo do limite', async () => {
    const { useCase, repo } = buildUseCase({ members: 2 });
    await useCase.execute('newUser', 'ABC12345');
    expect(repo.addMember).toHaveBeenCalledWith('fam1', 'newUser');
  });

  it('notifica o novo membro (email + WPP) e o dono (WPP) ao entrar', async () => {
    const { useCase, mail, wmode } = buildUseCase({ members: 2 });
    await useCase.execute('newUser', 'ABC12345');
    await flush();

    // E-mail de boas-vindas ao novo membro.
    expect(mail.sendFamilyWelcome).toHaveBeenCalledWith(
      'newUser@x.com',
      'Danielle',
      'Casa',
    );
    // WhatsApp: 1 ao novo membro + 1 ao dono.
    expect(wmode.sendMessage).toHaveBeenCalledTimes(2);
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
