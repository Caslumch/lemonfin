import { Prisma } from '@prisma/client';
import { ReservesRepository } from './reserves.repository';

// Cobre removeContribution: decrementa savedAmount e reativa a reserva se ela
// havia sido desativada por ter completado (voltou a ficar abaixo do alvo).
function buildRepo(firstUpdate: {
  active: boolean;
  savedAmount: number;
  targetAmount: number;
}) {
  const update = jest
    .fn()
    // 1ª chamada: o decremento, retorna o estado pós-decremento.
    .mockResolvedValueOnce({
      active: firstUpdate.active,
      savedAmount: new Prisma.Decimal(firstUpdate.savedAmount),
      targetAmount: new Prisma.Decimal(firstUpdate.targetAmount),
    })
    // 2ª chamada (só se reativar): retorna reserva reativada.
    .mockResolvedValueOnce({ active: true });

  const prisma = { reserve: { update } } as never;
  return { repo: new ReservesRepository(prisma), update };
}

describe('ReservesRepository.removeContribution', () => {
  it('decrementa savedAmount', async () => {
    const { repo, update } = buildRepo({
      active: true,
      savedAmount: 300,
      targetAmount: 1000,
    });

    await repo.removeContribution('r1', 200);

    expect(update.mock.calls[0][0]).toMatchObject({
      where: { id: 'r1' },
      data: { savedAmount: { decrement: new Prisma.Decimal(200) } },
    });
  });

  it('REATIVA a reserva se ela estava desativada e voltou abaixo do alvo', async () => {
    // Estava completa/desativada; após o decremento saved(900) < target(1000).
    const { repo, update } = buildRepo({
      active: false,
      savedAmount: 900,
      targetAmount: 1000,
    });

    await repo.removeContribution('r1', 200);

    expect(update).toHaveBeenCalledTimes(2);
    expect(update.mock.calls[1][0]).toMatchObject({
      where: { id: 'r1' },
      data: { active: true },
    });
  });

  it('NÃO reativa se ainda continua no/acima do alvo', async () => {
    // Decremento parcial: saved(1100) ainda >= target(1000).
    const { repo, update } = buildRepo({
      active: false,
      savedAmount: 1100,
      targetAmount: 1000,
    });

    await repo.removeContribution('r1', 100);

    expect(update).toHaveBeenCalledTimes(1);
  });

  it('NÃO mexe em active se a reserva já estava ativa', async () => {
    const { repo, update } = buildRepo({
      active: true,
      savedAmount: 300,
      targetAmount: 1000,
    });

    await repo.removeContribution('r1', 200);

    expect(update).toHaveBeenCalledTimes(1);
  });
});
