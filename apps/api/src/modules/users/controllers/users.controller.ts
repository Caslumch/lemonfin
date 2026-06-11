import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  UseGuards,
  ConflictException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe';
import { UsersRepository } from '../repositories/users.repository';
import { CompleteOnboardingUseCase } from '../use-cases/complete-onboarding.use-case';
import { onboardingSchema } from '../dtos/onboarding.dto';
import type { OnboardingInput } from '../dtos/onboarding.dto';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly completeOnboarding: CompleteOnboardingUseCase,
  ) {}

  @Get('me')
  async getProfile(@CurrentUser() user: { id: string }) {
    const found = await this.usersRepository.findById(user.id);
    if (!found) return null;
    return {
      id: found.id,
      name: found.name,
      email: found.email,
      phone: found.phone,
      onboardedAt: found.onboardedAt,
    };
  }

  @Post('me/onboarding')
  async onboarding(
    @CurrentUser() user: { id: string },
    @Body(new ZodValidationPipe(onboardingSchema)) body: OnboardingInput,
  ) {
    return this.completeOnboarding.execute(user.id, body);
  }

  @Patch('me')
  async updateProfile(
    @CurrentUser() user: { id: string },
    @Body() body: { name?: string; phone?: string | null },
  ) {
    // Validate phone uniqueness if changing
    if (body.phone) {
      const existing = await this.usersRepository.findByPhone(body.phone);
      if (existing && existing.id !== user.id) {
        throw new ConflictException('Telefone ja vinculado a outra conta');
      }
    }

    return this.usersRepository.update(user.id, {
      ...(body.name !== undefined && { name: body.name }),
      ...(body.phone !== undefined && { phone: body.phone || null }),
    });
  }
}
