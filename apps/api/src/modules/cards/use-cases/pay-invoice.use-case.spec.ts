import { NotFoundException, BadRequestException } from '@nestjs/common';
import { PayInvoiceUseCase } from './pay-invoice.use-case';
import { CardsRepository } from '../repositories/cards.repository';
import { InvoicePaymentRepository } from '../repositories/invoice-payment.repository';
import { TransactionsRepository } from '../../transactions/repositories/transactions.repository';
import { CategoriesRepository } from '../../categories/repositories/categories.repository';
import { FamilyContextService } from '../../families/services/family-context.service';

describe('PayInvoiceUseCase', () => {
  let useCase: PayInvoiceUseCase;
  let cards: jest.Mocked<Pick<CardsRepository, 'findById'>>;
  let payments: jest.Mocked<
    Pick<InvoicePaymentRepository, 'create' | 'sumByCycle'>
  >;
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
    payments = {
      create: jest.fn().mockResolvedValue({ id: 'pay1' }),
      sumByCycle: jest.fn().mockResolvedValue(6338.27),
    };
    transactions = {
      create: jest.fn().mockImplementation((data: Record<string, unknown>) => {
        createdTx = data;
        return Promise.resolve({ id: 'tx1' });
      }),
      getCardSummary: jest
        .fn()
        .mockResolvedValue({ total: 6338.27, count: 105 }),
    };
    categories = {
      findBySlug: jest
        .fn()
        .mockResolvedValue({ id: 'cat-pag', slug: 'pagamento-fatura' }),
    };
    familyContext = {
      resolveUserIds: jest.fn().mockResolvedValue(['u1']),
    };
    useCase = new PayInvoiceUseCase(
      cards as unknown as CardsRepository,
      payments as unknown as InvoicePaymentRepository,
      transactions as unknown as TransactionsRepository,
      categories as unknown as CategoriesRepository,
      familyContext as unknown as FamilyContextService,
    );
  });

  const input = { cycle: '2026-06', amount: 6338.27 };

  it('cria despesa FORA-CARTÃO na categoria pagamento-fatura', async () => {
    await useCase.execute('card1', 'u1', input);

    expect(transactions.create).toHaveBeenCalledTimes(1);
    expect(createdTx).toMatchObject({
      type: 'EXPENSE',
      amount: 6338.27,
      categoryId: 'cat-pag',
    });
    // cardId NÃO deve ser passado (pagamento é fora-cartão).
    expect(createdTx).not.toHaveProperty('cardId');
  });

  it('registra o InvoicePayment ligado à transação e ao ciclo', async () => {
    await useCase.execute('card1', 'u1', input);
    expect(payments.create).toHaveBeenCalledWith(
      expect.objectContaining({
        cardId: 'card1',
        cycle: '2026-06',
        amount: 6338.27,
        transactionId: 'tx1',
      }),
    );
  });

  it('retorna status paid quando pago = total', async () => {
    const res = await useCase.execute('card1', 'u1', input);
    expect(res.paymentStatus).toBe('paid');
    expect(res.total).toBe(6338.27);
    expect(res.paid).toBe(6338.27);
  });

  it('retorna status partial quando pago < total', async () => {
    payments.sumByCycle.mockResolvedValue(3000);
    const res = await useCase.execute('card1', 'u1', {
      cycle: '2026-06',
      amount: 3000,
    });
    expect(res.paymentStatus).toBe('partial');
  });

  it('recusa valor não-positivo', async () => {
    await expect(
      useCase.execute('card1', 'u1', { cycle: '2026-06', amount: 0 }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('404 se o cartão não é do usuário', async () => {
    cards.findById.mockResolvedValue(null);
    await expect(useCase.execute('alheio', 'u1', input)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('404 se a categoria de sistema não existe (seed não rodou)', async () => {
    categories.findBySlug.mockResolvedValue(null);
    await expect(useCase.execute('card1', 'u1', input)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
