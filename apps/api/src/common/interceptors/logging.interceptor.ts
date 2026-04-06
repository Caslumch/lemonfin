import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import type { Request, Response } from 'express';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest<Request>();
    const { method, originalUrl } = req;
    const userId = (req as any).user?.id;
    const now = Date.now();

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
}
