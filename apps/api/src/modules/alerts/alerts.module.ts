import { Module } from '@nestjs/common';
import { AlertsService } from './alerts.service';
import { TransactionsModule } from '../transactions/transactions.module';
import { UsersModule } from '../users/users.module';
import { WhatsappModule } from '../whatsapp/whatsapp.module';
import { FamiliesModule } from '../families/families.module';
import { GoalsModule } from '../goals/goals.module';
import { ReservesModule } from '../reserves/reserves.module';
import { RecurringModule } from '../recurring/recurring.module';
import { RemindersModule } from '../reminders/reminders.module';
import { BillingEnforcementModule } from '../../common/billing/billing-enforcement.module';

@Module({
  imports: [
    TransactionsModule,
    UsersModule,
    WhatsappModule,
    FamiliesModule,
    GoalsModule,
    // Check-in mensal das reservas.
    ReservesModule,
    RecurringModule,
    // Gate premium + opt-out dos alertas automáticos.
    BillingEnforcementModule,
    RemindersModule,
  ],
  providers: [AlertsService],
})
export class AlertsModule {}
