import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
  Inject,
} from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { Observable, tap } from 'rxjs';
import * as Sentry from '@sentry/nestjs';
import type { Request, Response } from 'express';
import { PrismaService } from '../../prisma/prisma.service';

// "Último acesso": atualiza User.lastSeenAt no máx 1x a cada 15min por usuário
// (throttle via cache), para não escrever no banco a cada request.
const LAST_SEEN_THROTTLE_MS = 15 * 60 * 1000;
const lastSeenKey = (id: string) => `lastSeen:${id}`;

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  constructor(
    private readonly prisma: PrismaService,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest<Request>();
    const { method, originalUrl } = req;
    const user = (req as { user?: { id?: string; email?: string } }).user;
    const userId = user?.id;
    const now = Date.now();

    // Anexa o usuário ao escopo do Sentry para correlacionar erros (no-op sem
    // DSN). id + email — decisão de produto (facilita identificar afetados).
    if (userId) {
      Sentry.setUser({ id: userId, email: user?.email });
      void this.touchLastSeen(userId);
    }

    const userInfo = userId ? ` [user:${userId}]` : '';
    this.logger.log(`→ ${method} ${originalUrl}${userInfo}`);

    return next.handle().pipe(
      tap({
        next: () => {
          const res = context.switchToHttp().getResponse<Response>();
          const duration = Date.now() - now;
          this.logger.log(
            `← ${method} ${originalUrl} ${res.statusCode} ${duration}ms${userInfo}`,
          );
        },
        error: (error) => {
          const duration = Date.now() - now;
          const status = error.status || 500;
          this.logger.error(
            `← ${method} ${originalUrl} ${status} ${duration}ms${userInfo} - ${error.message}`,
          );
        },
      }),
    );
  }

  /**
   * Atualiza lastSeenAt com throttle de 15min (marca no cache). Fire-and-forget:
   * não atrasa a resposta e nunca derruba o request se a gravação falhar.
   */
  private async touchLastSeen(userId: string): Promise<void> {
    try {
      const key = lastSeenKey(userId);
      if (await this.cache.get(key)) return; // visto há <15min
      await this.cache.set(key, true, LAST_SEEN_THROTTLE_MS);
      await this.prisma.user.update({
        where: { id: userId },
        data: { lastSeenAt: new Date() },
      });
    } catch {
      // silencioso de propósito — métrica best-effort
    }
  }
}
