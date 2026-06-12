import { Controller, Post, Body, UsePipes, Logger } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { SignUpUseCase } from '../use-cases/sign-up.use-case';
import { SignInUseCase } from '../use-cases/sign-in.use-case';
import { VerifyTwoFactorUseCase } from '../use-cases/verify-2fa.use-case';
import { SendEmailVerificationUseCase } from '../use-cases/send-email-verification.use-case';
import { VerifyEmailUseCase } from '../use-cases/verify-email.use-case';
import { RequestPasswordResetUseCase } from '../use-cases/request-password-reset.use-case';
import { ResetPasswordUseCase } from '../use-cases/reset-password.use-case';
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe';
import { z } from 'zod';

const signUpSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  phone: z
    .string()
    .regex(/^\d{10,15}$/)
    .optional(),
});

const signInSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const verifyTwoFactorSchema = z.object({
  tempToken: z.string().min(1),
  code: z.string().min(1),
});

const emailOnlySchema = z.object({
  email: z.string().email(),
});

// OTP de 6 dígitos numéricos (ver VerificationService).
const otpCode = z.string().regex(/^\d{6}$/, 'Código deve ter 6 dígitos');

const verifyEmailSchema = z.object({
  email: z.string().email(),
  code: otpCode,
});

const resetPasswordSchema = z.object({
  email: z.string().email(),
  code: otpCode,
  newPassword: z.string().min(8),
});

// Endpoints de auth são alvo de brute-force: limite apertado (5/min por IP).
@Throttle({ default: { ttl: 60_000, limit: 5 } })
@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(
    private readonly signUpUseCase: SignUpUseCase,
    private readonly signInUseCase: SignInUseCase,
    private readonly verifyTwoFactorUseCase: VerifyTwoFactorUseCase,
    private readonly sendEmailVerificationUseCase: SendEmailVerificationUseCase,
    private readonly verifyEmailUseCase: VerifyEmailUseCase,
    private readonly requestPasswordResetUseCase: RequestPasswordResetUseCase,
    private readonly resetPasswordUseCase: ResetPasswordUseCase,
  ) {}

  @Post('sign-up')
  @UsePipes(new ZodValidationPipe(signUpSchema))
  signUp(
    @Body()
    body: {
      name: string;
      email: string;
      password: string;
      phone?: string;
    },
  ) {
    this.logger.log(`Sign-up attempt [email:${body.email}]`);
    return this.signUpUseCase.execute(body);
  }

  @Post('sign-in')
  @UsePipes(new ZodValidationPipe(signInSchema))
  signIn(@Body() body: { email: string; password: string }) {
    this.logger.log(`Sign-in attempt [email:${body.email}]`);
    return this.signInUseCase.execute(body);
  }

  @Post('verify-2fa')
  @UsePipes(new ZodValidationPipe(verifyTwoFactorSchema))
  verifyTwoFactor(@Body() body: { tempToken: string; code: string }) {
    this.logger.log('2FA verification attempt');
    return this.verifyTwoFactorUseCase.execute(body);
  }

  // Reenvia o OTP de confirmação de email (o primeiro já sai no sign-up).
  @Post('send-email-verification')
  @UsePipes(new ZodValidationPipe(emailOnlySchema))
  sendEmailVerification(@Body() body: { email: string }) {
    this.logger.log(`Email verification requested [email:${body.email}]`);
    return this.sendEmailVerificationUseCase.execute(body.email);
  }

  @Post('verify-email')
  @UsePipes(new ZodValidationPipe(verifyEmailSchema))
  verifyEmail(@Body() body: { email: string; code: string }) {
    this.logger.log(`Email verification attempt [email:${body.email}]`);
    return this.verifyEmailUseCase.execute(body.email, body.code);
  }

  @Post('forgot-password')
  @UsePipes(new ZodValidationPipe(emailOnlySchema))
  forgotPassword(@Body() body: { email: string }) {
    this.logger.log(`Password reset requested [email:${body.email}]`);
    return this.requestPasswordResetUseCase.execute(body.email);
  }

  @Post('reset-password')
  @UsePipes(new ZodValidationPipe(resetPasswordSchema))
  resetPassword(
    @Body() body: { email: string; code: string; newPassword: string },
  ) {
    this.logger.log(`Password reset attempt [email:${body.email}]`);
    return this.resetPasswordUseCase.execute(
      body.email,
      body.code,
      body.newPassword,
    );
  }
}
