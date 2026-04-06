import { Module } from '@nestjs/common';
import { AlertsService } from './alerts.service';
import { TransactionsModule } from '../transactions/transactions.module';
import { UsersModule } from '../users/users.module';
import { WhatsappModule } from '../whatsapp/whatsapp.module';
import { FamiliesModule } from '../families/families.module';
import { GoalsModule } from '../goals/goals.module';

@Module({
  imports: [TransactionsModule, UsersModule, WhatsappModule, FamiliesModule, GoalsModule],
  providers: [AlertsService],
})
export class AlertsModule {}
