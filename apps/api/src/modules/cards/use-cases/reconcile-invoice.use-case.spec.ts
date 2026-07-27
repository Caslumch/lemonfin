import { NotFoundException } from '@nestjs/common';
import { ReconcileInvoiceUseCase } from './reconcile-invoice.use-case';
import { CardsRepository } from '../repositories/cards.repository';
import { InvoiceReconciliationRepository } from '../repositories/invoice-reconciliation.repository';
import { TransactionsRepository } from '../../transactions/repositories/transactions.repository';
import { CategoriesRepository } from '../../categories/repositories/categories.repository';
import { FamilyContextService } from '../../families/services/family-context.service';

describe('ReconcileInvoiceUseCase', () => {
  let useCase: ReconcileInvoiceUseCase;
  let cards: jest.Mocked<Pick<CardsRepository, 'findById'>>;
  let recon: jest.Mocked<Pick<InvoiceReconciliationRepository, 'upsert'>>;
  let transactions: jest.Mocked<
    Pick<TransactionsRepository, 'create' | 'getCardSummary'>
  >;
  let categories: jest.Mocked<Pick<CategoriesRepository, 'findBySlug'>>;
  let familyContext: jest.Mocked<Pick<FamilyContextService, 'resolveUserIds'>>;
  let createdTx: Record<string, unknown> | null;

  beforeEach(() => {
    createdTx = null;
    cards = {
      findById: jest
        .fn()
        .mockResolvedValue({ id: 'card1', name: 'Bradesco', closingDay: 25 }),
    };
    recon = { upsert: jest.fn().mockResolvedValue({ id: 'rec1' }) };
    transactions = {
      create: jest.fn().mockImplementation((data: Record<string, unknown>) => {
        createdTx = data;
        return Promise.resolve({ id: 'adj1' });
      }),
      // App tem 4.265,53 no ciclo (default dos testes).
      getCardSummary: jest
        .fn()
        .mockResolvedValue({ total: 4265.53, count: 69 }),
    };
    categories = {
      findBySlug: jest
        .fn()
        .mockResolvedValue({ id: 'cat-adj', slug: 'ajuste-fatura' }),
    };
    familyContext = {
      resolveUserIds: jest.fn().mockResolvedValue(['u1']),
    };
    useCase = new ReconcileInvoiceUseCase(
      cards as unknown as CardsRepository,
      recon as unknown as InvoiceReconciliationRepository,
      transactions as unknown as TransactionsRepository,
      categories as unknown as CategoriesRepository,
      familyContext as unknown as FamilyContextService,
    );
  });

  it('FALTA: cria ajuste com a diferença e marca conferida', async () => {
    // App 4265.53, fatura 5893.47 → falta 1627.94.
    const res = await useCase.execute('card1', 'u1', {
      cycle: '2026-07',
      informedTotal: 5893.47,
    });
    expect(res.status).toBe('adjusted');
    if (res.status === 'adjusted') {
      expect(res.difference).toBe(1627.94);
      expect(res.adjustmentId).toBe('adj1');
    }
    expect(createdTx).toMatchObject({
      type: 'EXPENSE',
      amount: 1627.94,
      categoryId: 'cat-adj',
      cardId: 'card1',
    });
    expect(recon.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ adjustmentId: 'adj1', informedTotal: 5893.47 }),
    );
  });

  it('BATE: não cria ajuste, marca conferida', async () => {
    const res = await useCase.execute('card1', 'u1', {
      cycle: '2026-07',
      informedTotal: 4265.53,
    });
    expect(res.status).toBe('matched');
    expect(transactions.create).not.toHaveBeenCalled();
    expect(recon.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ adjustmentId: null }),
    );
  });

  it('SOBRA: app tem a mais → só avisa, não cria ajuste', async () => {
    // Informa MENOS que o app (4000 < 4265.53) → sobra 265.53.
    const res = await useCase.execute('card1', 'u1', {
      cycle: '2026-07',
      informedTotal: 4000,
    });
    expect(res.status).toBe('over');
    if (res.status === 'over') {
      expect(res.difference).toBeCloseTo(265.53, 2);
    }
    expect(transactions.create).not.toHaveBeenCalled();
    expect(recon.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ adjustmentId: null }),
    );
  });

  it('404 se o cartão não é do usuário', async () => {
    cards.findById.mockResolvedValue(null);
    await expect(
      useCase.execute('alheio', 'u1', {
        cycle: '2026-07',
        informedTotal: 100,
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('404 se a categoria de ajuste não existe (seed não rodou)', async () => {
    categories.findBySlug.mockResolvedValue(null);
    await expect(
      useCase.execute('card1', 'u1', {
        cycle: '2026-07',
        informedTotal: 9999,
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
