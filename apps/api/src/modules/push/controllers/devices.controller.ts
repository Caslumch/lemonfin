import {
  Body,
  Controller,
  Delete,
  HttpCode,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe';
import {
  registerDeviceSchema,
  unregisterDeviceSchema,
  type RegisterDeviceInput,
  type UnregisterDeviceInput,
} from '../dtos/device.dto';
import { PushTokenRepository } from '../repositories/push-token.repository';

// Registro de device para push notifications. NÃO é premium — qualquer usuário
// autenticado registra o token (o gate premium fica no ENVIO dos lembretes).
@Controller('devices')
@UseGuards(JwtAuthGuard)
export class DevicesController {
  constructor(private readonly tokens: PushTokenRepository) {}

  @Post()
  @HttpCode(204)
  async register(
    @CurrentUser() user: { id: string },
    @Body(new ZodValidationPipe(registerDeviceSchema))
    body: RegisterDeviceInput,
  ): Promise<void> {
    await this.tokens.register(user.id, body.token, body.platform);
  }

  @Delete()
  @HttpCode(204)
  async unregister(
    @Body(new ZodValidationPipe(unregisterDeviceSchema))
    body: UnregisterDeviceInput,
  ): Promise<void> {
    await this.tokens.unregister(body.token);
  }
}
