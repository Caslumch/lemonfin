import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiKeysRepository } from '../repositories/api-keys.repository';

// Autenticação de MÁQUINA para o gateway (/v1) e o MCP. Aceita a chave em
// `Authorization: Bearer lmn_...` ou no header `X-API-Key`. Resolve a key para
// o dono e popula `request.user = { id }` — o MESMO contrato do JwtAuthGuard,
// então os controllers e o decorator @CurrentUser funcionam sem mudança.
//
// NÃO substitui o PremiumGuard: rotas protegidas por este guard continuam
// passando pelo PremiumGuard, então a key herda o status premium do dono (uma
// key de conta em trial expirado é barrada igual ao browser).
@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(private readonly apiKeys: ApiKeysRepository) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const raw = this.extractKey(request);
    if (!raw) {
      throw new UnauthorizedException('Chave de API ausente.');
    }

    const key = await this.apiKeys.findActiveByKey(raw);
    if (!key) {
      throw new UnauthorizedException('Chave de API inválida ou revogada.');
    }

    // Contrato idêntico ao do JwtStrategy: os controllers só leem request.user.id.
    request.user = { id: key.userId };
    // Expõe os escopos para um futuro guard de escopo (read-only vs read-write).
    request.apiKey = { id: key.id, scopes: key.scopes };

    // Best-effort, com throttle interno — não bloqueia a request.
    void this.apiKeys.touchLastUsed(key.id, key.lastUsedAt);

    return true;
  }

  private extractKey(request: {
    headers: Record<string, string | string[] | undefined>;
  }): string | null {
    const auth = request.headers['authorization'];
    if (typeof auth === 'string' && auth.startsWith('Bearer ')) {
      const token = auth.slice('Bearer '.length).trim();
      if (token.startsWith('lmn_')) return token;
    }
    const apiKeyHeader = request.headers['x-api-key'];
    if (typeof apiKeyHeader === 'string' && apiKeyHeader.trim()) {
      return apiKeyHeader.trim();
    }
    return null;
  }
}
