import { Module } from '@nestjs/common';
import { AdminController } from './controllers/admin.controller';
import { AdminMetricsRepository } from './repositories/admin-metrics.repository';
import { AdminUsersRepository } from './repositories/admin-users.repository';
import { AdminTrendsRepository } from './repositories/admin-trends.repository';
import { AdminUserActionsUseCase } from './use-cases/admin-user-actions.use-case';
import { SuperAdminGuard } from '../../common/guards/super-admin.guard';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [UsersModule], // UsersRepository (usado pelo SuperAdminGuard)
  controllers: [AdminController],
  providers: [
    SuperAdminGuard,
    AdminMetricsRepository,
    AdminUsersRepository,
    AdminTrendsRepository,
    AdminUserActionsUseCase,
  ],
})
export class AdminModule {}
