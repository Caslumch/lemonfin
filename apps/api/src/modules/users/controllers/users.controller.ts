import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  UseGuards,
  ConflictException,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { hasPremiumAccess } from '../../../common/billing/premium-access';
import { SkipPremium } from '../../../common/billing/skip-premium.decorator';
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe';
import { UsersRepository } from '../repositories/users.repository';
import { CompleteOnboardingUseCase } from '../use-cases/complete-onboarding.use-case';
import { ChangePasswordUseCase } from '../use-cases/change-password.use-case';
import { SetupTwoFactorUseCase } from '../use-cases/setup-2fa.use-case';
import { EnableTwoFactorUseCase } from '../use-cases/enable-2fa.use-case';
import { DisableTwoFactorUseCase } from '../use-cases/disable-2fa.use-case';
import { DeleteAccountUseCase } from '../use-cases/delete-account.use-case';
import { ExportUserDataUseCase } from '../use-cases/export-user-data.use-case';
import { onboardingSchema } from '../dtos/onboarding.dto';
import type { OnboardingInput } from '../dtos/onboarding.dto';
import { changePasswordSchema } from '../dtos/change-password.dto';
import type { ChangePasswordInput } from '../dtos/change-password.dto';
import {
  enableTwoFactorSchema,
  disableTwoFactorSchema,
} from '../dtos/two-factor.dto';
import type {
  EnableTwoFactorInput,
  DisableTwoFactorInput,
} from '../dtos/two-factor.dto';
import { deleteAccountSchema } from '../dtos/delete-account.dto';
import type { DeleteAccountInput } from '../dtos/delete-account.dto';

// Gestão de conta (perfil, senha, 2FA, onboarding) continua acessível mesmo
// sem assinatura — não são features premium e o usuário pode precisar delas.
@SkipPremium()
@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly completeOnboarding: CompleteOnboardingUseCase,
    private readonly changePassword: ChangePasswordUseCase,
    private readonly setupTwoFactor: SetupTwoFactorUseCase,
    private readonly enableTwoFactor: EnableTwoFactorUseCase,
    private readonly disableTwoFactor: DisableTwoFactorUseCase,
    private readonly deleteAccount: DeleteAccountUseCase,
    private readonly exportUserData: ExportUserDataUseCase,
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
      emailVerifiedAt: found.emailVerifiedAt,
      trialEndsAt: found.trialEndsAt,
      twoFactorEnabled: found.twoFactorEnabled,
      isSuperAdmin: found.isSuperAdmin,
      subscriptionStatus: found.subscriptionStatus,
      currentPeriodEnd: found.currentPeriodEnd,
      // Acesso efetivo já derivado (self). A cobertura por família entra num
      // PR posterior — o front NÃO recalcula a regra, lê este booleano.
      hasPremium: hasPremiumAccess(found),
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

  @Post('me/change-password')
  async changePasswordHandler(
    @CurrentUser() user: { id: string },
    @Body(new ZodValidationPipe(changePasswordSchema))
    body: ChangePasswordInput,
  ) {
    return this.changePassword.execute(user.id, body);
  }

  // Exportação dos dados do titular (LGPD — portabilidade). Consulta pesada:
  // throttle apertado para não virar vetor de carga.
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  @Get('me/export')
  async exportDataHandler(@CurrentUser() user: { id: string }) {
    return this.exportUserData.execute(user.id);
  }

  // Exclusão de conta (LGPD). Re-autentica por senha e apaga tudo.
  @Post('me/delete')
  async deleteAccountHandler(
    @CurrentUser() user: { id: string },
    @Body(new ZodValidationPipe(deleteAccountSchema)) body: DeleteAccountInput,
  ) {
    return this.deleteAccount.execute(user.id, body.password);
  }

  @Post('me/2fa/setup')
  async setup2fa(@CurrentUser() user: { id: string }) {
    return this.setupTwoFactor.execute(user.id);
  }

  @Post('me/2fa/enable')
  async enable2fa(
    @CurrentUser() user: { id: string },
    @Body(new ZodValidationPipe(enableTwoFactorSchema))
    body: EnableTwoFactorInput,
  ) {
    return this.enableTwoFactor.execute(user.id, body);
  }

  @Delete('me/2fa')
  async disable2fa(
    @CurrentUser() user: { id: string },
    @Body(new ZodValidationPipe(disableTwoFactorSchema))
    body: DisableTwoFactorInput,
  ) {
    return this.disableTwoFactor.execute(user.id, body);
  }
}
