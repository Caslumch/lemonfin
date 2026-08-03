import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe';
import { ApiKeysService } from '../services/api-keys.service';
import { createApiKeySchema } from '../dtos/api-key.dto';
import type { CreateApiKeyInput } from '../dtos/api-key.dto';

// Gestão das chaves de API pelo DONO da conta. Protegido por JWT (sessão de
// browser) — o próprio painel — NÃO pela ApiKey. Uma key não gerencia outras
// keys: isso evita que uma chave vazada crie/derrube keys.
@Controller('api-keys')
@UseGuards(JwtAuthGuard)
export class ApiKeysController {
  constructor(private readonly apiKeys: ApiKeysService) {}

  // Retorna a chave CRUA em `key` — única vez que ela existe. O front deve
  // deixar claro "copie agora, não será mostrada de novo".
  @Post()
  create(
    @CurrentUser() user: { id: string },
    @Body(new ZodValidationPipe(createApiKeySchema)) body: CreateApiKeyInput,
  ) {
    return this.apiKeys.create(user.id, body);
  }

  @Get()
  list(@CurrentUser() user: { id: string }) {
    return this.apiKeys.list(user.id);
  }

  @Delete(':id')
  revoke(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.apiKeys.revoke(id, user.id);
  }
}
