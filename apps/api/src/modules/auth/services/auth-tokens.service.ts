import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { RefreshTokensRepository } from '../repositories/refresh-tokens.repository';

// Validade do ACCESS token. Curta de propósito: com refresh + rotação, o
// access não precisa viver dias — 15min limita a janela de um token vazado
// (antes era 7d, sem revogação nenhuma). Deve casar com signOptions.expiresIn
// do auth.module.
export const ACCESS_TTL_MS = 15 * 60 * 1000;

export interface SessionTokens {
  token: string;
  refreshToken: string;
  // ISO — o cliente usa para saber QUANDO renovar sem decodificar o JWT.
  tokenExpiresAt: string;
}

// Emissão do par access+refresh — ponto único usado por sign-in, sign-up,
// verify-2fa e refresh, para os quatro emitirem exatamente a mesma sessão.
@Injectable()
export class AuthTokensService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly refreshTokens: RefreshTokensRepository,
  ) {}

  async issueSession(user: {
    id: string;
    email: string;
  }): Promise<SessionTokens> {
    const token = this.jwtService.sign({
      sub: user.id,
      email: user.email,
      type: 'access',
    });
    const refreshToken = await this.refreshTokens.issue(user.id);
    return {
      token,
      refreshToken,
      tokenExpiresAt: new Date(Date.now() + ACCESS_TTL_MS).toISOString(),
    };
  }
}
