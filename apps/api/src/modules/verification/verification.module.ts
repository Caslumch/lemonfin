import { Module } from '@nestjs/common';
import { VerificationCodeRepository } from './repositories/verification-code.repository';
import { VerificationService } from './services/verification.service';

@Module({
  providers: [VerificationCodeRepository, VerificationService],
  exports: [VerificationService],
})
export class VerificationModule {}
