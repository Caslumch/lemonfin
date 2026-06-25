import { BadRequestException, NotFoundException } from '@nestjs/common';
import { UpdateInstallmentGroupUseCase } from './update-installment-group.use-case';
import { TransactionsRepository } from '../repositories/transactions.repository';
import { CategoriesRepository } from '../../categories/repositories/categories.repository';
import { CardsRepository } from '../../cards/repositories/cards.repository';
import { FamilyContextService } from '../../families/services/family-context.service';

describe('UpdateInstallmentGroupUseCase', () => {
  let useCase: UpdateInstallmentGroupUseCase;
  let transactionsRepository: jest.Mocked<
    Pick<TransactionsRepository, 'findById' | 'replaceInstallmentGroup'>
  >;
  let categoriesRepository: jest.Mocked<Pick<CategoriesRepository, 'findById'>>;
  let cardsRepository: jest.Mocked<Pick<CardsRepository, 'findById'>>;
  let familyContext: jest.Mocked<Pick<FamilyContextService, 'resolveUserIds'>>;

  // Captura as linhas passadas ao replaceInstallmentGroup.
  let lastRows: Array<Record<string, unknown>>;

  beforeEach(() => {
    lastRows = [];
    transactionsRepository = {
      findById: jest.fn().mockResolvedValue({
        id: 'tx-mid',
        userId: 'u1',
        installmentGroupId: 'grp-1',
        installmentNumber: 2,
        installmentTotal: 5,
      }),
      replaceInstallmentGroup: jest
        .fn()
        .mockImplementation(
          (_grp: string, _userIds: string[], rows: typeof lastRows) => {
            lastRows = rows;
            return Promise.resolve(rows.map((_, i) => ({ id: `new${i}` })));
          },
        ),
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
    useCase = new UpdateInstallmentGroupUseCase(
      transactionsRepository as unknown as TransactionsRepository,
      categoriesRepository as unknown as CategoriesRepository,
      cardsRepository as unknown as CardsRepository,
      familyContext as unknown as FamilyContextService,
    );
  });

  const baseInput = {
    amount: 900,
    description: 'Geladeira',
    date: '2026-06-11T12:00:00.000Z',
    categoryId: 'cat1',
    installments: 3,
  };

  it('recria o grupo com novo nº de parcelas, valor e datas mensais', async () => {
    const result = await useCase.execute('tx-mid', 'u1', baseInput);

    // Preserva o installmentGroupId original.
    expect(transactionsRepository.replaceInstallmentGroup).toHaveBeenCalledWith(
      'grp-1',
      ['u1'],
      expect.any(Array),
    );
    expect(result.installmentGroupId).toBe('grp-1');
    expect(result.count).toBe(3);
    expect(result.perInstallment).toBe(300); // 900 / 3

    // 3 parcelas, uma por mês, ancoradas ao meio-dia UTC mantendo o dia 11.
    expect(lastRows.map((r) => r.date)).toEqual([
      '2026-06-11T12:00:00.000Z',
      '2026-07-11T12:00:00.000Z',
      '2026-08-11T12:00:00.000Z',
    ]);
    // Sufixo (n/N) e valor por parcela.
    expect(lastRows.map((r) => r.description)).toEqual([
      'Geladeira (1/3)',
      'Geladeira (2/3)',
      'Geladeira (3/3)',
    ]);
    expect(lastRows.every((r) => r.amount === 300)).toBe(true);
    expect(lastRows.every((r) => r.installmentTotal === 3)).toBe(true);
  });

  it('valida ownership do cartão informado', async () => {
    cardsRepository.findById.mockResolvedValue(null);

    await expect(
      useCase.execute('tx-mid', 'u1', { ...baseInput, cardId: 'alheio' }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(
      transactionsRepository.replaceInstallmentGroup,
    ).not.toHaveBeenCalled();
  });

  it('recusa editar como grupo uma transação avulsa (sem grupo)', async () => {
    transactionsRepository.findById.mockResolvedValue({
      id: 'tx-solo',
      userId: 'u1',
      installmentGroupId: null,
    } as never);

    await expect(
      useCase.execute('tx-solo', 'u1', baseInput),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(
      transactionsRepository.replaceInstallmentGroup,
    ).not.toHaveBeenCalled();
  });

  it('lança NotFound quando a transação não existe/não é do usuário', async () => {
    transactionsRepository.findById.mockResolvedValue(null);

    await expect(
      useCase.execute('sumiu', 'u1', baseInput),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
