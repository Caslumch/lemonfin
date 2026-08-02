import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { SuperAdminGuard } from '../../../common/guards/super-admin.guard';
import { SkipPremium } from '../../../common/billing/skip-premium.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe';
import { AdminMetricsRepository } from '../repositories/admin-metrics.repository';
import { AdminUsersRepository } from '../repositories/admin-users.repository';
import { AdminTrendsRepository } from '../repositories/admin-trends.repository';
import { AdminUserActionsUseCase } from '../use-cases/admin-user-actions.use-case';
import {
  extendTrialSchema,
  grantPremiumSchema,
  setTtsSettingsSchema,
  type ExtendTrialInput,
  type GrantPremiumInput,
  type SetTtsSettingsInput,
} from '../dtos/admin.dto';

// Área do super-admin da plataforma. JwtAuthGuard popula req.user; o
// SuperAdminGuard (depois) exige isSuperAdmin. @SkipPremium: admin não é
// feature premium — nunca deve ser barrado pelo paywall.
@SkipPremium()
@UseGuards(JwtAuthGuard, SuperAdminGuard)
@Controller('admin')
export class AdminController {
  constructor(
    private readonly metrics: AdminMetricsRepository,
    private readonly users: AdminUsersRepository,
    private readonly trends: AdminTrendsRepository,
    private readonly actions: AdminUserActionsUseCase,
  ) {}

  // Confirma o acesso de admin (o front usa para liberar a área /admin).
  @Get('me')
  me(@CurrentUser() user: { id: string }) {
    return { id: user.id, isSuperAdmin: true };
  }

  // Métricas agregadas: usuários, assinaturas (MRR estimado), atividade, IA.
  @Get('metrics')
  getMetrics() {
    return this.metrics.getMetrics();
  }

  // Lista paginada de usuários (busca por nome/email).
  @Get('users')
  listUsers(@Query('search') search?: string, @Query('page') page?: string) {
    return this.users.list({
      search: search?.trim() || undefined,
      page: page ? Number(page) : 1,
    });
  }

  // Top consumidores de IA por custo (últimos 30 dias).
  @Get('ai-cost/top')
  topAiSpenders() {
    return this.users.topAiSpenders(30, 10);
  }

  // Séries diárias para gráficos (últimos 30 dias).
  @Get('trends')
  getTrends() {
    return this.trends.getTrends(30);
  }

  // --- Ações sobre usuário (escrita) ---

  @Post('users/:id/extend-trial')
  async extendTrial(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(extendTrialSchema)) body: ExtendTrialInput,
  ) {
    await this.actions.extendTrial(id, body.days);
    return { ok: true };
  }

  @Post('users/:id/grant-premium')
  async grantPremium(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(grantPremiumSchema)) body: GrantPremiumInput,
  ) {
    await this.actions.grantPremium(id, body.days);
    return { ok: true };
  }

  @Post('users/:id/revoke-premium')
  async revokePremium(@Param('id') id: string) {
    await this.actions.revokePremium(id);
    return { ok: true };
  }

  // Configuração de voz (TTS) da conta: habilitar + voz + rate/pitch/volume.
  @Post('users/:id/tts')
  async setTts(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(setTtsSettingsSchema)) body: SetTtsSettingsInput,
  ) {
    await this.actions.setTtsSettings(id, body);
    return { ok: true };
  }
}
