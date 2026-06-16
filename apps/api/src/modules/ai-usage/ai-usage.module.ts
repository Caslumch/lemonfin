import { Module } from '@nestjs/common';
import { AiUsageService } from './ai-usage.service';

// Serviço de rastreamento de consumo de IA, reusado pelo chat e pelo parser do
// WhatsApp. PrismaService é global, então não precisa importar PrismaModule.
@Module({
  providers: [AiUsageService],
  exports: [AiUsageService],
})
export class AiUsageModule {}
