import { Module } from '@nestjs/common';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
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
import { GoalsModule } from './modules/goals/goals.module';
import { RecurringModule } from './modules/recurring/recurring.module';
import { BudgetsModule } from './modules/budgets/budgets.module';
import { HealthController } from './health.controller';
import { KeepAliveService } from './keep-alive.service';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';

@Module({
  imports: [
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
    UsersModule,
    CategoriesModule,
    TransactionsModule,
    CardsModule,
    FamiliesModule,
    WhatsappModule,
    ChatModule,
    AlertsModule,
    GoalsModule,
    RecurringModule,
    BudgetsModule,
  ],
  controllers: [HealthController],
  providers: [
    { provide: APP_INTERCEPTOR, useClass: LoggingInterceptor },
    // Aplica o rate limit em todas as rotas (respeitando os overrides locais).
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    KeepAliveService,
  ],
})
export class AppModule {}
