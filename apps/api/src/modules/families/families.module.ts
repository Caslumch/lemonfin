import { Module } from '@nestjs/common';
import { FamiliesController } from './controllers/families.controller';
import { FamiliesRepository } from './repositories/families.repository';
import { FamilyContextService } from './services/family-context.service';
import { CreateFamilyUseCase } from './use-cases/create-family.use-case';
import { GetMyFamilyUseCase } from './use-cases/get-my-family.use-case';
import { JoinFamilyUseCase } from './use-cases/join-family.use-case';
import { LeaveFamilyUseCase } from './use-cases/leave-family.use-case';
import { UsersModule } from '../users/users.module';
import { MailModule } from '../mail/mail.module';
import { WmodeModule } from '../whatsapp/wmode.module';

@Module({
  imports: [UsersModule, MailModule, WmodeModule],
  controllers: [FamiliesController],
  providers: [
    FamiliesRepository,
    FamilyContextService,
    CreateFamilyUseCase,
    GetMyFamilyUseCase,
    JoinFamilyUseCase,
    LeaveFamilyUseCase,
  ],
  exports: [FamiliesRepository, FamilyContextService],
})
export class FamiliesModule {}
