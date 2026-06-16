import { Module } from '@nestjs/common';
import { AdminController } from './controllers/admin.controller';
import { SuperAdminGuard } from '../../common/guards/super-admin.guard';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [UsersModule], // UsersRepository (usado pelo SuperAdminGuard)
  controllers: [AdminController],
  providers: [SuperAdminGuard],
})
export class AdminModule {}
