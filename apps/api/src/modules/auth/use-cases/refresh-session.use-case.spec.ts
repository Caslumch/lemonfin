import { UnauthorizedException } from '@nestjs/common';
import { RefreshSessionUseCase } from './refresh-session.use-case';

// Testa a renovação de sessão ESTÁVEL: o refresh token NÃO rotaciona — o
// use-case valida que a sessão está viva e emite só um access novo, ecoando o
// mesmo refresh token. Rejeita sessão revogada (logout/senha), expirada,
// desconhecida ou de usuário inexistente. Sem rotação = sem corrida = sem
// deslogamento espontâneo.
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
    issueAccessToken: jest.fn().mockReturnValue({
      token: 'novo-access',
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
  revokedReason: null,
  expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
};

describe('RefreshSessionUseCase', () => {
  it('renova o access SEM rotacionar: ecoa o mesmo refresh token', async () => {
    const { useCase, refreshTokens, authTokens } = buildUseCase({
      record: validRecord,
    });

    const out = await useCase.execute('token-cru');

    expect(authTokens.issueAccessToken).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'u1' }),
    );
    // Não rotaciona: nada é revogado no refresh.
    expect(refreshTokens.revoke).not.toHaveBeenCalled();
    expect(out.token).toBe('novo-access');
    // O mesmo refresh token volta — o cliente mantém a sessão sem trocar segredo.
    expect(out.refreshToken).toBe('token-cru');
  });

  it('requests concorrentes com o MESMO token: todas renovam, ninguém é punido', async () => {
    const { useCase, refreshTokens } = buildUseCase({ record: validRecord });

    const results = await Promise.all([
      useCase.execute('token-cru'),
      useCase.execute('token-cru'),
      useCase.execute('token-cru'),
    ]);

    // A corrida que deslogava o usuário some: sem rotação, o token continua
    // válido para todas as requests paralelas.
    for (const out of results) {
      expect(out.token).toBe('novo-access');
      expect(out.refreshToken).toBe('token-cru');
    }
    expect(refreshTokens.revokeAllForUser).not.toHaveBeenCalled();
    expect(refreshTokens.revoke).not.toHaveBeenCalled();
  });

  it('sessão REVOGADA (logout/senha) → 401 sem emitir access', async () => {
    const { useCase, authTokens } = buildUseCase({
      record: {
        ...validRecord,
        revokedAt: new Date(),
        revokedReason: 'logout',
      },
    });

    await expect(useCase.execute('token-revogado')).rejects.toThrow(
      UnauthorizedException,
    );
    expect(authTokens.issueAccessToken).not.toHaveBeenCalled();
  });

  it('token expirado → 401 sem emitir access', async () => {
    const { useCase, authTokens } = buildUseCase({
      record: {
        ...validRecord,
        expiresAt: new Date(Date.now() - 1000),
      },
    });

    await expect(useCase.execute('token-velho')).rejects.toThrow(
      UnauthorizedException,
    );
    expect(authTokens.issueAccessToken).not.toHaveBeenCalled();
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
