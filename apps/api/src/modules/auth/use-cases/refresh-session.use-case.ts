import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { UsersRepository } from '../../users/repositories/users.repository';
import { RefreshTokensRepository } from '../repositories/refresh-tokens.repository';
import { AuthTokensService } from '../services/auth-tokens.service';

// Renova o ACCESS token a partir de uma SESSÃO de longa duração.
//
// Modelo: o refresh token identifica uma sessão estável (60 dias) e NÃO
// rotaciona a cada uso. Renovar = validar que a sessão está viva e emitir um
// access novo — o refresh token permanece o mesmo.
//
// Por que não rotacionar: o cliente (NextAuth) guarda a sessão num cookie
// único e dispara VÁRIAS requisições concorrentes (proxy, prefetch, RSC).
// Com rotação, as requests paralelas correm com o mesmo token; o "perdedor"
// da corrida ficava com um token revogado no cookie e, na renovação seguinte,
// disparava a detecção de roubo e derrubava TODAS as sessões — o usuário era
// deslogado sozinho ao voltar horas depois. Sem rotação, todas as requests
// concorrentes veem o mesmo token válido e a corrida desaparece.
//
// Segurança preservada: a sessão é revogável (logout, troca/reset de senha,
// exclusão de conta); o access é curto (15min), limitando a janela de um
// access vazado; e o refresh token é opaco (256 bits) e guardado só como hash.
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

    // Sessão inexistente, expirada ou revogada (logout/senha) → precisa logar
    // de novo. Sem "detecção de roubo" que derruba tudo: a única forma de um
    // token válido virar inválido é uma revogação explícita e intencional.
    if (!record || record.revokedAt || record.expiresAt < new Date()) {
      throw new UnauthorizedException('Sessão expirada');
    }

    const user = await this.usersRepository.findById(record.userId);
    if (!user) {
      throw new UnauthorizedException('Sessão expirada');
    }

    // Emite só um ACCESS novo — a sessão (refresh token) continua a mesma.
    const token = this.authTokens.issueAccessToken(user);
    return {
      ...token,
      // Ecoa o MESMO refresh token: o cliente mantém a sessão sem trocar o
      // segredo (e sem corrida). Manter o campo evita mudança no contrato.
      refreshToken: rawRefreshToken,
    };
  }
}
