import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { UsersRepository } from '../../users/repositories/users.repository';
import { RefreshTokensRepository } from '../repositories/refresh-tokens.repository';
import { AuthTokensService } from '../services/auth-tokens.service';

// Janela de graça para REUSO: renovações concorrentes são normais — o auth()
// roda no proxy do Next a cada navegação, então várias requests paralelas
// (abas, prefetch, RSC) tentam renovar com o MESMO refresh token quando o
// access vence. A primeira rotaciona; as demais chegam com o token
// recém-revogado. Reuso DENTRO da janela = corrida benigna (emite outra
// sessão); reuso DEPOIS dela = roubo (derruba tudo). Sem isso, todo usuário
// com 2+ requests simultâneas no vencimento era deslogado por "roubo".
const REUSE_GRACE_MS = 60 * 1000;

// Renova a sessão: troca um refresh token válido por um par novo (ROTAÇÃO —
// o token usado é revogado na hora). Reapresentar um token rotacionado FORA
// da janela de graça é o sinal clássico de roubo (o ladrão e o dono correram
// com o mesmo token): nesse caso TODAS as sessões do usuário caem.
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

    if (record.expiresAt < new Date()) {
      throw new UnauthorizedException('Sessão expirada');
    }

    if (record.revokedAt) {
      const sinceRevoke = Date.now() - record.revokedAt.getTime();
      // A graça SÓ vale para revogação por ROTAÇÃO. Token revogado por
      // logout/segurança nunca renova — sem essa distinção, a graça
      // ressuscitava sessões derrubadas pela própria detecção de roubo.
      const benignRace =
        record.revokedReason === 'rotation' && sinceRevoke <= REUSE_GRACE_MS;

      if (!benignRace) {
        // Reuso tardio (ou de token derrubado por segurança) → roubo →
        // derruba tudo.
        await this.refreshTokens.revokeAllForUser(record.userId);
        this.logger.warn(
          `Reuso de refresh token revogado — todas as sessões derrubadas [user:${record.userId}]`,
        );
        throw new UnauthorizedException('Sessão expirada');
      }

      // Corrida benigna: emite uma sessão nova sem punir. Os tokens extras
      // que as requests paralelas geram ficam órfãos e caem no prune.
      const user = await this.usersRepository.findById(record.userId);
      if (!user) {
        throw new UnauthorizedException('Sessão expirada');
      }
      this.logger.log(
        `Refresh concorrente dentro da janela de graça [user:${record.userId}]`,
      );
      return this.authTokens.issueSession(user);
    }

    const user = await this.usersRepository.findById(record.userId);
    if (!user) {
      throw new UnauthorizedException('Sessão expirada');
    }

    // Rotação: revoga o usado ANTES de emitir o novo.
    await this.refreshTokens.revoke(record.id, 'rotation');
    const session = await this.authTokens.issueSession(user);

    // Limpeza oportunista dos tokens mortos do usuário.
    await this.refreshTokens.pruneForUser(user.id);

    return session;
  }
}
