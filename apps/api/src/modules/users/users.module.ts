import { Module } from '@nestjs/common';
import { UsersRepository } from './repositories/users.repository';
import { UsersController } from './controllers/users.controller';
import { CompleteOnboardingUseCase } from './use-cases/complete-onboarding.use-case';
import { ChangePasswordUseCase } from './use-cases/change-password.use-case';
import { SetupTwoFactorUseCase } from './use-cases/setup-2fa.use-case';
import { EnableTwoFactorUseCase } from './use-cases/enable-2fa.use-case';
import { DisableTwoFactorUseCase } from './use-cases/disable-2fa.use-case';
import { DeleteAccountUseCase } from './use-cases/delete-account.use-case';
import { ExportUserDataUseCase } from './use-cases/export-user-data.use-case';
import { RecurringModule } from '../recurring/recurring.module';
import { BudgetsModule } from '../budgets/budgets.module';
import { CategoriesModule } from '../categories/categories.module';
// Só o cliente de envio (WmodeModule é enxuto justamente para isso) — importar
// o WhatsappModule inteiro criaria ciclo (ele importa UsersModule).
import { WmodeModule } from '../whatsapp/wmode.module';

@Module({
  imports: [RecurringModule, BudgetsModule, CategoriesModule, WmodeModule],
  controllers: [UsersController],
  providers: [
    UsersRepository,
    CompleteOnboardingUseCase,
    ChangePasswordUseCase,
    SetupTwoFactorUseCase,
    EnableTwoFactorUseCase,
    DisableTwoFactorUseCase,
    DeleteAccountUseCase,
    ExportUserDataUseCase,
  ],
  exports: [UsersRepository],
})
export class UsersModule {}
