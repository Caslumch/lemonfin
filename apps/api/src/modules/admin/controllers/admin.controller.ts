import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { SuperAdminGuard } from '../../../common/guards/super-admin.guard';
import { SkipPremium } from '../../../common/billing/skip-premium.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { AdminMetricsRepository } from '../repositories/admin-metrics.repository';

// Área do super-admin da plataforma. JwtAuthGuard popula req.user; o
// SuperAdminGuard (depois) exige isSuperAdmin. @SkipPremium: admin não é
// feature premium — nunca deve ser barrado pelo paywall.
@SkipPremium()
@UseGuards(JwtAuthGuard, SuperAdminGuard)
@Controller('admin')
export class AdminController {
  constructor(private readonly metrics: AdminMetricsRepository) {}

  // Confirma o acesso de admin (o front usa para liberar a área /admin).
  @Get('me')
  me(@CurrentUser() user: { id: string }) {
    return { id: user.id, isSuperAdmin: true };
  }

  // Métricas agregadas: usuários, assinaturas (MRR estimado) e atividade.
  @Get('metrics')
  getMetrics() {
    return this.metrics.getMetrics();
  }
}
