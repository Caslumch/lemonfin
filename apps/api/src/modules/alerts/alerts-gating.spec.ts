import { AlertsService } from './alerts.service';

// Testa a governança dos alertas automáticos: antes, TODO usuário com telefone
// recebia os 5 crons, sem gate premium e sem opt-out. Agora só quem tem acesso
// premium efetivo E não desligou alertsEnabled.
function buildService(overrides: {
  users: Array<{ id: string; name: string | null; phone: string }>;
  access: Record<string, boolean>;
  alertsEnabled: Record<string, boolean>;
}) {
  const usersRepository = {
    findAllWithPhone: jest.fn().mockResolvedValue(overrides.users),
  };
  const familyContext = {
    resolveUserIds: jest.fn().mockImplementation((id: string) => [id]),
  };
  const transactionsRepository = {
    getCategoryBreakdown: jest.fn().mockResolvedValue([]),
    getSummary: jest
      .fn()
      .mockResolvedValue({ income: 0, expense: 0, balance: 0 }),
  };
  const goalsRepository = { findMany: jest.fn().mockResolvedValue([]) };
  const wmodeClient = { sendMessage: jest.fn().mockResolvedValue(undefined) };
  const premiumAccess = {
    hasAccess: jest
      .fn()
      .mockImplementation((id: string) =>
        Promise.resolve(overrides.access[id] ?? false),
      ),
  };
  const reminderSettings = {
    getEffective: jest.fn().mockImplementation((id: string) =>
      Promise.resolve({
        billsEnabled: true,
        daysBefore: 3,
        alertsEnabled: overrides.alertsEnabled[id] ?? true,
      }),
    ),
  };

  const service = new AlertsService(
    transactionsRepository as never,
    usersRepository as never,
    familyContext as never,
    wmodeClient as never,
    goalsRepository as never,
    {} as never, // reserves
    {} as never, // recurring
    premiumAccess as never,
    reminderSettings as never,
    {} as never, // tts
  );

  return { service, familyContext, premiumAccess, reminderSettings };
}

describe('AlertsService — gate premium + opt-out', () => {
  it('só processa usuários com premium E alertsEnabled', async () => {
    const { service, familyContext } = buildService({
      users: [
        { id: 'u-premium', name: 'A', phone: '551190001' },
        { id: 'u-free', name: 'B', phone: '551190002' },
        { id: 'u-optout', name: 'C', phone: '551190003' },
      ],
      access: { 'u-premium': true, 'u-free': false, 'u-optout': true },
      alertsEnabled: { 'u-premium': true, 'u-optout': false },
    });

    await service.checkSpendingAlerts();

    // Só o premium com alertas ligados chegou ao processamento.
    expect(familyContext.resolveUserIds).toHaveBeenCalledTimes(1);
    expect(familyContext.resolveUserIds).toHaveBeenCalledWith('u-premium');
  });

  it('não checa preferências de quem não tem premium (curto-circuito)', async () => {
    const { service, reminderSettings } = buildService({
      users: [{ id: 'u-free', name: 'B', phone: '551190002' }],
      access: { 'u-free': false },
      alertsEnabled: {},
    });

    await service.checkSpendingAlerts();

    expect(reminderSettings.getEffective).not.toHaveBeenCalled();
  });
});
