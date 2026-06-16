import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PremiumAccessService } from '../../modules/billing/services/premium-access.service';
import { BillingConfigService } from './billing-config.service';
import { SKIP_PREMIUM_KEY } from './skip-premium.decorator';

/**
 * Paywall hard (web/API). Quando o enforcement está ligado, bloqueia qualquer
 * rota não isenta para usuários sem acesso premium efetivo (considerando a
 * cobertura por família). Responde 402 para o front distinguir "precisa
 * assinar" de erro comum e redirecionar para /assinar.
 *
 * Aplicado globalmente (APP_GUARD). É um no-op quando:
 * - o enforcement está desligado (default);
 * - a rota/controller tem @SkipPremium();
 * - não há usuário autenticado no request (rotas públicas/login — o JwtAuthGuard
 *   cuida da proteção delas; aqui não é nosso papel barrar por billing);
 * - é uma leitura (GET/HEAD): bloqueamos ESCRITA e uso de IA, não leitura. A UI
 *   já esconde tudo via redirect para /assinar; barrar GET no servidor só
 *   adicionaria latência e risco de lockout. Quem precisa bloquear leitura
 *   específica usa @RequirePremium() (não usado hoje).
 */
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
@Injectable()
export class PremiumGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly access: PremiumAccessService,
    private readonly billingConfig: BillingConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (!this.billingConfig.enforcementEnabled) return true;

    const skip = this.reflector.getAllAndOverride<boolean>(SKIP_PREMIUM_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (skip) return true;

    const req = context.switchToHttp().getRequest<{
      user?: { id: string };
      method?: string;
    }>();

    // Bloqueia só escrita/uso (mutações). Leitura passa.
    if (req.method && SAFE_METHODS.has(req.method)) return true;

    const userId = req.user?.id;
    // Sem usuário no request: não é uma rota autenticada de domínio — deixa
    // passar (o JwtAuthGuard é quem barra acesso não autenticado).
    if (!userId) return true;

    const hasAccess = await this.access.hasAccess(userId);
    if (hasAccess) return true;

    throw new HttpException(
      {
        statusCode: HttpStatus.PAYMENT_REQUIRED,
        error: 'Payment Required',
        code: 'SUBSCRIPTION_REQUIRED',
        message: 'Seu acesso expirou. Assine para continuar usando o LemonFin.',
      },
      HttpStatus.PAYMENT_REQUIRED,
    );
  }
}
