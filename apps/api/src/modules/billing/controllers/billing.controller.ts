import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe';
import { createCheckoutSchema } from '../dtos/billing.dto';
import type { CreateCheckoutInput } from '../dtos/billing.dto';
import { CreateCheckoutSessionUseCase } from '../use-cases/create-checkout-session.use-case';
import { CreatePortalSessionUseCase } from '../use-cases/create-portal-session.use-case';
import { GetSubscriptionStatusUseCase } from '../use-cases/get-subscription-status.use-case';

@Controller('billing')
@UseGuards(JwtAuthGuard)
export class BillingController {
  constructor(
    private readonly createCheckout: CreateCheckoutSessionUseCase,
    private readonly createPortal: CreatePortalSessionUseCase,
    private readonly getStatus: GetSubscriptionStatusUseCase,
  ) {}

  @Get('status')
  async status(@CurrentUser() user: { id: string }) {
    return this.getStatus.execute(user.id);
  }

  @Post('checkout')
  async checkout(
    @CurrentUser() user: { id: string },
    @Body(new ZodValidationPipe(createCheckoutSchema))
    body: CreateCheckoutInput,
  ) {
    return this.createCheckout.execute(user.id, body.cycle);
  }

  @Post('portal')
  async portal(@CurrentUser() user: { id: string }) {
    return this.createPortal.execute(user.id);
  }
}
