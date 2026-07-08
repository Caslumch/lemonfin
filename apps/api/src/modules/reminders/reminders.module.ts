import { Module } from '@nestjs/common';
import { UsersModule } from '../users/users.module';
import { FamiliesModule } from '../families/families.module';
import { RecurringModule } from '../recurring/recurring.module';
import { CardsModule } from '../cards/cards.module';
import { TransactionsModule } from '../transactions/transactions.module';
import { WhatsappModule } from '../whatsapp/whatsapp.module';
import { BillingEnforcementModule } from '../../common/billing/billing-enforcement.module';
import { ReminderSettingsRepository } from './repositories/reminder-settings.repository';
import { ReminderLogRepository } from './repositories/reminder-log.repository';
import { BillRemindersService } from './services/bill-reminders.service';
import { ReminderSettingsController } from './controllers/reminder-settings.controller';

@Module({
  imports: [
    UsersModule,
    FamiliesModule,
    RecurringModule,
    CardsModule,
    TransactionsModule,
    // WmodeClientService (envio proativo) vem do WhatsappModule → WmodeModule.
    WhatsappModule,
    BillingEnforcementModule,
  ],
  controllers: [ReminderSettingsController],
  providers: [
    ReminderSettingsRepository,
    ReminderLogRepository,
    BillRemindersService,
  ],
  // AlertsService usa as preferências (opt-out dos alertas automáticos).
  exports: [ReminderSettingsRepository],
})
export class RemindersModule {}
