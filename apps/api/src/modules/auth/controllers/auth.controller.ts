import { Controller, Post, Body, UsePipes, Logger } from '@nestjs/common';
import { SignUpUseCase } from '../use-cases/sign-up.use-case';
import { SignInUseCase } from '../use-cases/sign-in.use-case';
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe';
import { z } from 'zod';

const signUpSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  phone: z
    .string()
    .regex(/^\d{10,11}$/)
    .optional(),
});

const signInSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(
    private readonly signUpUseCase: SignUpUseCase,
    private readonly signInUseCase: SignInUseCase,
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
}
