import { Module } from '@nestjs/common';
import { GatewayController } from './controllers/gateway.controller';
import { ApiKeysModule } from '../api-keys/api-keys.module';
import { TransactionsModule } from '../transactions/transactions.module';
import { CardsModule } from '../cards/cards.module';
import { GoalsModule } from '../goals/goals.module';
import { ReservesModule } from '../reserves/reserves.module';
import { RecurringModule } from '../recurring/recurring.module';
import { FamiliesModule } from '../families/families.module';

// Camada 2 do gateway de IA (ver docs/plano-gateway-ia.md): expõe /v1 sobre os
// use-cases já existentes. Só CONSOME (importa) outros módulos — não provê
// nenhum use-case novo, então não introduz ciclo de DI. O ApiKeyGuard vem do
// ApiKeysModule; os use-cases/repos vêm de Transactions/Cards/Goals/Reserves/
// Recurring/Families (todos exportados p/ cá).
@Module({
  imports: [
    ApiKeysModule,
    TransactionsModule,
    CardsModule,
    GoalsModule,
    ReservesModule,
    RecurringModule,
    FamiliesModule,
  ],
  controllers: [GatewayController],
})
export class GatewayModule {}
