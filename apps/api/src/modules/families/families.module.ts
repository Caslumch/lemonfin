import { Module } from '@nestjs/common';
import { FamiliesController } from './controllers/families.controller';
import { FamiliesRepository } from './repositories/families.repository';
import { FamilyContextService } from './services/family-context.service';
import { CreateFamilyUseCase } from './use-cases/create-family.use-case';
import { GetMyFamilyUseCase } from './use-cases/get-my-family.use-case';
import { JoinFamilyUseCase } from './use-cases/join-family.use-case';
import { LeaveFamilyUseCase } from './use-cases/leave-family.use-case';

@Module({
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
