import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { RefreshTokensRepository } from '../repositories/refresh-tokens.repository';

// Validade do ACCESS token. Curto de propósito: com a sessão de longa duração
// (refresh token), o access não precisa viver dias — 15min limita a janela de
// um access vazado. Deve casar com signOptions.expiresIn do auth.module.
export const ACCESS_TTL_MS = 15 * 60 * 1000;

export interface AccessToken {
  token: string;
  // ISO — o cliente usa para saber QUANDO renovar sem decodificar o JWT.
  tokenExpiresAt: string;
}

export interface SessionTokens extends AccessToken {
  refreshToken: string;
}

// Emissão de tokens. `issueSession` cria uma sessão nova (login: access +
// refresh); `issueAccessToken` só renova o access de uma sessão já existente,
// SEM criar/rotacionar refresh — é o que remove a corrida de renovação.
@Injectable()
export class AuthTokensService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly refreshTokens: RefreshTokensRepository,
  ) {}

  issueAccessToken(user: { id: string; email: string }): AccessToken {
    const token = this.jwtService.sign({
      sub: user.id,
      email: user.email,
      type: 'access',
    });
    return {
      token,
      tokenExpiresAt: new Date(Date.now() + ACCESS_TTL_MS).toISOString(),
    };
  }

  async issueSession(user: {
    id: string;
    email: string;
  }): Promise<SessionTokens> {
    const access = this.issueAccessToken(user);
    const refreshToken = await this.refreshTokens.issue(user.id);
    // Limpeza oportunista no login (sem rotação, o refresh já não passa por
    // aqui): remove sessões vencidas/revogadas antigas para não acumular.
    await this.refreshTokens.pruneForUser(user.id);
    return { ...access, refreshToken };
  }
}
