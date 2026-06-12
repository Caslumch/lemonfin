import { Controller, Post, Body, UsePipes, Logger } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { SignUpUseCase } from '../use-cases/sign-up.use-case';
import { SignInUseCase } from '../use-cases/sign-in.use-case';
import { VerifyTwoFactorUseCase } from '../use-cases/verify-2fa.use-case';
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

// Endpoints de auth são alvo de brute-force: limite apertado (5/min por IP).
@Throttle({ default: { ttl: 60_000, limit: 5 } })
@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(
    private readonly signUpUseCase: SignUpUseCase,
    private readonly signInUseCase: SignInUseCase,
    private readonly verifyTwoFactorUseCase: VerifyTwoFactorUseCase,
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
}
