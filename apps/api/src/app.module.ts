import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
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
import { HealthController } from './health.controller';
import { KeepAliveService } from './keep-alive.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '../../.env',
    }),
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
  ],
  controllers: [HealthController],
  providers: [KeepAliveService],
})
export class AppModule {}
