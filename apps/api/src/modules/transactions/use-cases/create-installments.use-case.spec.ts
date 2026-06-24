import { NotFoundException } from '@nestjs/common';
import { CreateInstallmentsUseCase } from './create-installments.use-case';
import { TransactionsRepository } from '../repositories/transactions.repository';
import { CategoriesRepository } from '../../categories/repositories/categories.repository';
import { CardsRepository } from '../../cards/repositories/cards.repository';
import { FamilyContextService } from '../../families/services/family-context.service';

describe('CreateInstallmentsUseCase', () => {
  let useCase: CreateInstallmentsUseCase;
  let transactionsRepository: jest.Mocked<
    Pick<TransactionsRepository, 'create'>
  >;
  let categoriesRepository: jest.Mocked<Pick<CategoriesRepository, 'findById'>>;
  let cardsRepository: jest.Mocked<Pick<CardsRepository, 'findById'>>;
  let familyContext: jest.Mocked<Pick<FamilyContextService, 'resolveUserIds'>>;

  // Captura os args de cada create para inspecionar as datas geradas.
  let createdArgs: Array<Record<string, unknown>>;

  beforeEach(() => {
    createdArgs = [];
    transactionsRepository = {
      create: jest.fn().mockImplementation((data: Record<string, unknown>) => {
        createdArgs.push(data);
        return Promise.resolve({ id: `tx${createdArgs.length}` });
      }),
    };
    categoriesRepository = {
      findById: jest.fn().mockResolvedValue({ id: 'cat1', name: 'Compras' }),
    };
    cardsRepository = {
      findById: jest.fn().mockResolvedValue({ id: 'card1', name: 'Nubank' }),
    };
    familyContext = {
      resolveUserIds: jest.fn().mockResolvedValue(['u1']),
    };
    useCase = new CreateInstallmentsUseCase(
      transactionsRepository as unknown as TransactionsRepository,
      categoriesRepository as unknown as CategoriesRepository,
      cardsRepository as unknown as CardsRepository,
      familyContext as unknown as FamilyContextService,
    );
  });

  const baseParams = {
    amount: 1000,
    installments: 10,
    description: 'TV nova',
    userId: 'u1',
    categoryId: 'cat1',
  };

  it('divide o valor total e cria N parcelas no mesmo grupo', async () => {
    const result = await useCase.execute(baseParams);

    expect(transactionsRepository.create).toHaveBeenCalledTimes(10);
    expect(result.perInstallment).toBe(100);
    expect(result.transactionIds).toHaveLength(10);
    // Todas compartilham o mesmo installmentGroupId.
    const groups = new Set(createdArgs.map((a) => a.installmentGroupId));
    expect(groups.size).toBe(1);
    expect(result.installmentGroupId).toBe([...groups][0]);
    // Numeração 1..10 e total 10 em todas.
    expect(createdArgs.map((a) => a.installmentNumber)).toEqual([
      1, 2, 3, 4, 5, 6, 7, 8, 9, 10,
    ]);
    expect(createdArgs.every((a) => a.installmentTotal === 10)).toBe(true);
    // Descrição com sufixo (n/N).
    expect(createdArgs[0].description).toBe('TV nova (1/10)');
    expect(createdArgs[9].description).toBe('TV nova (10/10)');
  });

  it('inicia as parcelas na startDate informada (compra retroativa)', async () => {
    // Compra em 15/01/2026; 3 parcelas → jan, fev, mar de 2026.
    await useCase.execute({
      ...baseParams,
      installments: 3,
      startDate: '2026-01-15T12:00:00.000Z',
    });

    const months = createdArgs.map((a) => (a.date as string).slice(0, 7));
    expect(months).toEqual(['2026-01', '2026-02', '2026-03']);
  });

  it('faz clamp do dia para o último dia do mês (evita "vazar" para o mês seguinte)', async () => {
    // Compra em 31/01/2026; a 2ª parcela (fev) deve cair em 28/02, não 03/03.
    await useCase.execute({
      ...baseParams,
      installments: 3,
      startDate: '2026-01-31T12:00:00.000Z',
    });

    const days = createdArgs.map((a) => {
      const d = new Date(a.date as string);
      return {
        year: d.getFullYear(),
        month: d.getMonth() + 1,
        day: d.getDate(),
      };
    });
    // jan: 31, fev: 28 (clamp), mar: 31.
    expect(days[0]).toMatchObject({ month: 1, day: 31 });
    expect(days[1]).toMatchObject({ month: 2, day: 28 });
    expect(days[2]).toMatchObject({ month: 3, day: 31 });
  });

  it('propaga o source informado e o cardId', async () => {
    await useCase.execute({
      ...baseParams,
      installments: 2,
      cardId: 'card1',
      source: 'WHATSAPP',
    });

    expect(cardsRepository.findById).toHaveBeenCalledWith('card1', ['u1']);
    expect(createdArgs.every((a) => a.source === 'WHATSAPP')).toBe(true);
    expect(createdArgs.every((a) => a.cardId === 'card1')).toBe(true);
  });

  it('lança NotFound quando a categoria não existe', async () => {
    categoriesRepository.findById.mockResolvedValue(null);

    await expect(useCase.execute(baseParams)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(transactionsRepository.create).not.toHaveBeenCalled();
  });

  it('lança NotFound quando o cartão não pertence ao usuário/família', async () => {
    cardsRepository.findById.mockResolvedValue(null);

    await expect(
      useCase.execute({ ...baseParams, cardId: 'alheio' }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(transactionsRepository.create).not.toHaveBeenCalled();
  });
});
