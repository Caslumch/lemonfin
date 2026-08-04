import { Module } from '@nestjs/common';
import { APP_GUARD, APP_INTERCEPTOR, APP_FILTER } from '@nestjs/core';
import { SentryModule, SentryGlobalFilter } from '@sentry/nestjs/setup';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { CacheModule } from '@nestjs/cache-manager';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { CategoriesModule } from './modules/categories/categories.module';
import { TransactionsModule } from './modules/transactions/transactions.module';
import { CardsModule } from './modules/cards/cards.module';
import { FamiliesModule } from './modules/families/families.module';
import { WhatsappModule } from './modules/whatsapp/whatsapp.module';
import { ChatModule } from './modules/chat/chat.module';
import { AlertsModule } from './modules/alerts/alerts.module';
import { RemindersModule } from './modules/reminders/reminders.module';
import { GoalsModule } from './modules/goals/goals.module';
import { ReservesModule } from './modules/reserves/reserves.module';
import { RecurringModule } from './modules/recurring/recurring.module';
import { BudgetsModule } from './modules/budgets/budgets.module';
import { BillingModule } from './modules/billing/billing.module';
import { AdminModule } from './modules/admin/admin.module';
import { ApiKeysModule } from './modules/api-keys/api-keys.module';
import { GatewayModule } from './modules/gateway/gateway.module';
import { HealthController } from './health.controller';
import { KeepAliveService } from './keep-alive.service';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';

@Module({
  imports: [
    // Sentry: integra o SDK ao ciclo do Nest. No-op se SENTRY_DSN ausente
    // (o init em instrument.ts não roda sem DSN).
    SentryModule.forRoot(),
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '../../.env',
    }),
    // Rate limit global: 100 req/min por IP. Endpoints sensíveis (auth, chat,
    // webhook) sobrescrevem com @Throttle no próprio controller.
    ThrottlerModule.forRoot([{ name: 'default', ttl: 60_000, limit: 100 }]),
    // Cache em memória (sem infra extra). Hoje só categorias usam, mas fica
    // global para reuso futuro. Migra para Redis no Nível 2 sem mudar os usos.
    CacheModule.register({ isGlobal: true, ttl: 60_000 }),
    ScheduleModule.forRoot(),
    PrismaModule,
    AuthModule,
    ApiKeysModule,
    GatewayModule,
    UsersModule,
    CategoriesModule,
    TransactionsModule,
    CardsModule,
    FamiliesModule,
    WhatsappModule,
    ChatModule,
    AlertsModule,
    RemindersModule,
    GoalsModule,
    ReservesModule,
    RecurringModule,
    BudgetsModule,
    BillingModule,
    AdminModule,
  ],
  controllers: [HealthController],
  providers: [
    // Captura exceções não tratadas e envia ao Sentry (no-op sem DSN). Vem
    // primeiro para interceptar antes de qualquer outro filtro.
    { provide: APP_FILTER, useClass: SentryGlobalFilter },
    { provide: APP_INTERCEPTOR, useClass: LoggingInterceptor },
    // Aplica o rate limit em todas as rotas (respeitando os overrides locais).
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    KeepAliveService,
  ],
})
export class AppModule {}
