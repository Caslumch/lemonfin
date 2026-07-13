import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { UsersRepository } from '../../users/repositories/users.repository';
import { RefreshTokensRepository } from '../repositories/refresh-tokens.repository';
import { AuthTokensService } from '../services/auth-tokens.service';

// Renova a sessão: troca um refresh token válido por um par novo (ROTAÇÃO —
// o token usado é revogado na hora). Reapresentar um token já rotacionado é o
// sinal clássico de roubo (o ladrão e o dono correram com o mesmo token):
// nesse caso TODAS as sessões do usuário caem, forçando novo login.
@Injectable()
export class RefreshSessionUseCase {
  private readonly logger = new Logger(RefreshSessionUseCase.name);

  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly refreshTokens: RefreshTokensRepository,
    private readonly authTokens: AuthTokensService,
  ) {}

  async execute(rawRefreshToken: string) {
    const record = await this.refreshTokens.findByToken(rawRefreshToken);
    if (!record) {
      throw new UnauthorizedException('Sessão expirada');
    }

    if (record.revokedAt) {
      // Reuso de token rotacionado → derruba tudo.
      await this.refreshTokens.revokeAllForUser(record.userId);
      this.logger.warn(
        `Reuso de refresh token revogado — todas as sessões derrubadas [user:${record.userId}]`,
      );
      throw new UnauthorizedException('Sessão expirada');
    }

    if (record.expiresAt < new Date()) {
      throw new UnauthorizedException('Sessão expirada');
    }

    const user = await this.usersRepository.findById(record.userId);
    if (!user) {
      throw new UnauthorizedException('Sessão expirada');
    }

    // Rotação: revoga o usado ANTES de emitir o novo.
    await this.refreshTokens.revoke(record.id);
    const session = await this.authTokens.issueSession(user);

    // Limpeza oportunista dos tokens mortos do usuário.
    await this.refreshTokens.pruneForUser(user.id);

    return session;
  }
}
