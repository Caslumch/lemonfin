import { TrialReminderService } from './trial-reminder.service';

// Testa o aviso de fim de trial (pré-requisito para ligar o paywall sem
// lockout silencioso): janela de 3 dias, e-mail + WhatsApp, dedupe por fim de
// trial, membro coberto pela família não recebe, falha total libera o claim.
const NOW = new Date('2026-07-13T13:00:00Z');
const endsAt = new Date('2026-07-15T12:00:00Z'); // dentro da janela de 3d

function buildService(overrides: {
  users?: unknown[];
  access?: { hasPremium: boolean; source: string };
  claimResult?: boolean;
  mailFails?: boolean;
  waFails?: boolean;
}) {
  const usersRepository = {
    findTrialsEndingBetween: jest.fn().mockResolvedValue(
      overrides.users ?? [
        {
          id: 'u1',
          name: 'Lucas Machado',
          email: 'l@x.com',
          phone: '5511999',
          trialEndsAt: endsAt,
        },
      ],
    ),
  };
  const wmodeClient = {
    sendMessage: jest.fn().mockImplementation(() => {
      if (overrides.waFails) return Promise.reject(new Error('wmode down'));
      return Promise.resolve({ ok: true });
    }),
  };
  const mail = {
    sendTrialEnding: jest.fn().mockImplementation(() => {
      if (overrides.mailFails) return Promise.reject(new Error('resend down'));
      return Promise.resolve(true);
    }),
  };
  const premiumAccess = {
    resolve: jest
      .fn()
      .mockResolvedValue(
        overrides.access ?? { hasPremium: true, source: 'self' },
      ),
  };
  const reminderLog = {
    claim: jest.fn().mockResolvedValue(overrides.claimResult ?? true),
    release: jest.fn().mockResolvedValue(undefined),
  };

  const service = new TrialReminderService(
    usersRepository as never,
    wmodeClient as never,
    mail as never,
    premiumAccess as never,
    reminderLog as never,
  );
  return { service, usersRepository, wmodeClient, mail, reminderLog };
}

describe('TrialReminderService', () => {
  it('avisa por e-mail E WhatsApp quem entra na janela de 3 dias', async () => {
    const { service, usersRepository, mail, wmodeClient, reminderLog } =
      buildService({});

    await service.sendTrialEndingNotices(NOW);

    // Janela [agora, agora+3d].
    const [start, end] = usersRepository.findTrialsEndingBetween.mock
      .calls[0] as [Date, Date];
    expect(end.getTime() - start.getTime()).toBe(3 * 24 * 60 * 60 * 1000);

    expect(reminderLog.claim).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: 'trial_ending',
        dedupeKey: 'trial_ending:u1:2026-07-15',
      }),
    );
    expect(mail.sendTrialEnding).toHaveBeenCalledWith(
      'l@x.com',
      'Lucas Machado',
      endsAt,
    );
    expect(wmodeClient.sendMessage).toHaveBeenCalledWith(
      expect.objectContaining({ to: '5511999' }),
    );
    const { content } = wmodeClient.sendMessage.mock.calls[0][0] as {
      content: string;
    };
    expect(content).toContain('teste grátis');
    expect(content).toContain('/assinar');
  });

  it('dedupe: claim negado não reenvia', async () => {
    const { service, mail, wmodeClient } = buildService({
      claimResult: false,
    });

    await service.sendTrialEndingNotices(NOW);

    expect(mail.sendTrialEnding).not.toHaveBeenCalled();
    expect(wmodeClient.sendMessage).not.toHaveBeenCalled();
  });

  it('membro coberto pelo premium da FAMÍLIA não recebe (falso alarme)', async () => {
    const { service, mail, reminderLog } = buildService({
      access: { hasPremium: true, source: 'family' },
    });

    await service.sendTrialEndingNotices(NOW);

    expect(reminderLog.claim).not.toHaveBeenCalled();
    expect(mail.sendTrialEnding).not.toHaveBeenCalled();
  });

  it('sem telefone: manda só o e-mail', async () => {
    const { service, mail, wmodeClient } = buildService({
      users: [
        {
          id: 'u2',
          name: 'Sem Fone',
          email: 's@x.com',
          phone: null,
          trialEndsAt: endsAt,
        },
      ],
    });

    await service.sendTrialEndingNotices(NOW);

    expect(mail.sendTrialEnding).toHaveBeenCalled();
    expect(wmodeClient.sendMessage).not.toHaveBeenCalled();
  });

  it('falha TOTAL (nenhum canal saiu) libera o claim pra tentar amanhã', async () => {
    const { service, reminderLog } = buildService({
      mailFails: true,
      waFails: true,
    });

    await service.sendTrialEndingNotices(NOW);

    expect(reminderLog.release).toHaveBeenCalledWith([
      'trial_ending:u1:2026-07-15',
    ]);
  });

  it('falha PARCIAL (um canal saiu) NÃO libera o claim', async () => {
    const { service, reminderLog, wmodeClient } = buildService({
      mailFails: true,
    });

    await service.sendTrialEndingNotices(NOW);

    expect(wmodeClient.sendMessage).toHaveBeenCalled();
    expect(reminderLog.release).not.toHaveBeenCalled();
  });
});
