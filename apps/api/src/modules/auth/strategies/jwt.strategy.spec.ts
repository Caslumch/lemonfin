import { UnauthorizedException } from '@nestjs/common';
import { JwtStrategy } from './jwt.strategy';

const config = {
  getOrThrow: () => 'test-secret',
} as never;

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;

  beforeEach(() => {
    strategy = new JwtStrategy(config);
  });

  it('aceita token de acesso completo (type: access)', () => {
    expect(
      strategy.validate({ sub: 'u1', email: 'a@b.com', type: 'access' }),
    ).toEqual({ id: 'u1', email: 'a@b.com' });
  });

  it('rejeita o tempToken pré-2FA (twofa: pending) — fecha o bypass de 2FA', () => {
    expect(() =>
      strategy.validate({ sub: 'u1', twofa: 'pending' }),
    ).toThrow(UnauthorizedException);
  });

  it('rejeita token sem a marca type: access (token legado/forjado)', () => {
    expect(() => strategy.validate({ sub: 'u1', email: 'a@b.com' })).toThrow(
      UnauthorizedException,
    );
  });

  it('rejeita token de acesso que ainda carregue twofa pendente', () => {
    expect(() =>
      strategy.validate({ sub: 'u1', type: 'access', twofa: 'pending' }),
    ).toThrow(UnauthorizedException);
  });
});
