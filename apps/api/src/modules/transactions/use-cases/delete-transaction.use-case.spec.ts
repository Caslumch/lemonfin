import { NotFoundException } from '@nestjs/common';
import { DeleteTransactionUseCase } from './delete-transaction.use-case';
import { TransactionsRepository } from '../repositories/transactions.repository';
import { FamilyContextService } from '../../families/services/family-context.service';

describe('DeleteTransactionUseCase', () => {
  let useCase: DeleteTransactionUseCase;
  let repo: jest.Mocked<
    Pick<
      TransactionsRepository,
      'findById' | 'delete' | 'deleteByInstallmentGroup'
    >
  >;
  let familyContext: jest.Mocked<Pick<FamilyContextService, 'resolveUserIds'>>;

  const userIds = ['u1', 'u2'];

  beforeEach(() => {
    repo = {
      findById: jest.fn(),
      delete: jest.fn(),
      deleteByInstallmentGroup: jest.fn(),
    };
    familyContext = {
      resolveUserIds: jest.fn().mockResolvedValue(userIds),
    };
    useCase = new DeleteTransactionUseCase(
      repo as unknown as TransactionsRepository,
      familyContext as unknown as FamilyContextService,
    );
  });

  it('lança NotFound quando a transação não existe (ou é de outro tenant)', async () => {
    repo.findById.mockResolvedValue(null);

    await expect(useCase.execute('tx1', 'u1')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(repo.delete).not.toHaveBeenCalled();
    expect(repo.deleteByInstallmentGroup).not.toHaveBeenCalled();
  });

  it('exclui apenas a transação no escopo single', async () => {
    repo.findById.mockResolvedValue({
      id: 'tx1',
      installmentGroupId: 'grp1',
    } as never);

    const res = await useCase.execute('tx1', 'u1', 'single');

    expect(repo.delete).toHaveBeenCalledWith('tx1');
    expect(repo.deleteByInstallmentGroup).not.toHaveBeenCalled();
    expect(res.deletedCount).toBe(1);
  });

  it('exclui o grupo inteiro de parcelas no escopo group', async () => {
    repo.findById.mockResolvedValue({
      id: 'tx1',
      installmentGroupId: 'grp1',
    } as never);
    repo.deleteByInstallmentGroup.mockResolvedValue(4);

    const res = await useCase.execute('tx1', 'u1', 'group');

    expect(repo.deleteByInstallmentGroup).toHaveBeenCalledWith('grp1', userIds);
    expect(repo.delete).not.toHaveBeenCalled();
    expect(res.deletedCount).toBe(4);
    expect(res.message).toContain('4 parcelas removidas');
  });

  it('cai no delete individual quando pede group mas a tx não tem grupo', async () => {
    repo.findById.mockResolvedValue({
      id: 'tx1',
      installmentGroupId: null,
    } as never);

    const res = await useCase.execute('tx1', 'u1', 'group');

    expect(repo.delete).toHaveBeenCalledWith('tx1');
    expect(repo.deleteByInstallmentGroup).not.toHaveBeenCalled();
    expect(res.deletedCount).toBe(1);
  });
});
