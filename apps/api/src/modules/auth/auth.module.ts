import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthController } from './controllers/auth.controller';
import { SignUpUseCase } from './use-cases/sign-up.use-case';
import { SignInUseCase } from './use-cases/sign-in.use-case';
import { VerifyTwoFactorUseCase } from './use-cases/verify-2fa.use-case';
import { SendEmailVerificationUseCase } from './use-cases/send-email-verification.use-case';
import { VerifyEmailUseCase } from './use-cases/verify-email.use-case';
import { RequestPasswordResetUseCase } from './use-cases/request-password-reset.use-case';
import { ResetPasswordUseCase } from './use-cases/reset-password.use-case';
import { RefreshSessionUseCase } from './use-cases/refresh-session.use-case';
import { LogoutUseCase } from './use-cases/logout.use-case';
import { RefreshTokensRepository } from './repositories/refresh-tokens.repository';
import { AuthTokensService } from './services/auth-tokens.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { UsersModule } from '../users/users.module';
import { WhatsappModule } from '../whatsapp/whatsapp.module';
import { MailModule } from '../mail/mail.module';
import { VerificationModule } from '../verification/verification.module';

@Module({
  imports: [
    UsersModule,
    WhatsappModule,
    MailModule,
    VerificationModule,
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        // getOrThrow: assinatura e verificação compartilham o MESMO segredo
        // obrigatório. Sem ele, o boot falha (em vez de assinar com undefined).
        secret: configService.getOrThrow<string>('JWT_SECRET'),
        // Access curto: com refresh + rotação (ver AuthTokensService), 15min
        // limita a janela de um token vazado. Manter em sincronia com
        // ACCESS_TTL_MS do auth-tokens.service.
        signOptions: { expiresIn: '15m' },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    SignUpUseCase,
    SignInUseCase,
    VerifyTwoFactorUseCase,
    SendEmailVerificationUseCase,
    VerifyEmailUseCase,
    RequestPasswordResetUseCase,
    ResetPasswordUseCase,
    RefreshSessionUseCase,
    LogoutUseCase,
    RefreshTokensRepository,
    AuthTokensService,
    JwtStrategy,
  ],
})
export class AuthModule {}
