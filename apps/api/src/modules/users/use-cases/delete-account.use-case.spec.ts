import { UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { DeleteAccountUseCase } from './delete-account.use-case';

// Testa a exclusão de conta (LGPD): re-auth por senha, limpeza dos RESÍDUOS
// (ConversationState do WhatsApp, chaveado por phone sem FK — sobrevivia à
// exclusão) e Stripe best-effort. O cascade do Prisma cuida do resto.
jest.mock('stripe', () => {
  return {
    __esModule: true,
    default: class {
      subscriptions = { cancel: jest.fn().mockResolvedValue({}) };
      customers = { del: jest.fn().mockResolvedValue({}) };
    },
  };
});

function buildUseCase(overrides: { user?: Record<string, unknown> | null }) {
  const deletes: Array<{ model: string; args: unknown }> = [];
  const prisma = {
    user: {
      findUnique: jest.fn().mockResolvedValue(overrides.user ?? null),
      delete: jest.fn().mockImplementation((args: unknown) => {
        deletes.push({ model: 'user', args });
        return { id: 'op' };
      }),
    },
    family: {
      deleteMany: jest.fn().mockImplementation((args: unknown) => {
        deletes.push({ model: 'family', args });
        return { id: 'op' };
      }),
    },
    conversationState: {
      deleteMany: jest.fn().mockImplementation((args: unknown) => {
        deletes.push({ model: 'conversationState', args });
        return { id: 'op' };
      }),
    },
    // $transaction recebe a lista de operações já montadas.
    $transaction: jest.fn().mockResolvedValue([]),
  };
  const config = { get: jest.fn().mockReturnValue(undefined) };

  const useCase = new DeleteAccountUseCase(prisma as never, config as never);
  return { useCase, prisma, deletes };
}

const passwordHash = bcrypt.hashSync('senha-certa', 4);

describe('DeleteAccountUseCase', () => {
  it('rejeita senha incorreta sem apagar nada', async () => {
    const { useCase, prisma } = buildUseCase({
      user: { id: 'u1', passwordHash, phone: null },
    });

    await expect(useCase.execute('u1', 'senha-errada')).rejects.toThrow(
      UnauthorizedException,
    );
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('apaga o ConversationState por TODAS as variações do telefone', async () => {
    const { useCase, prisma } = buildUseCase({
      user: { id: 'u1', passwordHash, phone: '5511987654321' },
    });

    await useCase.execute('u1', 'senha-certa');

    // O deleteMany do estado de conversa entrou na transação, cobrindo as
    // formas equivalentes do número (com/sem 9º dígito, com/sem 55).
    expect(prisma.conversationState.deleteMany).toHaveBeenCalledWith({
      where: { phone: { in: expect.arrayContaining(['5511987654321']) } },
    });
    const { in: phones } = (
      prisma.conversationState.deleteMany.mock.calls[0][0] as {
        where: { phone: { in: string[] } };
      }
    ).where.phone;
    expect(phones.length).toBeGreaterThan(1); // variações, não só o literal
    expect(prisma.$transaction).toHaveBeenCalled();
  });

  it('usuário sem telefone: transação segue só com família + usuário', async () => {
    const { useCase, prisma } = buildUseCase({
      user: { id: 'u1', passwordHash, phone: null },
    });

    await useCase.execute('u1', 'senha-certa');

    expect(prisma.conversationState.deleteMany).not.toHaveBeenCalled();
    expect(prisma.family.deleteMany).toHaveBeenCalledWith({
      where: { ownerId: 'u1' },
    });
    expect(prisma.user.delete).toHaveBeenCalledWith({ where: { id: 'u1' } });
  });
});
