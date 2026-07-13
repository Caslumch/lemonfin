import { UnauthorizedException } from '@nestjs/common';
import { RefreshSessionUseCase } from './refresh-session.use-case';

// Testa a renovação de sessão: rotação (token usado é revogado), detecção de
// REUSO (token já rotacionado reapresentado = roubo → derruba todas as
// sessões do usuário) e expiração.
function buildUseCase(overrides: {
  record?: Record<string, unknown> | null;
  user?: Record<string, unknown> | null;
}) {
  const usersRepository = {
    findById: jest
      .fn()
      .mockResolvedValue(
        overrides.user === undefined
          ? { id: 'u1', email: 'l@x.com' }
          : overrides.user,
      ),
  };
  const refreshTokens = {
    findByToken: jest.fn().mockResolvedValue(overrides.record ?? null),
    revoke: jest.fn().mockResolvedValue(undefined),
    revokeAllForUser: jest.fn().mockResolvedValue(undefined),
    pruneForUser: jest.fn().mockResolvedValue(undefined),
  };
  const authTokens = {
    issueSession: jest.fn().mockResolvedValue({
      token: 'novo-access',
      refreshToken: 'novo-refresh',
      tokenExpiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
    }),
  };

  const useCase = new RefreshSessionUseCase(
    usersRepository as never,
    refreshTokens as never,
    authTokens as never,
  );
  return { useCase, usersRepository, refreshTokens, authTokens };
}

const validRecord = {
  id: 'rt1',
  userId: 'u1',
  revokedAt: null,
  expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
};

describe('RefreshSessionUseCase', () => {
  it('renova com ROTAÇÃO: revoga o token usado e emite um par novo', async () => {
    const { useCase, refreshTokens, authTokens } = buildUseCase({
      record: validRecord,
    });

    const out = await useCase.execute('token-cru');

    expect(refreshTokens.revoke).toHaveBeenCalledWith('rt1');
    expect(authTokens.issueSession).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'u1' }),
    );
    expect(out.token).toBe('novo-access');
    expect(out.refreshToken).toBe('novo-refresh');
    // Limpeza oportunista dos tokens mortos.
    expect(refreshTokens.pruneForUser).toHaveBeenCalledWith('u1');
  });

  it('REUSO de token revogado derruba TODAS as sessões do usuário', async () => {
    const { useCase, refreshTokens } = buildUseCase({
      record: { ...validRecord, revokedAt: new Date() },
    });

    await expect(useCase.execute('token-roubado')).rejects.toThrow(
      UnauthorizedException,
    );
    expect(refreshTokens.revokeAllForUser).toHaveBeenCalledWith('u1');
    expect(refreshTokens.revoke).not.toHaveBeenCalled();
  });

  it('token expirado → 401 sem emitir sessão', async () => {
    const { useCase, authTokens } = buildUseCase({
      record: {
        ...validRecord,
        expiresAt: new Date(Date.now() - 1000),
      },
    });

    await expect(useCase.execute('token-velho')).rejects.toThrow(
      UnauthorizedException,
    );
    expect(authTokens.issueSession).not.toHaveBeenCalled();
  });

  it('token desconhecido → 401', async () => {
    const { useCase } = buildUseCase({ record: null });
    await expect(useCase.execute('nao-existe')).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('usuário do token já não existe → 401', async () => {
    const { useCase } = buildUseCase({ record: validRecord, user: null });
    await expect(useCase.execute('token-cru')).rejects.toThrow(
      UnauthorizedException,
    );
  });
});
