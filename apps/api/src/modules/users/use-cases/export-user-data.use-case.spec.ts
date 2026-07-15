import { NotFoundException } from '@nestjs/common';
import { ExportUserDataUseCase } from './export-user-data.use-case';

// Testa a exportação de dados (LGPD — portabilidade): escopo restrito ao
// PRÓPRIO usuário (nunca a família) e shape estável do export.
function buildUseCase(overrides: { user?: Record<string, unknown> | null }) {
  const prisma = {
    user: {
      findUnique: jest
        .fn()
        .mockResolvedValue(
          overrides.user === undefined
            ? { name: 'Lucas', email: 'l@x.com', phone: '5511999' }
            : overrides.user,
        ),
    },
    transaction: {
      findMany: jest.fn().mockResolvedValue([
        {
          amount: 50,
          type: 'EXPENSE',
          description: 'mercado',
          category: { name: 'Alimentação', slug: 'alimentacao' },
          card: null,
        },
      ]),
    },
    card: { findMany: jest.fn().mockResolvedValue([]) },
    goal: { findMany: jest.fn().mockResolvedValue([]) },
    reserve: { findMany: jest.fn().mockResolvedValue([]) },
    recurringTransaction: { findMany: jest.fn().mockResolvedValue([]) },
    category: { findMany: jest.fn().mockResolvedValue([]) },
    invoicePayment: { findMany: jest.fn().mockResolvedValue([]) },
    reminderSetting: { findUnique: jest.fn().mockResolvedValue(null) },
    advisorMemory: { findMany: jest.fn().mockResolvedValue([]) },
    familyMember: {
      findMany: jest
        .fn()
        .mockResolvedValue([
          { role: 'MEMBER', joinedAt: new Date(), family: { name: 'Casa' } },
        ]),
    },
  };
  return { useCase: new ExportUserDataUseCase(prisma as never), prisma };
}

describe('ExportUserDataUseCase', () => {
  it('exporta só os dados do PRÓPRIO usuário (userId, nunca família)', async () => {
    const { useCase, prisma } = buildUseCase({});

    const out = await useCase.execute('u1');

    // Toda consulta filtra pelo userId do titular.
    expect(prisma.transaction.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: 'u1' } }),
    );
    expect(prisma.category.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: 'u1' } }),
    );
    expect(out.format).toBe('lemonfin-export-v1');
    expect(out.transactions).toHaveLength(1);
    expect(out.families).toEqual([
      expect.objectContaining({ name: 'Casa', role: 'MEMBER' }),
    ]);
    expect(typeof out.exportedAt).toBe('string');
  });

  it('usuário inexistente → 404', async () => {
    const { useCase } = buildUseCase({ user: null });
    await expect(useCase.execute('ghost')).rejects.toThrow(NotFoundException);
  });
});
