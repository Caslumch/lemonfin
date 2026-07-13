import { Injectable } from '@nestjs/common';
import { RefreshTokensRepository } from '../repositories/refresh-tokens.repository';

// Logout: revoga o refresh token da sessão. A posse do token É a credencial
// (não exige access token — um logout com access já expirado precisa
// funcionar). Idempotente: token desconhecido/já revogado responde ok igual.
@Injectable()
export class LogoutUseCase {
  constructor(private readonly refreshTokens: RefreshTokensRepository) {}

  async execute(rawRefreshToken: string) {
    const record = await this.refreshTokens.findByToken(rawRefreshToken);
    if (record && !record.revokedAt) {
      await this.refreshTokens.revoke(record.id);
    }
    return { loggedOut: true };
  }
}
