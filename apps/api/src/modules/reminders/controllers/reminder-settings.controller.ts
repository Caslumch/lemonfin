import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { PremiumGuard } from '../../../common/billing/premium.guard';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe';
import { ReminderSettingsRepository } from '../repositories/reminder-settings.repository';
import { updateReminderSettingsSchema } from '../dtos/reminder-settings.dto';
import type { UpdateReminderSettingsInput } from '../dtos/reminder-settings.dto';

// Preferências de lembretes/alertas proativos. Área premium (decisão de
// produto do plano de lembretes), como budgets/goals.
@Controller('reminders/settings')
@UseGuards(JwtAuthGuard, PremiumGuard)
export class ReminderSettingsController {
  constructor(private readonly settings: ReminderSettingsRepository) {}

  @Get()
  get(@CurrentUser() user: { id: string }) {
    return this.settings.getEffective(user.id);
  }

  @Put()
  update(
    @CurrentUser() user: { id: string },
    @Body(new ZodValidationPipe(updateReminderSettingsSchema))
    body: UpdateReminderSettingsInput,
  ) {
    return this.settings.upsert(user.id, body);
  }
}
